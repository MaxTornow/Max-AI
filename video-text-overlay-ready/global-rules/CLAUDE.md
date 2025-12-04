# Video Text Overlay Editor (TYLER) - Global Rules

This file provides guidance to Claude Code when implementing the Video Text Overlay Editor feature for MAXAI.

---

## Environment

**Platform:** macOS
**Node.js Version:** 20.x LTS
**Python Command:** Use `python3` for any Python operations (NOT `python`)

---

## Project Context

**Project:** Video Text Overlay Editor (TYLER - Text You Layer, Edit & Render)
**Purpose:** Add a feature to MAXAI for overlaying custom text on vertical B-roll videos with full control over timing, positioning, font, color, and styling.

**Integration Points:**
- Existing MAXAI React frontend
- Supabase authentication and storage
- New Node.js render server with FFmpeg

---

## Tech Stack

### Frontend (Existing MAXAI)
- React 18.2.0
- TypeScript 5.2.2
- Vite 6.3.5
- Tailwind CSS 3.3.3
- React Query 3.39.3
- @supabase/supabase-js 2.38.0

### Frontend (New Dependencies)
- @xzdarcy/react-timeline-editor ^0.1.9 OR @dnd-kit/core ^6.0.0

### Backend (New Render Server)
- Node.js 20.x LTS
- Express 4.18.x
- fluent-ffmpeg 2.1.x
- FFmpeg 6.x (system binary)

---

## Archon MCP Integration

### Task Management
Use Archon MCP for tracking implementation tasks:

```typescript
// List current tasks
mcp__archon__find_tasks()

// Update task status when starting work
mcp__archon__manage_task("update", task_id="...", status="doing")

// Create new tasks as discovered
mcp__archon__manage_task("create", project_id="...", title="...")
```

### Research & Documentation
Before implementing, search documentation:

```typescript
// Search for FFmpeg patterns (keep queries 2-5 keywords)
mcp__archon__rag_search_knowledge_base(
  query="ffmpeg drawtext filter",
  match_count=5
)

// Find React timeline examples
mcp__archon__rag_search_code_examples(
  query="react timeline editor",
  match_count=3
)

// Search Supabase storage patterns
mcp__archon__rag_search_knowledge_base(
  query="supabase storage upload",
  match_count=5
)
```

**Query Guidelines:**
- Keep queries SHORT and FOCUSED (2-5 keywords)
- Good: `"ffmpeg drawtext"`, `"react drag drop"`, `"supabase signed url"`
- Bad: `"how to implement ffmpeg drawtext filter with multiple text overlays and timing controls"`

---

## TypeScript Best Practices

### Type Safety
- Enable strict mode in tsconfig.json
- Avoid `any` types - use `unknown` and type guards
- Use proper typing for all function parameters and returns
- Define interfaces for all data structures

### Component Patterns
```typescript
// Prefer interface over type for component props
interface TimelineProps {
  duration: number;
  segments: TextSegment[];
  onSegmentUpdate: (id: string, updates: Partial<TextSegment>) => void;
}

// Use explicit return types
const Timeline: React.FC<TimelineProps> = ({ duration, segments, onSegmentUpdate }) => {
  // ...
};
```

### State Management
```typescript
// Use useReducer for complex state
interface EditorState {
  segments: TextSegment[];
  selectedSegmentId: string | null;
  currentTime: number;
  isPlaying: boolean;
}

type EditorAction =
  | { type: 'ADD_SEGMENT'; payload: TextSegment }
  | { type: 'UPDATE_SEGMENT'; payload: { id: string; updates: Partial<TextSegment> } }
  | { type: 'SELECT_SEGMENT'; payload: string | null }
  | { type: 'SET_TIME'; payload: number };
```

### Error Handling
```typescript
// Use try-catch with proper error typing
try {
  const result = await uploadVideo(file);
  return result;
} catch (error) {
  if (error instanceof Error) {
    console.error('Upload failed:', error.message);
    throw new Error(`Upload failed: ${error.message}`);
  }
  throw error;
}
```

---

## React Patterns for This Project

### Custom Hooks
Create hooks for complex logic:

```typescript
// useTextEditor - main editor state
// useVideoPlayer - playback controls
// useTimeline - timeline interactions
// useProject - save/load operations
```

### Component Structure
```
src/components/texteditor/
├── index.ts                  # Barrel exports
├── VideoUploader.tsx         # Drag-drop video upload
├── VideoPreview.tsx          # Video player + overlays
├── TextOverlayLayer.tsx      # Single text overlay
├── Timeline.tsx              # Timeline container
├── TimelineSegment.tsx       # Draggable segment
├── TextPropertiesPanel.tsx   # Properties sidebar
└── RenderButton.tsx          # Export + progress
```

### Ref Management for Video
```typescript
const videoRef = useRef<HTMLVideoElement>(null);

// Sync video time with state
useEffect(() => {
  if (videoRef.current && !isPlaying) {
    videoRef.current.currentTime = currentTime;
  }
}, [currentTime, isPlaying]);
```

---

## FFmpeg Implementation Patterns

### Text Escaping
```typescript
const escapeTextForFFmpeg = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\\\\\')
    .replace(/'/g, "'\\''")
    .replace(/:/g, '\\:')
    .replace(/\n/g, '\\n')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
};
```

### Position Expressions
```typescript
// CSS percentages to FFmpeg expressions
const xExpr = `(w*${position.x}/100)-text_w/2`;  // Center horizontally
const yExpr = `(h*${position.y}/100)`;           // Top of text at percentage
```

### Timing Control
```typescript
// Enable text only during specified time range
const enableExpr = `enable='between(t,${startTime},${endTime})'`;
```

### Full Filter Builder
```typescript
function buildDrawtextFilter(segments: TextSegment[], fontsDir: string): string {
  return segments.map(segment => {
    const options = [
      `text='${escapeTextForFFmpeg(segment.text)}'`,
      `x=(w*${segment.position.x}/100)-text_w/2`,
      `y=(h*${segment.position.y}/100)`,
      `fontsize=${segment.fontSize}`,
      `fontcolor=${segment.color}`,
      `fontfile=${fontsDir}/${getFontFile(segment.fontFamily, segment.fontWeight)}`,
      `enable='between(t,${segment.startTime},${segment.endTime})'`,
    ];

    if (segment.shadow) {
      options.push('shadowcolor=black', 'shadowx=2', 'shadowy=2');
    }

    return `drawtext=${options.join(':')}`;
  }).join(',');
}
```

---

## Supabase Patterns

### Storage Upload
```typescript
const uploadVideo = async (file: File, userId: string): Promise<string> => {
  const path = `${userId}/${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from('videos')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;
  return path;
};
```

### Signed URLs
```typescript
// For Submagic processing (24 hours)
const { data } = await supabase.storage
  .from('videos')
  .createSignedUrl(path, 86400);

// For user download (1 hour)
const { data } = await supabase.storage
  .from('videos')
  .createSignedUrl(path, 3600);
```

### Row Level Security
Always ensure RLS policies match this pattern:
```sql
-- Users can only access their own records
CREATE POLICY "Users can view own projects"
  ON text_overlay_projects FOR SELECT
  USING (auth.uid() = user_id);
```

---

## Testing Strategy

### Unit Tests (Jest)
- `buildDrawtextFilter` - correct filter string generation
- `escapeTextForFFmpeg` - special character handling
- `formatTime` - time formatting utility
- Component snapshots

### Integration Tests
- Video upload flow
- Segment CRUD operations
- Project save/load
- Render API communication

### Manual Testing Checklist
- Various video formats (MP4, MOV, WebM)
- Large files (100MB+)
- Multi-line text with special characters
- Extreme font sizes and positions
- Rapid segment selection
- Browser back/forward during edit

---

## Security Considerations

### Input Validation
1. **Video files:** Validate MIME type, max 500MB
2. **Text content:** Escape for FFmpeg before processing
3. **Segment data:** Validate numeric ranges (0-100 for positions)
4. **Project IDs:** Verify user ownership before operations

### API Security
1. **CORS:** Only allow MAXAI frontend origin
2. **Rate limiting:** Max 10 renders per user per hour
3. **Timeouts:** Kill FFmpeg after 5 minutes
4. **Cleanup:** Delete temp files after processing

---

## File Naming Conventions

### Components
- PascalCase: `VideoPreview.tsx`, `TimelineSegment.tsx`
- Index barrel: `index.ts` for exports

### Services
- camelCase: `projectService.ts`, `renderService.ts`
- Types separate: `types.ts`

### Hooks
- camelCase with `use` prefix: `useTextEditor.ts`, `useVideoPlayer.ts`

---

## Common Gotchas

### Font Rendering
CSS fonts and FFmpeg fonts may render slightly differently. Document as "approximate preview."

### Video Time Sync
Use `requestAnimationFrame` for smooth playhead updates:
```typescript
const updatePlayhead = useCallback(() => {
  if (videoRef.current && isPlaying) {
    setCurrentTime(videoRef.current.currentTime);
    rafRef.current = requestAnimationFrame(updatePlayhead);
  }
}, [isPlaying]);
```

### Large File Uploads
Use chunked uploads or resumable uploads for large videos:
```typescript
// Consider using tus-js-client for resumable uploads
```

### Position Mapping
Store as percentages (0-100), convert for CSS (`%`) and FFmpeg expressions at render time.

---

## Development Commands

```bash
# Frontend development
npm run dev

# Run tests
npm run test

# Lint check
npm run lint

# Build
npm run build

# Render server (in server/ directory)
cd server && npm run dev
```

---

## Environment Variables

### Frontend (.env)
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_RENDER_API_URL=https://your-render-server.railway.app
```

### Render Server (.env)
```bash
PORT=3001
NODE_ENV=production
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
FONTS_DIR=/app/fonts
TEMP_DIR=/tmp
RENDER_TIMEOUT=300
```

---

## Quality Standards

### Code Review Checklist
- [ ] TypeScript strict mode compliant
- [ ] No `any` types
- [ ] Error handling complete
- [ ] Loading states implemented
- [ ] Edge cases handled
- [ ] Tests added for new code
- [ ] Security considerations addressed

### Performance Targets
- Render time: <30s for 60s video with 5 segments
- Preview latency: <100ms for property changes
- Upload success rate: >99%
- Export success rate: >95%

---

**Remember:** This is a feature addition to an existing MAXAI codebase. Follow existing patterns, reuse components where possible, and ensure consistency with the current application style.
