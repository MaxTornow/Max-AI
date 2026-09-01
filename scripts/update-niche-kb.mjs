#!/usr/bin/env node

/**
 * Niche Assessment KB Updater
 *
 * Parses a Notion export (a folder of .md and/or .html files, or a single
 * such file) for Nina's niche-assessment knowledge base, chunks by heading
 * section, generates OpenAI embeddings, and upserts to the same Supabase
 * `documents` table used by scripts/update-transcripts.mjs.
 *
 * Tagged via metadata.course — only rows with that tag are replaced,
 * leaving VGA (and any other source's) rows untouched.
 *
 * Usage:
 *   node scripts/update-niche-kb.mjs path/to/notion-export-folder
 *   node scripts/update-niche-kb.mjs --course "NICHE_ASSESSMENT" path/to/notion-export-folder
 *   node scripts/update-niche-kb.mjs --dry-run path/to/notion-export-folder
 *
 * Input:
 *   A directory (searched recursively) of .md and/or .html files exported
 *   from Notion (page/workspace "••• > Export", with subpages included),
 *   or a single such file. Both export formats are supported:
 *     - Markdown & CSV: sectioned by "#"/"##"/... heading lines.
 *     - HTML: Notion's exported pages often mark sections with a bold
 *       all-caps paragraph (e.g. "<strong>WHO YOU ARE</strong>") rather
 *       than real <h1>/<h2> tags - both patterns are treated as section
 *       headings. Sections are also separated visually by <hr> in the
 *       export, though the actual boundary is the next heading/label.
 *   Notion's exported filenames/titles often carry a trailing hex block id
 *   (e.g. "Red Flags a1b2c3d4e5f6...") - that suffix is stripped
 *   automatically when deriving titles from filenames.
 *
 * Environment (loaded from .env automatically):
 *   OPENAI_API_KEY            - Required for embedding generation
 *   SUPABASE_SERVICE_ROLE_KEY - Required to bypass RLS
 *   SUPABASE_URL              - Falls back to VITE_SUPABASE_URL
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, relative, basename, extname } from 'path';
import { createClient } from '@supabase/supabase-js';

// ── Arg parsing ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const courseIdx = args.indexOf('--course');
const COURSE = courseIdx !== -1 ? args[courseIdx + 1] : 'NICHE_ASSESSMENT';
const INPUT_PATH = args
  .filter((a, i) => a !== '--dry-run' && i !== courseIdx && i !== courseIdx + 1)
  .at(0);

if (!INPUT_PATH) {
  console.error('Usage: node scripts/update-niche-kb.mjs [--course "NICHE_ASSESSMENT"] path/to/notion-export [--dry-run]');
  process.exit(1);
}

// ── Config ──────────────────────────────────────────────────────────
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMS = 1536;
const BATCH_SIZE = 20;
const MAX_CHARS_PER_CHUNK = 1500;
const MIN_CHARS_PER_CHUNK = 200; // sections smaller than this get merged into a neighbor
const CONTENT_EXTENSIONS = new Set(['.md', '.html']);

// ── Env ─────────────────────────────────────────────────────────────
function loadDotenv() {
  try {
    const env = readFileSync(resolve('.env'), 'utf-8');
    for (const line of env.split('\n')) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    }
  } catch { /* no .env file */ }
}
loadDotenv();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DRY_RUN) {
  if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');
  if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL)');
  if (!SUPABASE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
}

// ── Notion export file discovery ───────────────────────────────────
function findContentFiles(path) {
  const stat = statSync(path);
  if (stat.isFile()) {
    if (!CONTENT_EXTENSIONS.has(extname(path).toLowerCase())) {
      throw new Error(`${path} is not a .md or .html file`);
    }
    return [path];
  }
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (CONTENT_EXTENSIONS.has(extname(entry.name).toLowerCase())) files.push(full);
    }
  };
  walk(path);
  return files.sort();
}

// Notion appends a trailing hex/uuid block id to page titles and filenames
// on export (e.g. "Red Flags a1b2c3d4e5f647a8b9c0d1e2f3a4b5c6") - strip it
// so titles read cleanly in metadata.
function cleanNotionTitle(str) {
  return str
    .replace(/\s+[0-9a-f]{32}$/i, '')
    .replace(/\s+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, '')
    .trim();
}

function titleFromFilename(filePath) {
  return cleanNotionTitle(basename(filePath, extname(filePath)));
}

// Strips a "Page N — " (or similar) prefix and lowercases, so a heading can
// be compared against the page title to detect "heading just repeats the
// title" duplication, regardless of exact punctuation/dash character.
function normalizeForCompare(str) {
  return str
    .toLowerCase()
    .replace(/^page\s*\d+\s*[—–-]\s*/, '')
    .trim();
}

// ══════════════════════════════════════════════════════════════════
// Markdown parsing
// ══════════════════════════════════════════════════════════════════

// Strip Notion's markdown link syntax down to visible text, and drop the
// property lines ("Created time: ...") Notion prints under the title.
function cleanNotionBody(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [text](url) -> text
    .split('\n')
    .filter(line => !/^(Created|Last [Ee]dited)( time| by)?:\s/.test(line.trim()))
    .join('\n');
}

// Splits a markdown document into sections at each heading line, tracking
// a breadcrumb path (e.g. "Framework > Red Flags") through nested headings.
function sectionizeMarkdown(markdown, pageTitle) {
  const lines = markdown.split('\n');
  const sections = [];
  let stack = [pageTitle]; // stack[0] = page title (level 0)
  let current = { path: [pageTitle], heading: pageTitle, level: 0, text: '' };

  const pushCurrent = () => {
    if (current.text.trim()) sections.push({ ...current, text: current.text.trim() });
  };

  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.*)$/);
    if (m) {
      pushCurrent();
      const level = m[1].length;
      const heading = cleanNotionTitle(m[2]);
      stack = stack.slice(0, level);
      stack[level] = heading;
      const path = stack.slice(0, level + 1).filter(Boolean);
      current = { path, heading, level, text: '' };
    } else {
      current.text += (current.text ? '\n' : '') + line;
    }
  }
  pushCurrent();
  return sections;
}

// ══════════════════════════════════════════════════════════════════
// HTML parsing (Notion "Export > HTML")
// ══════════════════════════════════════════════════════════════════

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
};

function decodeEntities(str) {
  return str.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, ent) => {
    if (ent[0] === '#') {
      const code = ent[1].toLowerCase() === 'x' ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
      return Number.isNaN(code) ? whole : String.fromCodePoint(code);
    }
    const key = ent.toLowerCase();
    return key in NAMED_ENTITIES ? NAMED_ENTITIES[key] : whole;
  });
}

// Converts a fragment of inner HTML to plain text: line breaks, dropped
// link URLs (visible text kept), a space inserted between adjacent inline
// tags that would otherwise concatenate words, then strips remaining tags.
function textFromHtml(html) {
  let s = html;
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1');
  s = s.replace(/(<\/(?:strong|em|b|i|mark|code)>)(<(?:strong|em|b|i|mark|code)\b)/gi, '$1 $2');
  s = s.replace(/<[^>]+>/g, '');
  return decodeEntities(s);
}

function extractPageTitle(html) {
  const m = html.match(/<h1 class="page-title"[^>]*>([\s\S]*?)<\/h1>/);
  return m ? textFromHtml(m[1]).trim() : null;
}

function extractPageBody(html) {
  const m = html.match(/<div class="page-body">([\s\S]*)<\/div><\/article>/);
  return m ? m[1] : '';
}

// Tokenizes the page body into top-level blocks (paragraph, heading, list,
// blockquote, or a bare <hr> separator). Notion's exported markup doesn't
// nest these at the top level, so a single non-greedy regex pass suffices.
function tokenizeBlocks(html) {
  const blockRe = /<hr\b[^>]*\/>|<(h[1-6]|p|ul|ol|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/g;
  const blocks = [];
  let m;
  while ((m = blockRe.exec(html))) {
    if (m[0].startsWith('<hr')) blocks.push({ type: 'hr' });
    else blocks.push({ type: m[1], inner: m[2] });
  }
  return blocks;
}

function listToText(inner, ordered) {
  const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/g;
  const items = [];
  let m;
  while ((m = liRe.exec(inner))) items.push(textFromHtml(m[1]).trim());
  return items.map((t, i) => (ordered ? `${i + 1}. ${t}` : `- ${t}`)).join('\n');
}

// Splits an HTML page body into sections. Notion pages in this export don't
// use real <h2>/<h3> blocks for internal structure - they mark a section
// with a paragraph that is ENTIRELY bold (e.g. "<strong>WHO YOU ARE</strong>")
// with nothing else in it. Real heading tags are honored too, if present.
// The page's own title, when it appears again as the first such label
// (Notion often repeats the title as a bold lead line), is treated as part
// of the intro rather than a redundant subsection.
function htmlToSections(html, pageTitle) {
  const blocks = tokenizeBlocks(html);
  const sections = [];
  let current = { path: [pageTitle], heading: pageTitle, level: 0, text: '' };
  let sawFirstContent = false;

  const pushCurrent = () => {
    if (current.text.trim()) sections.push({ ...current, text: current.text.trim() });
  };
  const startSection = (heading) => {
    pushCurrent();
    current = { path: [pageTitle, heading], heading, level: 1, text: '' };
  };
  const appendText = (text) => {
    if (text) current.text += (current.text ? '\n\n' : '') + text;
  };
  // A heading that merely restates the page title (Notion often repeats it
  // as the first bold line) shouldn't become its own redundant subsection -
  // only skip the FIRST such occurrence, so a later repeat still sections.
  const isRedundantTitleHeading = (heading) =>
    !sawFirstContent && normalizeForCompare(heading) === normalizeForCompare(pageTitle);

  for (const block of blocks) {
    if (block.type === 'hr') continue; // visual separator only; real boundary is the next heading/label

    if (/^h[1-6]$/.test(block.type)) {
      const heading = textFromHtml(block.inner).trim();
      if (isRedundantTitleHeading(heading)) { sawFirstContent = true; continue; }
      sawFirstContent = true;
      startSection(heading);
      continue;
    }

    if (block.type === 'p') {
      const trimmedInner = block.inner.trim();
      const strongOnly = trimmedInner.match(/^<strong>([\s\S]*)<\/strong>$/);
      if (strongOnly) {
        const heading = textFromHtml(strongOnly[1]).trim();
        if (isRedundantTitleHeading(heading)) { sawFirstContent = true; continue; }
        sawFirstContent = true;
        startSection(heading);
        continue;
      }
      sawFirstContent = true;
      appendText(textFromHtml(block.inner).trim());
      continue;
    }

    if (block.type === 'ul' || block.type === 'ol') {
      sawFirstContent = true;
      appendText(listToText(block.inner, block.type === 'ol'));
      continue;
    }

    if (block.type === 'blockquote') {
      sawFirstContent = true;
      const text = textFromHtml(block.inner).trim();
      if (text) appendText(text.split('\n').map(l => `> ${l}`).join('\n'));
      continue;
    }
  }
  pushCurrent();
  return sections;
}

// ── Chunker: splits oversized sections by paragraph, merges tiny ones ──
// Shared by both the markdown and HTML pipelines - both produce the same
// { path, heading, level, text } section shape.
function chunkSections(sections) {
  const chunks = [];

  for (const section of sections) {
    const paragraphs = section.text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    if (paragraphs.length === 0) continue;

    let buf = '';
    const flush = () => {
      if (buf.trim()) chunks.push({ ...section, text: buf.trim() });
      buf = '';
    };

    for (const p of paragraphs) {
      if (buf && buf.length + p.length + 2 > MAX_CHARS_PER_CHUNK) flush();
      buf += (buf ? '\n\n' : '') + p;
      if (buf.length > MAX_CHARS_PER_CHUNK) flush(); // one paragraph already over the limit - ship it alone
    }
    flush();
  }

  // Merge consecutive small chunks from the *same* section into their neighbor
  const merged = [];
  for (const c of chunks) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev.heading === c.heading &&
      prev.text.length < MIN_CHARS_PER_CHUNK &&
      prev.text.length + c.text.length + 2 <= MAX_CHARS_PER_CHUNK
    ) {
      prev.text += '\n\n' + c.text;
    } else {
      merged.push({ ...c });
    }
  }
  return merged;
}

// ── OpenAI embeddings ───────────────────────────────────────────────
async function getEmbeddings(texts) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: texts, model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMS }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.data.sort((a, b) => a.index - b.index).map(d => d.embedding);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log(`Course tag: ${COURSE}`);
  console.log(`Input:      ${INPUT_PATH}`);
  console.log(`Mode:       ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  const resolvedInput = resolve(INPUT_PATH);
  const files = findContentFiles(resolvedInput);
  if (files.length === 0) throw new Error(`No .md or .html files found under ${INPUT_PATH}`);
  console.log(`Found ${files.length} file(s)\n`);

  const allChunks = [];
  for (const file of files) {
    const ext = extname(file).toLowerCase();
    const raw = readFileSync(file, 'utf-8');
    let pageTitle, sections;

    if (ext === '.html') {
      pageTitle = extractPageTitle(raw) || titleFromFilename(file);
      sections = htmlToSections(extractPageBody(raw), pageTitle);
    } else {
      const cleaned = cleanNotionBody(raw);
      // Prefer an explicit "# Title" first line; fall back to the filename.
      // If found, drop that line before sectioning so it isn't also counted
      // as a level-1 subsection duplicating the page title.
      const firstHeadingMatch = cleaned.match(/^#\s+(.*)$/m);
      pageTitle = firstHeadingMatch ? cleanNotionTitle(firstHeadingMatch[1]) : titleFromFilename(file);
      const body = firstHeadingMatch ? cleaned.replace(firstHeadingMatch[0], '') : cleaned;
      sections = sectionizeMarkdown(body, pageTitle);
    }

    const sectionChunks = chunkSections(sections);

    sectionChunks.forEach((chunk, ci) => {
      allChunks.push({
        content: chunk.text,
        metadata: {
          course: COURSE,
          source: 'notion',
          source_page: pageTitle,
          source_file: relative(resolvedInput, file) || basename(file),
          section: chunk.heading,
          section_path: chunk.path.join(' > '),
          chunk_id: `${pageTitle}_${ci}`,
          chunk_index: ci,
        },
      });
    });
  }
  console.log(`Generated ${allChunks.length} chunks\n`);

  // Page breakdown
  const pageCounts = {};
  for (const c of allChunks) {
    const p = c.metadata.source_page;
    pageCounts[p] = (pageCounts[p] || 0) + 1;
  }
  console.log('Page breakdown:');
  for (const [p, count] of Object.entries(pageCounts)) {
    console.log(`  ${p}: ${count} chunks`);
  }

  // Chunk stats
  const lengths = allChunks.map(c => c.content.length);
  const totalChars = lengths.reduce((a, b) => a + b, 0);
  const estTokens = Math.ceil(totalChars / 4);
  console.log(`\nChunk stats: avg=${Math.round(totalChars / lengths.length)} min=${Math.min(...lengths)} max=${Math.max(...lengths)}`);
  console.log(`Embedding cost estimate: ~$${(estTokens * 0.02 / 1_000_000).toFixed(4)} (${estTokens} tokens)`);

  if (DRY_RUN) {
    console.log('\nSample chunk:');
    console.log(JSON.stringify(allChunks[0], null, 2));
    console.log('\n--dry-run: stopping before database operations');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Test connections
  console.log('\nTesting connections...');
  const { count: totalDocs, error: countErr } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });
  if (countErr) throw new Error(`Supabase connection failed: ${countErr.message}`);

  const testEmb = await getEmbeddings(['connection test']);
  if (testEmb[0].length !== EMBEDDING_DIMS) throw new Error(`Expected ${EMBEDDING_DIMS} dims, got ${testEmb[0].length}`);
  console.log(`  Supabase: ${totalDocs} total documents`);
  console.log(`  OpenAI:   ${EMBEDDING_DIMS}-dim embeddings OK`);

  // Delete existing documents for THIS course tag only
  console.log(`\nDeleting existing "${COURSE}" documents...`);
  const { error: delErr, count: delCount } = await supabase
    .from('documents')
    .delete({ count: 'exact' })
    .eq('metadata->>course', COURSE);
  if (delErr) throw new Error(`Delete failed: ${delErr.message}`);
  console.log(`  Deleted ${delCount ?? 0} rows`);

  // Insert in batches with embeddings
  console.log(`\nInserting ${allChunks.length} chunks (batch size ${BATCH_SIZE})...`);
  let inserted = 0;

  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map(c => c.content);
    const embeddings = await getEmbeddings(texts);

    const rows = batch.map((chunk, idx) => ({
      content: chunk.content,
      metadata: chunk.metadata,
      embedding: JSON.stringify(embeddings[idx]),
    }));

    const { error } = await supabase.from('documents').insert(rows);
    if (error) throw new Error(`Insert batch ${i}: ${error.message}`);

    inserted += batch.length;
    process.stdout.write(`  ${inserted}/${allChunks.length}\r`);

    if (i + BATCH_SIZE < allChunks.length) await sleep(150);
  }

  // Verify
  console.log(`\n\nVerifying...`);
  const { count: newCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('metadata->>course', COURSE);
  const { count: newTotal } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });

  console.log(`  "${COURSE}" documents: ${newCount}`);
  console.log(`  Total documents:       ${newTotal}`);
  console.log(`\nDone!`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
