# Remotion Packages Inventory

## Overview

Remotion has an extensive ecosystem of 29+ packages that provide modular functionality for video creation. This inventory covers all official `@remotion/*` packages.

---

## Core Packages

### @remotion/core
- **Purpose**: Core React components and hooks for video composition
- **Key Features**: `<Composition>`, `<Sequence>`, `useCurrentFrame()`, `useVideoConfig()`
- **Required**: Yes (foundation of all Remotion projects)

### @remotion/cli
- **Purpose**: Command-line interface for rendering and previewing
- **Commands**: `npx remotion preview`, `npx remotion render`, `npx remotion lambda`
- **Required**: Yes (for local development and rendering)

### @remotion/bundler
- **Purpose**: Webpack bundler for Remotion projects
- **Use Case**: Custom build configurations, SSR setup
- **Required**: Usually (handled automatically by CLI)

### @remotion/player
- **Purpose**: React component for embedding Remotion videos in web apps
- **Key Features**: Play/pause controls, seeking, responsive sizing
- **Use Case**: Real-time preview in browser, interactive video players
- **Required**: For browser-based editors - YES

### @remotion/renderer
- **Purpose**: Node.js API for programmatic video rendering
- **Key Features**: `renderMedia()`, `renderFrames()`, `renderStill()`
- **Use Case**: Server-side rendering, batch processing
- **Required**: For server rendering - YES

---

## Cloud Rendering

### @remotion/lambda
- **Purpose**: Serverless rendering on AWS Lambda
- **Key Features**: Parallel chunk rendering, S3 storage integration
- **Cost**: ~$0.05-0.10 per minute of video
- **Scalability**: Unlimited concurrent renders
- **Required**: For serverless deployment - Recommended

### @remotion/cloudrun
- **Purpose**: Serverless rendering on Google Cloud Run
- **Key Features**: Similar to Lambda but on GCP
- **Use Case**: GCP-native infrastructure
- **Required**: Alternative to Lambda

---

## Media Processing

### @remotion/media-utils
- **Purpose**: Utilities for handling media files
- **Key Features**: `getVideoMetadata()`, `getAudioDuration()`, volume helpers
- **Use Case**: Analyzing uploaded media, setting composition duration
- **Required**: Highly recommended

### @remotion/gif
- **Purpose**: GIF support in Remotion compositions
- **Key Features**: `<Gif>` component with frame-by-frame control
- **Use Case**: Adding GIF animations to videos

### @remotion/lottie
- **Purpose**: Lottie animation support
- **Key Features**: `<Lottie>` component for After Effects animations
- **Use Case**: Professional motion graphics

### @remotion/three
- **Purpose**: Three.js integration for 3D graphics
- **Key Features**: 3D scenes rendered to video frames
- **Use Case**: 3D animations, product showcases

### @remotion/noise
- **Purpose**: Perlin noise generation
- **Key Features**: Procedural animation patterns
- **Use Case**: Organic motion, generative art

### @remotion/paths
- **Purpose**: SVG path manipulation
- **Key Features**: Path interpolation, morphing animations
- **Use Case**: Logo animations, shape transitions

### @remotion/shapes
- **Purpose**: Geometric shape primitives
- **Key Features**: Circle, Rectangle, Triangle, Polygon components
- **Use Case**: Motion graphics, infographics

---

## Audio & Captions

### @remotion/captions
- **Purpose**: Caption/subtitle rendering
- **Key Features**: Word-by-word timing, styling, animations
- **Use Case**: Animated subtitles like Submagic
- **Required**: For caption features - YES

### @remotion/openai-whisper
- **Purpose**: OpenAI Whisper transcription integration
- **Key Features**: Automatic speech-to-text with timestamps
- **Use Case**: Auto-generating captions from audio
- **Required**: For AI transcription - YES

### @remotion/install-whisper-cpp
- **Purpose**: Local Whisper.cpp installation helper
- **Key Features**: Offline transcription capability
- **Use Case**: Privacy-focused transcription, cost savings

---

## Transitions & Effects

### @remotion/transitions
- **Purpose**: Pre-built transition effects
- **Key Features**: Fade, slide, wipe, zoom transitions
- **Use Case**: Professional scene transitions
- **Required**: Highly recommended for polish

### @remotion/animation-utils
- **Purpose**: Animation helper functions
- **Key Features**: Easing, interpolation, spring physics
- **Use Case**: Smooth animations

### @remotion/motion-blur
- **Purpose**: Motion blur effect
- **Key Features**: Realistic motion blur on moving elements
- **Use Case**: Cinematic quality

---

## Text & Typography

### @remotion/google-fonts
- **Purpose**: Easy Google Fonts integration
- **Key Features**: All Google Fonts available, auto-loading
- **Use Case**: Typography variety
- **Required**: Recommended

### @remotion/enable-scss
- **Purpose**: SCSS support
- **Key Features**: Sass styling in Remotion projects
- **Use Case**: Complex styling needs

### @remotion/tailwind
- **Purpose**: Tailwind CSS integration
- **Key Features**: Utility-first styling
- **Use Case**: Rapid UI development

---

## Development Tools

### @remotion/eslint-config
- **Purpose**: ESLint configuration for Remotion
- **Key Features**: Best practices enforcement
- **Use Case**: Code quality

### @remotion/eslint-plugin
- **Purpose**: Remotion-specific ESLint rules
- **Key Features**: Catches common mistakes
- **Use Case**: Error prevention

### @remotion/studio
- **Purpose**: Development studio UI
- **Key Features**: Visual preview, props editor, timeline
- **Use Case**: Local development
- **Required**: Yes (for development)

---

## Specialized

### @remotion/rive
- **Purpose**: Rive animation support
- **Key Features**: Interactive animations from Rive
- **Use Case**: Complex interactive animations

### @remotion/skia
- **Purpose**: Skia graphics library integration
- **Key Features**: High-performance 2D graphics
- **Use Case**: Custom graphics rendering

### @remotion/layout-utils
- **Purpose**: Layout calculation utilities
- **Key Features**: Text fitting, element positioning
- **Use Case**: Dynamic layouts

### @remotion/preload
- **Purpose**: Asset preloading utilities
- **Key Features**: Preload videos, images, fonts
- **Use Case**: Smooth playback

### @remotion/zod-types
- **Purpose**: Zod schema types for Remotion
- **Key Features**: Type-safe props validation
- **Use Case**: Input validation

---

## Package Selection for Submagic Clone

### Essential (Must Have)
1. `@remotion/core` - Foundation
2. `@remotion/cli` - Development & rendering
3. `@remotion/player` - Browser preview
4. `@remotion/renderer` - Server rendering
5. `@remotion/captions` - Animated subtitles
6. `@remotion/openai-whisper` - AI transcription
7. `@remotion/media-utils` - Media handling

### Recommended
1. `@remotion/lambda` - Scalable rendering
2. `@remotion/transitions` - Professional transitions
3. `@remotion/google-fonts` - Typography
4. `@remotion/animation-utils` - Smooth animations

### Nice to Have
1. `@remotion/lottie` - Motion graphics
2. `@remotion/gif` - GIF support
3. `@remotion/motion-blur` - Cinematic effects

---

## Installation Example

```bash
# Core packages
npm install @remotion/core @remotion/cli @remotion/player @remotion/renderer

# Caption/Transcription
npm install @remotion/captions @remotion/openai-whisper

# Media utilities
npm install @remotion/media-utils @remotion/transitions

# Optional enhancements
npm install @remotion/google-fonts @remotion/animation-utils @remotion/lottie
```

---

## Version Compatibility

- Current stable: v4.x (as of 2025)
- All `@remotion/*` packages should use matching versions
- Breaking changes between major versions
- LTS support available for enterprise customers

---

*Research compiled December 2025*
