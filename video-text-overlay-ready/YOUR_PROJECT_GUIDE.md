# Video Text Overlay Editor (TYLER) - Implementation Guide

> **This guide was generated specifically for your project.**
> It contains ONLY the commands, templates, and examples you need.

---

## Getting Started

### Step 0: Open New Claude Terminal

**IMPORTANT:** Open a new Claude Code terminal and navigate to this project folder:

```bash
cd video-text-overlay-ready/
```

**Why:** This ensures you're working in the filtered project folder with the correct commands and settings. All slash commands below assume you're in this directory.

---

## What You Have

This filtered framework includes:

### Commands Available

| Category | Command | Purpose |
|----------|---------|---------|
| **PRP Generation** | `/create-base-prp-parallel` | Generate comprehensive PRP with parallel research |
| **PRP Generation** | `/generate-prp` | Standard PRP generation |
| **PRP Generation** | `/prp-ts-create` | TypeScript-specific PRP creation |
| **PRP Generation** | `/parallel-prp-creation` | Create multiple PRP variants |
| **Validation** | `/prp-validate` | Validate PRP quality before execution |
| **Execution** | `/execute-prp` | Implement the feature from PRP |
| **Execution** | `/prp-execute` | Alternative execution command |
| **Execution** | `/prp-ts-execute` | TypeScript-specific execution |
| **Analysis** | `/prp-analyze-run` | Capture learnings post-implementation |
| **Git** | `/smart-commit` | AI-powered commit messages |
| **Git** | `/create-pr` | Create pull request |
| **Git** | `/new-dev-branch` | Create feature branch |
| **Code Quality** | `/TS-review-general` | TypeScript code review |
| **Code Quality** | `/TS-review-staged-unstaged` | Review staged changes |
| **Code Quality** | `/debug-RCA` | Root cause analysis |
| **Code Quality** | `/refactor-simple` | Simple refactoring |
| **Utilities** | `/prime-core` | Context priming |

### Global Rules
- `global-rules/CLAUDE.md` - Consolidated rules including:
  - Mac environment settings
  - Archon MCP integration
  - TypeScript best practices
  - React patterns for video editing
  - FFmpeg implementation patterns
  - Supabase patterns
  - Security considerations

### Subagents Available
- `prp-quality-agent` - PRP validation
- `prp-validation-gate-agent` - Progressive validation gates

---

## Your Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | React + TypeScript | 18.2.0 / 5.2.2 |
| **Build Tool** | Vite | 6.3.5 |
| **Styling** | Tailwind CSS | 3.3.3 |
| **State** | React Query + useReducer | 3.39.3 |
| **Database** | Supabase (PostgreSQL) | 2.38.0 |
| **Backend** | Node.js + Express | 20.x / 4.18.x |
| **Video Processing** | FFmpeg | 6.x |

---

## Your Core Features

### Priority 1: Essential (MVP)

1. **Video Upload** - Accept vertical videos (MP4, MOV, WebM), max 500MB
2. **Timeline Editor** - Visual timeline, add/remove/drag segments
3. **Text Segment Properties** - Multi-line text, fonts, colors, positioning
4. **Video Preview** - Real-time preview with CSS overlays
5. **Export/Render** - FFmpeg processing with progress indicator

### Priority 2: Enhanced UX

6. **Text Shadow** - Toggle drop shadow
7. **Background Box** - Optional background behind text
8. **Font Weight** - Normal/Bold toggle
9. **Project Save/Load** - Auto-save to database

### Priority 3: Future

10. Text Templates
11. Video Trimming
12. Undo/Redo
13. Keyboard Shortcuts

---

## Implementation Workflow

**Folder Structure:**
```
1-prp-generation/  → Create PRPs from requirements
2-validation/      → Validate PRP quality
3-prp-execution/   → Implement the feature
4-analysis/        → Capture learnings
```

---

### Step 1: Generate Comprehensive PRP

**Optional - Archon Research First:**

If Archon MCP is available, search documentation before PRP generation:

```bash
# Search FFmpeg patterns (2-5 keywords)
mcp__archon__rag_search_knowledge_base(
  query="ffmpeg drawtext filter",
  match_count=5
)

# Find React timeline examples
mcp__archon__rag_search_code_examples(
  query="react timeline editor",
  match_count=3
)

# Search Supabase storage patterns
mcp__archon__rag_search_knowledge_base(
  query="supabase video upload",
  match_count=5
)
```

**Command:**
```bash
/create-base-prp-parallel PRPs/INITIAL-video-text-overlay.md
```

**What this does:**

This launches 4 parallel research agents that simultaneously:
1. **Agent 1:** Analyze existing MAXAI codebase patterns (BETTY service, components)
2. **Agent 2:** Research FFmpeg drawtext filter, React timeline libraries
3. **Agent 3:** Design testing strategy for video processing
4. **Agent 4:** Gather architecture examples for video editors

**Time:** ~5-10 minutes

**Output:** `PRPs/video-text-overlay.md` - Comprehensive implementation blueprint

**What you'll get:**
- Complete implementation plan following INITIAL.md phases
- FFmpeg filter examples
- React component patterns
- Supabase integration examples
- Testing strategy
- All context needed for AI to build working code

---

### Step 2: Validate PRP Quality

**Command:**
```bash
/prp-validate PRPs/video-text-overlay.md
```

**What this does:**

Validates your PRP against quality standards:
- ✅ All sections complete
- ✅ FFmpeg examples are correct
- ✅ React patterns follow MAXAI conventions
- ✅ Testing strategy is comprehensive
- ✅ Security considerations included
- ✅ Implementation phases are clear

**If issues found:** Fix and re-validate until approved ✅

---

### Step 3: Execute PRP (Build the Feature)

**Command:**
```bash
/execute-prp PRPs/video-text-overlay.md
```

**What this does:**

AI implements your feature following the PRP blueprint:

**Phase 1: Server Setup**
- Create Node.js render server project
- Set up Express + fluent-ffmpeg
- Download and configure fonts
- Implement POST /api/render endpoint
- Deploy to Railway

**Phase 2: Timeline & Editor UI**
- Create TextEditorPage route
- Implement Timeline component
- Build VideoPreview with overlays
- Create useTextEditor hook
- Wire up playback sync

**Phase 3: Properties Panel**
- Build TextPropertiesPanel layout
- Implement FontPicker, ColorPicker
- Add position and timing controls
- Wire up segment updates

**Phase 4: Integration**
- Connect VideoUploader to Supabase
- Implement projectService
- Add auto-save functionality
- Build RenderButton with progress

**Phase 5: Polish & Testing**
- Add loading states
- Implement error handling
- Test edge cases
- Deploy to production

**Validation levels during execution:**
- **Level 1:** Syntax & Style - TypeScript strict mode, ESLint
- **Level 2:** Unit Tests - Component tests, utility tests
- **Level 3:** Integration Tests - Upload flow, render flow
- **Level 4:** Creative Validation - Performance, security

**Result:** Working, tested, production-ready feature ✅

---

### Step 4: Analyze and Learn

**Command:**
```bash
/prp-analyze-run PRPs/video-text-overlay.md
```

**What this does:**

Captures learnings from this implementation:
- What went well (FFmpeg patterns, component structure)
- What could be improved
- Reusable patterns for future projects
- Framework enhancements

---

## Skill Level Guidance

**Your skill level:** Intermediate (based on INITIAL.md detail)

### Intermediate Developer Tips
- Reference the component specifications in INITIAL.md
- Use the FFmpeg implementation section as your guide
- Balance timeline library choice early (react-timeline-editor vs @dnd-kit)
- Run integration tests after each phase
- Consider CORS setup for render server early

---

## Tech-Specific Best Practices

### React + TypeScript Best Practices

```typescript
// Use proper typing for all props
interface TimelineProps {
  duration: number;
  segments: TextSegment[];
  onSegmentUpdate: (id: string, updates: Partial<TextSegment>) => void;
}

// Use useReducer for complex state
type EditorAction =
  | { type: 'ADD_SEGMENT'; payload: TextSegment }
  | { type: 'UPDATE_SEGMENT'; payload: { id: string; updates: Partial<TextSegment> } };

// Avoid any types
const handleError = (error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
  }
};
```

### FFmpeg Best Practices

```typescript
// Always escape text for FFmpeg
const escapeText = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\\\\\')
    .replace(/'/g, "'\\''")
    .replace(/:/g, '\\:');
};

// Use enable expressions for timing
const enableExpr = `enable='between(t,${startTime},${endTime})'`;

// Set reasonable timeouts
const RENDER_TIMEOUT = 300000; // 5 minutes
```

### Supabase Best Practices

```typescript
// Use signed URLs for secure access
const { data } = await supabase.storage
  .from('videos')
  .createSignedUrl(path, 86400); // 24 hours for processing

// Always implement RLS policies
// Users can only access their own projects
```

---

## Environment Setup

### Required Environment Variables

**Frontend (.env in MAXAI root):**
```bash
# Existing
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# New for TYLER
VITE_RENDER_API_URL=https://your-render-server.railway.app
```

**Render Server (server/.env):**
```bash
PORT=3001
NODE_ENV=production
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
FONTS_DIR=/app/fonts
TEMP_DIR=/tmp
RENDER_TIMEOUT=300
```

### Install Dependencies

**Frontend (already in MAXAI):**
```bash
npm install @xzdarcy/react-timeline-editor
# OR
npm install @dnd-kit/core @dnd-kit/sortable
```

**Render Server:**
```bash
cd server
npm init -y
npm install express fluent-ffmpeg @supabase/supabase-js cors
npm install -D typescript @types/node @types/express
```

**System Requirement:**
```bash
# Install FFmpeg (macOS)
brew install ffmpeg

# Or on Ubuntu
apt-get install ffmpeg
```

---

## Common Gotchas (From Your Planning)

### Gotcha 1: Font Rendering Differences
**Problem:** CSS fonts and FFmpeg fonts render slightly differently
**Solution:** Use web-safe fonts with TTF equivalents, document preview as "approximate"

### Gotcha 2: Large Video Files
**Problem:** Uploading and processing large videos is slow
**Solution:** Use progress indicators, Supabase resumable uploads, 5-min FFmpeg timeout

### Gotcha 3: Position Mapping
**Problem:** CSS percentages vs FFmpeg coordinate expressions
**Solution:** Store as 0-100, convert: CSS `left: ${x}%`, FFmpeg `x=(w*${x}/100)-text_w/2`

### Gotcha 4: Text Escaping
**Problem:** Special characters break FFmpeg command
**Solution:** Use the escape function from global-rules/CLAUDE.md

### Gotcha 5: Browser Compatibility
**Problem:** Video playback differs across browsers
**Solution:** Test Chrome, Firefox, Safari; use standard HTML5 video APIs

---

## Testing Strategy

### Unit Tests
| Component | Test Cases |
|-----------|------------|
| `buildDrawtextFilter` | Correct filter string, escaped characters, multiple segments |
| `escapeText` | Special characters, newlines, quotes |
| `formatTime` | Seconds to MM:SS format |
| `TimelineSegment` | Drag updates position, resize updates duration |

### Integration Tests
| Flow | Test Cases |
|------|------------|
| Video upload | File accepted, stored in Supabase, duration extracted |
| Segment CRUD | Add, update, delete segments |
| Project save | Auto-saves, loads correctly |
| Render flow | API call, progress updates, success/error handling |

### Manual Testing Checklist
- [ ] Upload MP4, MOV, WebM formats
- [ ] Upload 100MB+ file
- [ ] Add 10+ text segments
- [ ] Multi-line text with special characters
- [ ] Font sizes 24px and 120px
- [ ] Positions at 0% and 100%
- [ ] Very short segment (0.5s)
- [ ] Long video (5+ minutes)
- [ ] Rapid segment selection
- [ ] Browser back/forward

---

## Advanced Features (Optional)

### Parallel PRP Creation
Compare multiple implementation approaches:

```bash
/parallel-prp-creation "video-text-overlay" "timeline editor with FFmpeg rendering" 3
```

Creates 3 PRPs with different optimization priorities.

---

## Troubleshooting

### "Command not found"
**Solution:** Ensure you're in the `video-text-overlay-ready/` folder

### "FFmpeg not found"
**Solution:** Install FFmpeg: `brew install ffmpeg`

### "Validation failing"
**Solution:** Read the validation report - it has specific fixes

### "CORS errors on render server"
**Solution:** Configure CORS to allow MAXAI frontend origin

### "Video upload fails"
**Solution:** Check Supabase storage bucket exists and RLS policies are set

### "Render timeout"
**Solution:** Increase `RENDER_TIMEOUT` or optimize FFmpeg settings

---

## File Structure Reference

```
src/
├── pages/
│   └── texteditor/
│       └── TextEditorPage.tsx
├── components/
│   └── texteditor/
│       ├── index.ts
│       ├── VideoUploader.tsx
│       ├── VideoPreview.tsx
│       ├── TextOverlayLayer.tsx
│       ├── Timeline.tsx
│       ├── TimelineSegment.tsx
│       ├── TextPropertiesPanel.tsx
│       └── RenderButton.tsx
├── services/
│   └── texteditor/
│       ├── index.ts
│       ├── types.ts
│       ├── projectService.ts
│       └── renderService.ts
└── hooks/
    ├── useTextEditor.ts
    ├── useVideoPlayer.ts
    └── useTimeline.ts

server/
├── src/
│   ├── index.ts
│   ├── routes/render.ts
│   └── services/ffmpeg.ts
└── fonts/
    ├── OpenSans-Regular.ttf
    ├── Roboto-Regular.ttf
    └── ...
```

---

## Resources

### Documentation
- [FFmpeg drawtext filter](https://ffmpeg.org/ffmpeg-filters.html#drawtext)
- [react-timeline-editor](https://github.com/xzdarcy/react-timeline-editor)
- [@dnd-kit](https://dndkit.com/)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [fluent-ffmpeg](https://www.npmjs.com/package/fluent-ffmpeg)

### Hosting
- [Railway](https://docs.railway.app/) - Recommended for render server
- [Render](https://render.com/docs)
- [Fly.io](https://fly.io/docs/)

### Global Rules
- `global-rules/CLAUDE.md` - Read before starting implementation

---

## Success Criteria

### MVP Complete When:
1. ✅ User can upload a vertical video
2. ✅ User can add text segments with timing
3. ✅ User can customize font, color, size, position
4. ✅ User can preview text overlays in real-time
5. ✅ User can export video with text burned in
6. ✅ Exported video is downloadable MP4
7. ✅ Projects save automatically

### Quality Metrics:
- Render time: <30s for 60s video with 5 segments
- Preview latency: <100ms for property changes
- Upload success rate: >99%
- Export success rate: >95%

---

## Next Steps

1. ✅ Review this guide completely
2. ✅ Read `global-rules/CLAUDE.md` for patterns
3. ✅ Set up environment variables
4. ✅ Install FFmpeg if not already installed
5. ✅ Run: `/create-base-prp-parallel PRPs/INITIAL-video-text-overlay.md`
6. ✅ Follow the workflow above

---

**Ready to build? Start with:**

```bash
/create-base-prp-parallel PRPs/INITIAL-video-text-overlay.md
```

**Good luck building TYLER!**
