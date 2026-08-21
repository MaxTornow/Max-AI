/**
 * Scheduled retention-window cleanup of original video files, triggered by
 * n8n on a schedule (POST request with a shared-secret header).
 *
 * Shares its query/deletion logic with the manual CLI
 * (scripts/cleanup-originals.mjs) via scripts/lib/cleanupOriginals.cjs, so
 * the two entry points can't drift out of sync.
 *
 * Safety:
 *   - Requires header `x-cleanup-secret` to match env var CLEANUP_TRIGGER_SECRET
 *   - Defaults to dry-run regardless of anything else in the request; only
 *     performs real deletes if the JSON body explicitly sets `execute: true`
 *   - Capped at MAX_PER_RUN videos per invocation (across all active phases)
 *     to stay well inside Netlify's synchronous function timeout. A daily
 *     schedule catches up on any backlog over the following days — see the
 *     `capped`/`backlogRemaining` fields in the response.
 *
 * Request body (all optional):
 *   {
 *     "retentionDays": 30,       // default: 30
 *     "includeUrls": false,      // default: false
 *     "includeFailed": false,    // default: false
 *     "execute": false           // default: false (dry-run)
 *   }
 *
 * Required environment variables (set in Netlify dashboard, not committed):
 *   SUPABASE_URL (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   CLEANUP_TRIGGER_SECRET
 *
 * IMPORTANT — this file must stay a plain .js entry (not renamed to .mjs):
 * Netlify's function bundler can select either an esbuild full-bundle
 * strategy or an nft (Node File Trace) strategy depending on the build
 * environment, and under nft the entry file still gets CJS-transpiled
 * content (module.exports, etc.) regardless of its own extension — an .mjs
 * extension then forces Node to parse that CJS content as ESM, which
 * crashes on the first `module.exports` line. A .js entry lets Node use
 * whichever module system the bundler actually emitted.
 *
 * scripts/lib/cleanupOriginals.cjs (deliberately CommonJS — see its own
 * header comment for why) is loaded via a dynamic import() below rather
 * than a static import, for the same bundler-strategy-independence reason:
 * dynamic import() is never rewritten to require() by any bundler (its
 * Promise-based semantics wouldn't survive that), so it works correctly
 * regardless of which bundling strategy Netlify picks for this function.
 * Verified locally against @netlify/zip-it-and-ship-it under both
 * 'esbuild' and 'nft' nodeBundler modes by compiling the real function,
 * extracting the zip, and require()-ing + invoking the compiled handler in
 * a fresh Node process — see PR discussion for repro details.
 */

import { createClient } from '@supabase/supabase-js';

const MAX_PER_RUN = 300;

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed. Use POST.' });
  }

  const expectedSecret = process.env.CLEANUP_TRIGGER_SECRET;
  if (!expectedSecret) {
    console.error('[cleanup-originals-run] CLEANUP_TRIGGER_SECRET is not configured.');
    return jsonResponse(500, { ok: false, error: 'Server misconfiguration: trigger secret not set.' });
  }

  const providedSecret = event.headers?.['x-cleanup-secret'] ?? event.headers?.['X-Cleanup-Secret'];
  if (!providedSecret || providedSecret !== expectedSecret) {
    return jsonResponse(401, { ok: false, error: 'Missing or invalid x-cleanup-secret header.' });
  }

  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return jsonResponse(400, { ok: false, error: 'Invalid JSON body.' });
  }

  const { runCleanupOriginals, DEFAULT_RETENTION_DAYS } = await import('../../scripts/lib/cleanupOriginals.cjs');

  const retentionDays = typeof body.retentionDays === 'number' ? body.retentionDays : DEFAULT_RETENTION_DAYS;
  const includeUrls = body.includeUrls === true;
  const includeFailed = body.includeFailed === true;
  // Dry-run unless the caller explicitly opts into real deletes.
  const dryRun = body.execute !== true;

  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    return jsonResponse(400, { ok: false, error: 'retentionDays must be a positive number.' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[cleanup-originals-run] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not configured.');
    return jsonResponse(500, { ok: false, error: 'Server misconfiguration: Supabase credentials not set.' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const summary = await runCleanupOriginals(supabase, {
      retentionDays,
      includeUrls,
      includeFailed,
      dryRun,
      maxPerRun: MAX_PER_RUN,
      log: (...a) => console.log('[cleanup-originals-run]', ...a),
      warn: (...a) => console.warn('[cleanup-originals-run]', ...a),
    });

    return jsonResponse(200, { ok: true, maxPerRun: MAX_PER_RUN, ...summary });
  } catch (error) {
    console.error('[cleanup-originals-run] Fatal error:', error);
    return jsonResponse(500, { ok: false, error: error.message || 'Unknown error' });
  }
};

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };
}
