# Video Text Overlay Rapid Development - Research Results

## Executive Summary

This document captures the research findings and strategic decisions for the **fastest path to a working Video Text Overlay Editor (TYLER)** MVP. Analysis of the existing MAXAI codebase revealed substantial reusable patterns from the BETTY feature, eliminating 40-50% of implementation work. The recommended approach prioritizes native browser APIs over heavy libraries, achieving a 3-5 day timeline to working prototype.

---

## Approach Summary

### Core Strategy: Maximum Reuse, Minimum Dependencies

**Philosophy:**
1. **Copy, don't rebuild** - BETTY feature provides battle-tested Supabase integration
2. **Native APIs first** - HTML5 video + CSS positioning beats heavyweight libraries
3. **Simple state, fast iteration** - useState beats Redux for MVP
4. **Deploy early, optimize later** - Railway.app free tier for instant server deployment

**Why This Is Fast:**
- Supabase client, auth, storage patterns already proven
- VideoUploader component is literally copy-paste ready
- No learning curve for new libraries
- FFmpeg server is ~150 lines of straightforward Node.js

---

## Reusable Components Identified in Codebase

### 1. Supabase Integration (CRITICAL REUSE)

**File:** `/Users/dan/Documents/Max Tornow  2/AI INTERFACE/src/services/betty/index.ts`

**What to Copy:**
```typescript
// Video upload with progress tracking
uploadVideoToStorage(file: File, userId: string, onProgress?: (progress: number) => void)
  → Returns: { path: string; url: string }

// Signed URL generation for downloads
getVideoSignedUrl(storagePath: string)
  → Returns: string (signed URL)

// Database CRUD
createVideoRecord(video: Omit<Video, 'id' | 'created_at' | 'updated_at'>)
updateVideoRecord(videoId: string, updates: Partial<Video>)
getUserVideos(userId: string)
deleteVideo(videoId: string, userId: string)
```

**Adaptation Required:**
- Change `videos` table references to `text_overlay_projects`
- Modify type interfaces to match TextSegment structure
- Keep storage bucket as `videos` (no need for separate bucket)

**Time Saved:** 4-6 hours (no need to figure out Supabase patterns from scratch)

### 2. VideoUploader Component (100% REUSABLE)

**File:** `/Users/dan/Documents/Max Tornow  2/AI INTERFACE/src/components/betty/VideoUploader.tsx`

**Features Already Built:**
- React-dropzone drag-and-drop
- File type validation (MP4, MOV, WebM)
- File size validation (already has MAX_FILE_SIZE constant)
- Progress indicator UI
- Error handling with helpful messages
- Dark mode support
- Accessible (aria-labels)

**How to Reuse:**
```bash
cp src/components/betty/VideoUploader.tsx src/components/texteditor/VideoUploader.tsx
# No changes needed - props interface is perfect:
# - onFileAccepted: (file: File) => void
# - onFileRemoved: () => void
# - selectedFile: File | null
# - isUploading: boolean
# - uploadProgress: number
# - error?: string | null
```

**Time Saved:** 2-3 hours (polished component with all states handled)

### 3. Custom Hook Pattern

**File:** `/Users/dan/Documents/Max Tornow  2/AI INTERFACE/src/hooks/useVideoProcessing.ts`

**Pattern to Follow:**
```typescript
export const useTextEditor = () => {
  const [state, setState] = useState<EditorState>(initialState);

  const mutation = useMutation<Result, Error, Request>(
    async (request) => {
      // Processing logic
    }
  );

  return {
    // State
    videoFile, segments, selectedId, currentTime, isPlaying,
    // Actions
    addSegment, updateSegment, deleteSegment, selectSegment,
    saveProject, exportProject,
    // Status
    isLoading, error, reset,
  };
};
```

**Time Saved:** 1-2 hours (proven state management pattern)

### 4. UI/UX Patterns

**Tailwind Config:** `/Users/dan/Documents/Max Tornow  2/AI INTERFACE/tailwind.config.js`
- Primary color palette (sky blue)
- Secondary color palette (purple)
- Dark mode already configured
- Custom animations (fadeIn, scaleIn)
- Typography plugin included

**Context Providers:**
- `AuthContext` - User authentication, already wired up
- `ToastContext` - User notifications, already wired up
- `ThemeContext` - Dark/light mode, already wired up

**Layout Structure:**
- `MainLayout` with sidebar navigation
- Protected routes pattern
- Dashboard grid layout

**Time Saved:** 2-3 hours (no styling decisions, consistent UX)

### 5. Vite Configuration

**File:** `/Users/dan/Documents/Max Tornow  2/AI INTERFACE/vite.config.ts`

**Already Configured:**
- Path aliases: `@components`, `@services`, `@hooks`, `@context`, `@types`
- Port 3000 dev server
- Proxy configuration pattern (can add render server if needed)

**Usage:**
```typescript
// Instead of:
import { supabase } from '../../../services/supabase/client';

// Write:
import { supabase } from '@services/supabase/client';
```

**Time Saved:** 30 minutes (no setup, just use)

---

## Libraries & Shortcuts That Accelerate Development

### Timeline Component: Native HTML5 (FASTEST)

**Why NOT use @xzdarcy/react-timeline-editor:**
- Last updated 3 years ago (archived)
- 5,000+ lines of complex code
- Designed for animation editors, overkill for text timing
- Would take 4-6 hours to learn API

**Why YES use native HTML5:**
```tsx
// Simple timeline in 50 lines:
<div className="timeline">
  <input
    type="range"
    min={0}
    max={videoDuration}
    value={currentTime}
    onChange={(e) => setCurrentTime(Number(e.target.value))}
  />
  <div className="segments">
    {segments.map(segment => (
      <div
        style={{
          left: `${(segment.startTime / videoDuration) * 100}%`,
          width: `${((segment.endTime - segment.startTime) / videoDuration) * 100}%`,
        }}
        onClick={() => selectSegment(segment.id)}
      >
        {segment.text}
      </div>
    ))}
  </div>
</div>
```

**Time Saved:** 4-6 hours (no library learning curve)

### Video Player: Native HTML5 (ZERO DEPENDENCIES)

**Why NOT use react-player:**
- Designed for YouTube/Vimeo embeds, overkill for local files
- 200KB bundle size
- Adds abstraction we don't need

**Why YES use `<video>` element:**
```tsx
const videoRef = useRef<HTMLVideoElement>(null);

useEffect(() => {
  const video = videoRef.current;
  if (!video) return;

  const handleTimeUpdate = () => setCurrentTime(video.currentTime);
  video.addEventListener('timeupdate', handleTimeUpdate);
  return () => video.removeEventListener('timeupdate', handleTimeUpdate);
}, []);

return <video ref={videoRef} src={videoUrl} />;
```

**Time Saved:** 2-3 hours (no abstraction overhead)

### State Management: useState (SIMPLEST)

**Why NOT use Redux/Zustand:**
- Adds boilerplate (actions, reducers, store setup)
- Over-engineered for single-page feature
- Team may not know Redux patterns

**Why YES use useState/useReducer:**
```typescript
const [videoFile, setVideoFile] = useState<File | null>(null);
const [segments, setSegments] = useState<TextSegment[]>([]);
const [selectedId, setSelectedId] = useState<string | null>(null);

// If state updates get complex, upgrade to:
const [state, dispatch] = useReducer(editorReducer, initialState);
```

**Time Saved:** 2-4 hours (no store architecture decisions)

### FFmpeg Wrapper: fluent-ffmpeg (PROVEN)

**Status:** Repository archived May 2025, but still works perfectly

**Why Use:**
- Simple API for drawtext filters
- Widely used in production (millions of downloads)
- No viable alternative for Node.js

**Gotcha:** Use `.complexFilter()` with object syntax, NOT `.videoFilters()` with strings

```javascript
// WORKS:
ffmpeg(inputPath)
  .complexFilter([{
    filter: 'drawtext',
    options: { text: 'Hello', fontsize: 48, ... }
  }])
  .run();

// FAILS:
ffmpeg(inputPath)
  .videoFilters("drawtext=text='Hello':fontsize=48")
  .run();
```

**Time Saved:** 3-5 hours (battle-tested API)

---

## Simplification Opportunities

### 1. Single-Page Component for MVP

**Instead of:**
```
pages/texteditor/TextEditorPage.tsx
pages/texteditor/EditorLayout.tsx
pages/texteditor/EditorHeader.tsx
pages/texteditor/EditorSidebar.tsx
```

**Do:**
```
pages/texteditor/TextEditorPage.tsx  (250-300 lines, all in one)
```

**Why:** Faster to write, easier to reason about, refactor later if needed

**Time Saved:** 2-3 hours (no file organization overhead)

### 2. Inline CSS for Text Overlays

**Instead of:** Separate CSS classes for each font/size/color combo

**Do:**
```tsx
<div style={{
  fontFamily: segment.fontFamily,
  fontSize: `${segment.fontSize}px`,
  color: segment.color,
  left: `${segment.position.x}%`,
  top: `${segment.position.y}%`,
}}>
  {segment.text}
</div>
```

**Why:** Dynamic styling, no CSS cascade issues, exact match to FFmpeg output

**Time Saved:** 1-2 hours (no CSS debugging)

### 3. Auto-Save with Debounce

**Instead of:** Manual save button + unsaved changes warning

**Do:**
```typescript
const debouncedSave = useMemo(
  () => debounce((segments) => saveProject(segments), 2000),
  []
);

useEffect(() => {
  if (projectId) debouncedSave(segments);
}, [segments]);
```

**Why:** Better UX, no "forgot to save" issues, simpler UI

**Time Saved:** 1 hour (no save button state management)

### 4. Minimal Database Schema

**Defer These Columns to v2:**
- `video_width`, `video_height` (extract if needed, not critical)
- `render_started_at`, `render_completed_at` (nice to have, not MVP)
- `error_message`, `retry_count` (add when debugging render failures)

**MVP Schema:**
```sql
CREATE TABLE text_overlay_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Project',
  original_video_path TEXT NOT NULL,
  video_duration_seconds NUMERIC,
  text_segments JSONB DEFAULT '[]'::jsonb NOT NULL,
  render_status TEXT DEFAULT 'draft',
  rendered_video_path TEXT
);
```

**Time Saved:** 30-60 minutes (fewer columns to populate)

---

## Estimated Implementation Order (Fastest Path)

### Day 1: Foundation + Server (6-8 hours)

**Morning (4 hours):**
1. Create `text_overlay_projects` table in Supabase (30 min)
2. Copy VideoUploader from BETTY (5 min)
3. Create TextEditorPage skeleton (1 hour)
4. Wire up video upload to Supabase Storage (1 hour)
5. Test upload flow end-to-end (30 min)
6. Create render server directory structure (30 min)
7. Download font TTF files (30 min)

**Afternoon (4 hours):**
1. Install server dependencies (10 min)
2. Create Express server with /api/render endpoint (1 hour)
3. Implement FFmpeg drawtext filter builder (2 hours)
4. Test local render with hardcoded video + text (30 min)
5. Deploy to Railway.app (30 min)

**End of Day 1:** Video uploads work, server can render text on video

### Day 2: Editor UI (6-8 hours)

**Morning (4 hours):**
1. Create VideoPreview component (1.5 hours)
2. Create Timeline component (1.5 hours)
3. Create PropertiesPanel component (1 hour)

**Afternoon (4 hours):**
1. Create useTextEditor hook (2 hours)
2. Wire up segment CRUD (add, update, delete) (1 hour)
3. Wire up playback sync (video time → segment visibility) (1 hour)

**End of Day 2:** Can add segments, edit properties, preview shows text

### Day 3: Integration (6-8 hours)

**Morning (4 hours):**
1. Create storageService.ts (reuse BETTY patterns) (1 hour)
2. Create projectService.ts (Supabase CRUD) (1.5 hours)
3. Create renderService.ts (API client) (1 hour)
4. Implement auto-save with debounce (30 min)

**Afternoon (4 hours):**
1. Create ExportButton component (30 min)
2. Wire up render flow (upload → render → download) (2 hours)
3. Test full workflow end-to-end (1 hour)
4. Fix integration bugs (30 min)

**End of Day 3:** Full workflow works: upload → edit → export → download

### Day 4-5: Polish & Testing (4-6 hours)

**Day 4 (3-4 hours):**
1. Add loading states (skeletons, spinners) (1 hour)
2. Add error handling and toasts (1 hour)
3. Add empty states (no video, no segments) (30 min)
4. Test with edge cases (large videos, special characters) (1 hour)

**Day 5 (2-3 hours):**
1. Fix bugs from testing (1-2 hours)
2. Deploy frontend (30 min)
3. Final end-to-end test in production (30 min)

**End of Day 5:** Production-ready MVP

---

## What to Defer to v2

### Features (Not Critical for MVP)

1. **Text Shadows** - Nice visual enhancement, not essential
2. **Background Boxes** - Readability aid, can work around with light text colors
3. **Font Weights** (bold/normal) - Use single weight TTFs for MVP
4. **Text Alignment** (left/center/right) - Default to center
5. **Project Library Browser** - Just show most recent project
6. **Video Trimming** - Users can trim before upload
7. **Undo/Redo** - Auto-save is good enough for MVP
8. **Keyboard Shortcuts** - Mouse-driven workflow is fine
9. **Text Templates/Presets** - Users define their own styles

### Technical Optimizations

1. **Resumable Uploads** - Supabase standard upload works for < 500MB
2. **Server-Side Progress Polling** - Just show spinner during render
3. **Video Thumbnails** - Preview uses actual video
4. **Chunk Upload Progress** - Fake progress indicator is fine
5. **Multi-Project Management** - One active project at a time
6. **Export Format Options** - MP4 only for MVP
7. **Quality Settings** - Use preset: fast, crf: 23 (balanced)

### Why Deferring These Is Smart

- **Faster to Market:** 3-5 days vs 2-3 weeks
- **Validate Core Value:** Does text overlay solve user problems?
- **Learn from Usage:** What features do users actually want?
- **Avoid Over-Engineering:** Build what's needed, not what's possible
- **Reduce Risk:** Smaller scope = fewer bugs = more confidence

---

## Key Technical Decisions & Rationale

### Decision 1: Native HTML5 Timeline vs Library

**Options Considered:**
- @xzdarcy/react-timeline-editor (last updated 3 years ago)
- @dnd-kit for drag-and-drop (would need to build timeline UI)
- Build from scratch with HTML5

**Choice:** Build from scratch with `<input type="range">` + absolute positioned divs

**Rationale:**
- Timeline libraries are designed for complex animation editors
- Our needs are simple: display segments, click to select, basic drag
- Native APIs are more maintainable (no library updates to worry about)
- Estimated 50-100 lines of code vs learning complex API

**Risk:** May need to add drag-and-drop later
**Mitigation:** Can always add @dnd-kit in v2 if users request it

### Decision 2: Single useState Hooks vs Zustand/Redux

**Options Considered:**
- Redux Toolkit (team may not know it)
- Zustand (lightweight, but still a library)
- Multiple useState + useReducer if needed

**Choice:** Multiple useState hooks, upgrade to useReducer if state logic gets complex

**Rationale:**
- State is scoped to single page (no global state needed)
- React Query handles server state
- Less code to write and maintain
- Easier for junior developers to understand

**Risk:** Could become messy with 10+ state variables
**Mitigation:** Can refactor to useReducer in 30 minutes if needed

### Decision 3: fluent-ffmpeg vs Direct FFmpeg CLI

**Options Considered:**
- fluent-ffmpeg (archived but works)
- Direct `child_process.spawn` with FFmpeg CLI
- FFmpeg.wasm (browser-based, 2GB file size limit)

**Choice:** fluent-ffmpeg

**Rationale:**
- Simpler API than raw CLI commands
- Error handling built-in
- Progress events available
- Used by thousands of production apps
- Archive status doesn't matter (FFmpeg CLI is stable)

**Risk:** Library is no longer maintained
**Mitigation:** FFmpeg itself is stable, can migrate to CLI if needed

### Decision 4: Railway.app vs Other Hosting

**Options Considered:**
- Railway.app (free tier: 500 hours/month)
- Render.com (free tier: slow cold starts)
- Fly.io (more complex setup)
- DigitalOcean ($6/month, no free tier)

**Choice:** Railway.app for MVP

**Rationale:**
- Easiest deployment (git push to deploy)
- Generous free tier for testing
- Includes FFmpeg in container
- Can upgrade to paid later
- Good for rapid iteration

**Risk:** Free tier limitations
**Mitigation:** Monitor usage, upgrade to $5/month plan if needed

### Decision 5: Store Positions as Percentages

**Options Considered:**
- Absolute pixels (x: 640, y: 360)
- Percentages (x: 50, y: 40)

**Choice:** Percentages (0-100 for both x and y)

**Rationale:**
- Works with any video resolution
- Same calculation for CSS and FFmpeg
- User-friendly (50% = center)
- No need to store video dimensions

**Conversion:**
```typescript
// CSS
style={{ left: `${x}%`, top: `${y}%` }}

// FFmpeg
x=(w*${x}/100)-text_w/2:y=(h*${y}/100)
```

---

## Critical Path Dependencies

### What MUST Be Done Before Implementation

1. **Supabase Table Created**
   - Can't save projects without database table
   - Must include RLS policies for security
   - Estimated time: 30 minutes

2. **Storage Bucket Permissions**
   - Must allow authenticated users to upload to `videos` bucket
   - Might already exist from BETTY feature
   - Estimated time: 15 minutes

3. **Font Files Downloaded**
   - Server needs TTF files to render text
   - Download from Google Fonts (OFL license)
   - 5 fonts × 2 files (regular + bold) = 10 files
   - Estimated time: 20 minutes

4. **Environment Variables Set**
   - Frontend: `VITE_RENDER_API_URL`
   - Backend: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `FRONTEND_URL`
   - Estimated time: 10 minutes

5. **FFmpeg Installed on Server**
   - Railway.app: Include in Dockerfile
   - Local: `brew install ffmpeg` or `apt-get install ffmpeg`
   - Estimated time: 10 minutes (automated in deploy)

**Total Setup Time:** ~90 minutes

### What Can Be Done in Parallel

**Frontend Team:**
- Copy VideoUploader component
- Create TextEditorPage skeleton
- Build VideoPreview component
- Build Timeline component
- Build PropertiesPanel component

**Backend Team:**
- Download font files
- Set up Express server
- Implement FFmpeg filter builder
- Create render endpoint
- Deploy to Railway

**Estimated Parallel Time Savings:** 4-6 hours (if 2 people working)

---

## Risk Mitigation Strategies

### Risk 1: FFmpeg Text Escaping Breaks Render

**Symptoms:** Special characters (:', \n, []) cause FFmpeg errors

**Solution:** Comprehensive escape function
```typescript
const escapeForFFmpeg = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\\\\\')    // Backslashes first
    .replace(/'/g, "'\\''")          // Single quotes
    .replace(/:/g, '\\:')            // Colons
    .replace(/\n/g, '\\n')           // Newlines
    .replace(/\[/g, '\\[')           // Brackets
    .replace(/\]/g, '\\]');
};
```

**Testing:** Include in Level 3 edge case tests

### Risk 2: Large Video Files Timeout

**Symptoms:** 500MB video takes 5+ minutes to render

**Solutions:**
1. Set render timeout to 10 minutes (not 30 seconds)
2. Add progress polling (show "Rendering... this may take several minutes")
3. Recommend users compress videos before upload

**Code:**
```javascript
// Server
app.post('/api/render', timeout('10m'), async (req, res) => { ... });

// Client
const pollRenderStatus = async (projectId) => {
  for (let i = 0; i < 60; i++) {  // 10 minutes max
    await sleep(10000);  // Check every 10 seconds
    const status = await checkStatus(projectId);
    if (status === 'completed') return;
  }
  throw new Error('Render timeout');
};
```

### Risk 3: CSS Preview Doesn't Match FFmpeg Output

**Symptoms:** Text appears differently in preview vs rendered video

**Cause:** Font rendering differences between browser and FFmpeg

**Mitigation:**
1. Use exact same TTF files in both
2. Document that preview is "approximate"
3. Add "Preview may differ slightly" warning
4. Test with all 5 fonts to verify

**Future Enhancement:** Load TTF in browser with `@font-face` for exact match

### Risk 4: Free Tier Hosting Runs Out

**Symptoms:** Railway.app shows "500 hours exceeded"

**Monitoring:**
```javascript
// Log render times
console.log(`Render took ${renderTime}ms for ${projectId}`);

// Calculate monthly usage
// If avg render = 30s, 500 hours = 60,000 renders/month
```

**Solutions:**
1. Monitor usage dashboard
2. Upgrade to $5/month plan if needed
3. Add rate limiting (10 renders per user per hour)

### Risk 5: Overlapping Segments Cause Issues

**Symptoms:** Multiple texts show at same time, hard to read

**Solution:** Allow overlaps (users may want this), but warn in UI
```tsx
{segments.some(s1 => segments.some(s2 =>
  s1.id !== s2.id && timesOverlap(s1, s2)
)) && (
  <Warning>Multiple text segments will display simultaneously</Warning>
)}
```

**Alternative:** Auto-adjust segments to not overlap (more complex, defer to v2)

---

## Performance Targets & Benchmarks

### Frontend Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial page load | < 2s | Lighthouse |
| Video upload start | < 500ms | Time to first progress update |
| Text overlay update | < 100ms | Time from input change to preview |
| Timeline seek | < 50ms | Video currentTime update |
| Auto-save debounce | 2s | After last edit |

### Backend Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Render API response time | < 1s | POST /api/render to task queued |
| Render time (60s video, 5 segments) | < 30s | FFmpeg completion time |
| Render time (3min video, 10 segments) | < 90s | FFmpeg completion time |
| Upload to Supabase | < 10s | For 100MB file |

### Scalability Assumptions

**MVP Can Handle:**
- 10 concurrent users
- 100 renders per day
- 50 GB storage (videos + rendered output)

**When to Scale:**
- > 50 concurrent users → Add render queue
- > 500 renders per day → Multiple render servers
- > 500 GB storage → Add cleanup job (delete old videos)

---

## Success Criteria (What "Done" Looks Like)

### User Acceptance

**A user should be able to:**
1. Sign in to MAXAI
2. Navigate to TYLER feature
3. Upload a 60-second vertical video
4. Add 3 text segments with different messages
5. Customize font, color, size, and position
6. Preview the video with text overlays
7. Export and download the rendered video
8. See the text burned into the final MP4

**Total time:** < 15 minutes for first-time user

### Technical Acceptance

**Code Quality:**
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] All functions have JSDoc comments
- [ ] Consistent naming conventions

**Functionality:**
- [ ] All Priority 1 features working
- [ ] Error handling on all API calls
- [ ] Loading states for all async operations
- [ ] User feedback via toasts

**Performance:**
- [ ] Preview updates in < 100ms
- [ ] Render completes in < 60s for typical video
- [ ] No console errors during normal usage

**Security:**
- [ ] RLS policies prevent unauthorized access
- [ ] Text content sanitized before FFmpeg
- [ ] File upload validated (size, type)
- [ ] CORS configured correctly

**Deployment:**
- [ ] Frontend accessible at production URL
- [ ] Backend accessible and healthy
- [ ] Environment variables configured
- [ ] FFmpeg working on server

---

## Lessons Learned & Recommendations

### Do This (Fast Path)

1. **Audit existing codebase FIRST** - BETTY feature saved 8-10 hours of work
2. **Copy working code** - Don't rebuild what exists and works
3. **Use native APIs** - HTML5 > heavyweight libraries for simple features
4. **Deploy early** - Railway.app in 10 minutes beats fighting Docker locally
5. **Simple state** - useState is fine, upgrade only if needed
6. **Defer polish** - Shadows and backgrounds are v2, ship MVP fast

### Don't Do This (Slow Path)

1. **Don't learn new libraries** - @xzdarcy/react-timeline-editor would cost 6+ hours
2. **Don't over-engineer state** - Redux for single page is overkill
3. **Don't perfect the database** - Extra columns can be added later
4. **Don't build features "in case"** - YAGNI (You Ain't Gonna Need It)
5. **Don't optimize prematurely** - Ship first, measure, then optimize
6. **Don't skip existing patterns** - Toast, Auth, Theme contexts already work

### Biggest Time Savers

1. **Reusing BETTY's Supabase integration** - 6 hours saved
2. **Copying VideoUploader component** - 3 hours saved
3. **Using native HTML5 video** - 2 hours saved
4. **Building simple timeline** - 4 hours saved vs learning library
5. **Railway.app deployment** - 2 hours saved vs Docker setup

**Total Time Saved:** ~17 hours (2+ days of work)

### Biggest Risks

1. **FFmpeg text escaping** - Special characters can break render
2. **Preview vs output mismatch** - Font rendering differences
3. **Large file timeouts** - Need generous timeout settings
4. **Free tier limits** - Monitor usage early

---

## Appendix: Quick Reference

### File Paths for Copy-Paste

```bash
# Components to copy
src/components/betty/VideoUploader.tsx → src/components/texteditor/VideoUploader.tsx

# Services to reference
src/services/betty/index.ts (Supabase patterns)
src/services/supabase/client.ts (Supabase client)

# Hooks to reference
src/hooks/useVideoProcessing.ts (custom hook pattern)

# Contexts to use
src/context/AuthContext.tsx (user auth)
src/context/ToastContext.tsx (notifications)
src/context/ThemeContext.tsx (dark mode)

# Config files
vite.config.ts (path aliases)
tailwind.config.js (theme colors)
```

### Environment Variables Checklist

**Frontend (.env):**
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
VITE_RENDER_API_URL=https://your-app.railway.app
```

**Backend (.env):**
```bash
PORT=3001
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...
FRONTEND_URL=https://maxai.yourdomain.com
FONTS_DIR=/app/fonts
TEMP_DIR=/tmp
```

### Dependencies to Install

**Frontend (already has most):**
```bash
# Check if needed:
npm list react-query @supabase/supabase-js react-dropzone

# If missing, install:
npm install react-query @supabase/supabase-js react-dropzone
```

**Backend (new project):**
```bash
npm init -y
npm install express fluent-ffmpeg @supabase/supabase-js cors dotenv
npm install -D @types/node @types/express
```

### Fonts to Download

**Google Fonts (OFL License):**
1. Roboto (regular, bold)
2. Open Sans (regular, bold)
3. Montserrat (regular, bold)
4. Poppins (regular, bold)
5. Bebas Neue (regular only)

**Download URL:** https://fonts.google.com/

**Save to:** `server/fonts/` directory

---

## Final Recommendation

**Proceed with rapid development approach as outlined in PRP.**

**Rationale:**
- 40-50% of code can be directly reused from BETTY
- Native APIs eliminate 6+ hours of library learning
- Simple architecture = faster iteration
- 3-5 day timeline is achievable with focused effort
- MVP scope is well-defined and minimal

**Next Steps:**
1. Create Supabase table and RLS policies
2. Copy VideoUploader component
3. Download font files
4. Start server implementation
5. Build editor UI in parallel
6. Integrate and test
7. Deploy and validate

**Estimated Effort:** 24-32 hours (3-5 days at 6-8 hours/day)

**High Confidence:** Existing patterns reduce risk significantly.
