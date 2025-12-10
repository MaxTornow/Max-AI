# Remotion Technical Architecture

## Overview

Remotion uses a unique architecture that combines React's declarative UI model with a headless Chrome/FFmpeg rendering pipeline. Understanding this architecture is essential for building and optimizing a Submagic clone.

---

## Core Architecture

### The Rendering Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                     REMOTION ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   React Components ──► Puppeteer/Chrome ──► FFmpeg ──► MP4      │
│                                                                  │
│   1. Define video     2. Screenshot        3. Encode    4. Output│
│      as React            each frame           frames             │
│      components                               to video           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Step-by-Step Flow

1. **Composition Definition**
   - Video defined as React components
   - Each frame is a pure function of time
   - `useCurrentFrame()` provides frame number

2. **Frame Rendering**
   - Puppeteer opens headless Chrome
   - React app renders to specific frame
   - Chrome screenshots the DOM/Canvas

3. **Video Encoding**
   - FFmpeg receives frame images
   - Encodes to target codec (H.264, VP9, etc.)
   - Handles audio multiplexing

4. **Output**
   - Final MP4/WebM file
   - Optional: Upload to S3/CDN

---

## Component Model

### Composition Structure

```tsx
// Root composition
<Composition
  id="MyVideo"
  component={MyVideoComponent}
  durationInFrames={300}  // 10 seconds at 30fps
  fps={30}
  width={1920}
  height={1080}
/>

// Video component
const MyVideoComponent = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  return (
    <AbsoluteFill>
      <Text frame={frame} />
      <BackgroundVideo />
    </AbsoluteFill>
  );
};
```

### Key Concepts

**AbsoluteFill**: Full-frame container with absolute positioning
**Sequence**: Time-based child visibility
**useCurrentFrame()**: Current frame number (0-indexed)
**useVideoConfig()**: Video settings (fps, dimensions)
**interpolate()**: Map frame ranges to values

---

## Rendering Modes

### 1. Local Rendering (Node.js)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Node.js    │────►│   Puppeteer  │────►│    FFmpeg    │
│   Process    │     │   (Chrome)   │     │   Encoder    │
└──────────────┘     └──────────────┘     └──────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
   renderMedia()      Screenshots (PNG)      Output (MP4)
```

**Pros:**
- Full control
- No cloud dependency
- Predictable costs

**Cons:**
- Limited by server resources
- Sequential processing
- Must manage infrastructure

### 2. Lambda Rendering (Serverless)

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS Lambda Architecture                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐     │
│  │ Chunk 1 │   │ Chunk 2 │   │ Chunk 3 │   │ Chunk 4 │     │
│  │ Lambda  │   │ Lambda  │   │ Lambda  │   │ Lambda  │     │
│  └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘     │
│       │             │             │             │           │
│       ▼             ▼             ▼             ▼           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              S3 Bucket (Partial Videos)              │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         ▼                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Concatenation Lambda (Final Video)          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Pros:**
- Massively parallel (render 5-min video in ~30 seconds)
- Auto-scaling
- Pay per use

**Cons:**
- AWS setup complexity
- Cold start latency
- Costs can spike with volume

### 3. Browser Rendering (Coming Late 2025)

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Rendering (Future)                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │
│  │   React     │──►│   Canvas    │──►│  WebCodecs  │       │
│  │ Components  │   │  Recording  │   │   Encoder   │       │
│  └─────────────┘   └─────────────┘   └─────────────┘       │
│                                              │               │
│                                              ▼               │
│                                      ┌─────────────┐        │
│                                      │   MP4 File  │        │
│                                      │  (Browser)  │        │
│                                      └─────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Pros:**
- No server needed
- Instant exports
- Zero infrastructure cost

**Cons:**
- Browser compatibility (Chrome/Edge mainly)
- Not available yet
- May have quality limitations

---

## Performance Characteristics

### Rendering Speed Benchmarks

| Configuration | 1-min Video | 5-min Video |
|--------------|-------------|-------------|
| Local (4 core) | 2-3 min | 10-15 min |
| Local (8 core) | 1-2 min | 5-8 min |
| Lambda (parallel) | 20-30 sec | 30-60 sec |
| Lambda (4K) | 1-2 min | 3-5 min |

### Optimization Techniques

1. **Parallel Rendering**: Split video into chunks
2. **Asset Preloading**: Cache fonts, images
3. **Composition Optimization**: Minimize re-renders
4. **Resolution Matching**: Don't upscale unnecessarily

---

## Integration Points

### With Transcription (Whisper)

```tsx
// @remotion/openai-whisper integration
import { transcribe } from '@remotion/openai-whisper';

const transcript = await transcribe({
  audioUrl: 'video.mp4',
  model: 'whisper-1',
});

// Returns word-level timestamps
// { words: [{ word: "Hello", start: 0.5, end: 0.8 }, ...] }
```

### With Captions

```tsx
import { Caption, createCaptionsTrack } from '@remotion/captions';

const captions = createCaptionsTrack(transcript);

<Caption
  captions={captions}
  frame={frame}
  style="bounce"  // Animation style
  fontSize={60}
  color="white"
/>
```

### With External APIs

```tsx
// Fetch data during composition
const { data } = useFetch('api/video-data/' + videoId);

// Use in composition
<MyVideo data={data} />
```

---

## State Management

### For Editor Applications

```tsx
// Recommended: Zustand or Redux for editor state
const useEditorStore = create((set) => ({
  clips: [],
  selectedClip: null,
  playhead: 0,

  addClip: (clip) => set((s) => ({ clips: [...s.clips, clip] })),
  setPlayhead: (frame) => set({ playhead: frame }),
}));

// Remotion composition reads from store
const EditorComposition = () => {
  const clips = useEditorStore((s) => s.clips);
  return clips.map(clip => <ClipComponent key={clip.id} {...clip} />);
};
```

### Serialization for Rendering

```tsx
// Editor state → Remotion props
const serializeForRender = (editorState) => ({
  clips: editorState.clips.map(c => ({
    ...c,
    // Remove non-serializable data
    onSelect: undefined,
  })),
});

// Send to Lambda
await renderMediaOnLambda({
  inputProps: serializeForRender(editorState),
  composition: 'MainVideo',
});
```

---

## File Handling

### Video Upload Flow

```
User Upload ──► Temp Storage ──► Extract Metadata ──► Store in DB
                    │
                    ▼
              Generate Preview
              (Low-res version)
```

### Asset Management

```tsx
// Preload assets for smooth playback
import { preloadVideo, preloadAudio, preloadImage } from '@remotion/preload';

preloadVideo('https://cdn.example.com/video.mp4');
preloadAudio('https://cdn.example.com/audio.mp3');
```

---

## Error Handling

### Common Rendering Errors

1. **Chrome Crash**: Increase Lambda memory
2. **Timeout**: Reduce chunk size
3. **Asset Loading**: Use preloading
4. **Memory**: Optimize composition complexity

### Retry Strategy

```tsx
const renderWithRetry = async (params, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await renderMediaOnLambda(params);
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      await sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
};
```

---

## Security Considerations

### Asset Access
- Use signed URLs for private assets
- Implement authentication for API
- Validate user input

### Lambda Permissions
- Minimal IAM roles
- VPC isolation if needed
- Encrypt S3 buckets

---

## Key Takeaways

1. **React-Based**: Leverage React skills for video creation
2. **Flexible Rendering**: Local, Lambda, or (soon) browser
3. **Parallel Processing**: Lambda enables fast rendering
4. **Integration-Ready**: Works with Whisper, external APIs
5. **Scalable**: From hobby to enterprise workloads

---

*Research compiled December 2025*
