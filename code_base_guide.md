# MAXAI - Codebase Analysis & Developer Guide

**Generated**: December 12, 2025
**Location**: `/Users/dan/Documents/Max Tornow 2/AI INTERFACE`
**Purpose**: Complete reference guide for developers adding new features

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Features & AI Agents](#features--ai-agents)
6. [State Management](#state-management)
7. [Developer Quick Start](#developer-quick-start)
8. [Adding New Features - Step by Step](#adding-new-features---step-by-step)
9. [Code Patterns & Conventions](#code-patterns--conventions)
10. [Architecture Guidelines](#architecture-guidelines)
11. [Common Tasks & Recipes](#common-tasks--recipes)
12. [Debugging & Troubleshooting](#debugging--troubleshooting)
13. [File Reference](#file-reference)
14. [Environment Variables](#environment-variables)

---

## Project Overview

MAXAI is a comprehensive AI-powered content creation platform built with React, TypeScript, and Supabase. The application provides multiple AI agents specialized for different content creation tasks across various social media platforms, plus powerful video editing capabilities.

### Core Capabilities

1. **AI Content Assistants** - Multiple specialized agents for content creation and rewriting
2. **Video Processing** - Browser-based text overlay (Tyler) and cloud-based AI editing (Vince)
3. **Style Management** - Personalized writing voice profiles
4. **Multi-Platform Support** - LinkedIn, Facebook, TikTok, Instagram

### AI Agents
- **AVA** (Advanced Viral Automator) - Content ideation and script generation
- **VERA** (Viral Enhanced Rewrite Automator) - Analyze viral videos and create script variants
- **LARA** (LinkedIn Automated Rewriting Assistant) - Rewrite LinkedIn posts in personal style
- **LACY** (LinkedIn Automated Content for You) - Create original LinkedIn posts
- **Franck** (Facebook Relevant Automated Niche Content Kreator) - Create Facebook posts
- **Faris** (Facebook Automated Rewriting Intelligent Scholar) - Rewrite Facebook posts

### Video Tools
- **Tyler** (Text Your Layer Editor for Rendering) - Browser-based video text overlay using FFmpeg.wasm
- **Vince** (Vertical INstant Content Editor) - AI-powered video editing via Submagic API

---

## Technology Stack

### Core Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2.0 | Frontend framework |
| TypeScript | 5.2.2 | Type safety |
| Vite | 6.3.5 | Build tool & dev server |
| Tailwind CSS | 3.3.3 | Styling (with dark mode) |
| React Router | 6.16.0 | Client-side routing |
| React Query | 3.39.3 | Server state management |
| Supabase | 2.38.0 | Database, auth, storage |

### Video Processing
| Package | Version | Purpose |
|---------|---------|---------|
| @ffmpeg/ffmpeg | 0.12.15 | Browser-based video processing |
| @ffmpeg/core | 0.12.10 | FFmpeg WebAssembly core |
| @ffmpeg/util | 0.12.2 | FFmpeg utilities |

### UI & Utilities
| Package | Purpose |
|---------|---------|
| react-icons | Icon library (Feather, etc.) |
| react-markdown | Markdown rendering |
| react-dropzone | File upload handling |
| react-virtualized | Virtualized lists |
| date-fns | Date formatting |
| uuid | Unique ID generation |
| classnames | Conditional CSS classes |

### External Integrations
- **n8n**: Webhook-based AI agent orchestration
- **Supabase**: Authentication, PostgreSQL database, file storage
- **Submagic API**: AI video editing service (Vince)
- **FFmpeg CDN**: `unpkg.com/@ffmpeg/core@0.12.6/dist/esm` for WASM

---

## Project Structure

```
/AI INTERFACE
├── /src
│   ├── /assets              # Static files (images, logos)
│   ├── /components          # Reusable UI components
│   │   ├── /auth            # ProtectedRoute
│   │   ├── /layouts         # MainLayout (sidebar navigation)
│   │   ├── /styles          # Style management components
│   │   ├── /ui              # Toast, ConfirmationModal
│   │   ├── /tyler           # Video text overlay components (9 files)
│   │   │   ├── VideoUploader.tsx
│   │   │   ├── VideoPreview.tsx
│   │   │   ├── TextEditor.tsx
│   │   │   ├── ColorPicker.tsx
│   │   │   ├── FontPicker.tsx
│   │   │   ├── FontSizeSlider.tsx
│   │   │   ├── YPositionSlider.tsx
│   │   │   ├── AlignmentSelector.tsx
│   │   │   ├── ExportProgress.tsx
│   │   │   └── GlobalExportProgress.tsx
│   │   ├── /vince           # AI video editor components (7 files)
│   │   │   ├── VideoUploader.tsx
│   │   │   ├── TemplateSelector.tsx
│   │   │   ├── FeatureToggles.tsx
│   │   │   ├── ProcessingProgress.tsx
│   │   │   ├── VideoLibrary.tsx
│   │   │   ├── VideoCard.tsx
│   │   │   └── TabNav.tsx
│   │   └── /VideoProcessing  # Deprecated legacy components
│   ├── /context             # React Context providers
│   │   ├── AuthContext.tsx      # Supabase authentication
│   │   ├── ExportContext.tsx    # Global video export state (Tyler)
│   │   ├── StylesContext.tsx    # User writing styles
│   │   ├── ThemeContext.tsx     # Dark/light mode
│   │   └── ToastContext.tsx     # Toast notifications
│   ├── /hooks               # Custom React hooks
│   │   └── useVideoProcessing.ts
│   ├── /pages               # Page components (routes)
│   │   ├── /auth            # Login, Register, Password reset
│   │   ├── /ava             # AvaChat.tsx
│   │   ├── /lara            # LaraChat.tsx
│   │   ├── /lacy            # LacyChat.tsx
│   │   ├── /franck          # FranckChat.tsx
│   │   ├── /faris           # FarisChat.tsx
│   │   ├── /vera            # CreateRewrite.tsx
│   │   ├── /tyler           # SimpleTextOverlayPage.tsx
│   │   ├── /vince           # VincePage.tsx
│   │   ├── /styles          # MyStyles.tsx
│   │   ├── /rewrites        # AllRewrites.tsx
│   │   ├── /settings        # Settings.tsx
│   │   ├── /errors          # NotFound.tsx
│   │   └── Dashboard.tsx    # Feature hub landing page
│   ├── /services            # API and service integrations
│   │   ├── /ava             # AVA agent service
│   │   ├── /franck          # Facebook content creation
│   │   ├── /lacy            # LinkedIn content creation
│   │   ├── /lara            # LinkedIn rewriting
│   │   ├── /faris           # Facebook rewriting
│   │   ├── /rewrites        # Rewrite storage & retrieval
│   │   ├── /styles          # Style CRUD operations
│   │   ├── /tyler           # Video overlay processing
│   │   │   ├── ffmpegService.ts   # FFmpeg.wasm wrapper
│   │   │   ├── textUtils.ts       # Text rendering utilities
│   │   │   ├── videoStorage.ts    # IndexedDB persistence
│   │   │   ├── types.ts           # TypeScript interfaces
│   │   │   └── constants.ts       # Font definitions
│   │   ├── /vince           # Submagic API integration
│   │   │   ├── index.ts           # Main BETTY service
│   │   │   ├── templates.ts       # 8 Submagic templates
│   │   │   └── types.ts           # API interfaces
│   │   ├── /supabase        # Database client
│   │   │   └── client.ts
│   │   └── /videoProcessing # Legacy video processing
│   ├── /sql                 # SQL migration files
│   ├── /types               # TypeScript type definitions
│   │   └── supabase.ts      # Auto-generated Supabase types
│   ├── App.tsx              # Main app with routing
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── Configuration Files
│   ├── package.json         # Dependencies and scripts
│   ├── vite.config.ts       # Vite configuration
│   ├── tsconfig.json        # TypeScript configuration
│   ├── tailwind.config.js   # Tailwind CSS customization
│   ├── netlify.toml         # Deployment configuration
│   ├── .env.example         # Environment template
│   ├── .env.development     # Dev environment
│   └── .env.production      # Production environment
├── Documentation
│   ├── README.md            # Project overview
│   ├── CLAUDE.md            # AI assistant instructions
│   ├── PLANNING.md          # Architecture planning
│   ├── TASK.md              # Current tasks
│   └── code_base_guide.md   # This file
└── /PRPs                    # Product Requirement Prompts
    ├── /BRAINSTORMS         # Feature brainstorming docs
    └── /INITITIALS          # Initial requirement docs
```

---

## Database Schema

### Tables Overview

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | User profile data | theme, notifications, role |
| `styles` | Writing voice profiles | name, niche, communication_style |
| `rewrites` | Generated content variations | variations (JSONB), platform |
| `conversations` | Chat history (future) | agent_type, title |
| `messages` | Chat messages (future) | role, content, attachments |
| `videos` | Vince video processing | submagic_project_id, status |
| `invitations` | Admin invite system | email, role, status |

### Key Table: `styles`
```sql
CREATE TABLE styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  niche TEXT,
  target_audience TEXT,
  pain_points TEXT[],
  communication_style TEXT,
  hero_story TEXT
);
```

### Key Table: `videos` (Vince)
```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  duration_seconds NUMERIC,
  submagic_project_id TEXT,
  submagic_template TEXT,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  output_url TEXT,
  processing_params JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Row Level Security (RLS)
All tables have RLS enabled with policies ensuring users can only access their own data:
```sql
CREATE POLICY "Users can view own data"
  ON public.table_name
  FOR SELECT
  USING (auth.uid() = user_id);
```

### Storage Buckets
- **videos**: Max 2GB per file, format `{userId}/{timestamp}-{filename}`
- Signed URLs with 24-hour expiration for Submagic processing

---

## Features & AI Agents

### Routing Map

| Path | Component | Purpose | Auth |
|------|-----------|---------|------|
| `/` | Dashboard | Feature hub | Yes |
| `/login` | Login | Authentication | No |
| `/register` | Register | Account creation | No |
| `/forgot-password` | ForgotPassword | Password recovery | No |
| `/reset-password` | ResetPassword | Password reset | No |
| `/ava` | AvaChat | AI content ideation | Yes |
| `/lara` | LaraChat | LinkedIn rewriting | Yes |
| `/lacy` | LacyChat | LinkedIn creation | Yes |
| `/franck` | FranckChat | Facebook creation | Yes |
| `/faris` | FarisChat | Facebook rewriting | Yes |
| `/create-rewrite` | CreateRewrite | VERA video analysis | Yes |
| `/tyler` | SimpleTextOverlayPage | Video text overlay | Yes |
| `/vince` | VincePage | AI video editing | Yes |
| `/my-styles` | MyStyles | Style management | Yes |
| `/all-rewrites` | AllRewrites | Rewrite history | Yes |
| `/settings` | Settings | User settings | Yes |
| `/404` | NotFound | Error page | No |

### AI Agents Detail

#### AVA (Advanced Viral Automator) - `/ava`
- Conversational AI for content ideation
- Uses selected writing style profile
- Generates script variations for viral content
- Webhook: `VITE_AVA_WEBHOOK_URL`

#### LARA (LinkedIn Automated Rewriting Assistant) - `/lara`
- Rewrites LinkedIn posts in user's personal tone
- Style-aware content transformation
- Webhook: `VITE_LARA_WEBHOOK_URL`

#### LACY (LinkedIn Automated Content for You) - `/lacy`
- Creates original LinkedIn posts from scratch
- Tailored for coaching/service businesses
- Webhook: `VITE_LACY_WEBHOOK_URL`

#### FRANCK (Facebook Relevant Automated Niche Content Kreator) - `/franck`
- Creates original Facebook posts
- Niche and audience-specific content
- Webhook: `VITE_FRANCK_WEBHOOK_URL`

#### FARIS (Facebook Automated Rewriting Intelligent Scholar) - `/faris`
- Rewrites Facebook posts with personalized tone
- Maintains brand voice consistency
- Webhook: `VITE_FARIS_WEBHOOK_URL`

#### VERA (Viral Enhanced Rewrite Automator) - `/create-rewrite`
- Analyzes viral video scripts
- Generates customized variations
- Supports TikTok & Instagram platforms
- Stores variations in `rewrites` table

### Video Tools Detail

#### Tyler (Text Your Layer Editor for Rendering) - `/tyler`
Browser-based video text overlay using FFmpeg.wasm

**Features:**
- Font selection (Montserrat, and others)
- Font size: 20-120px
- Text color picker (any color)
- Y-position slider (0-100%)
- Text alignment (left/center/right)
- Real-time canvas preview
- Global export tracking (continue during navigation)
- Wake lock to prevent browser throttling
- State persistence (SessionStorage + IndexedDB)

**Component Hierarchy:**
```
SimpleTextOverlayPage
  ├── VideoUploader (file selection via react-dropzone)
  ├── VideoPreview (canvas-based preview)
  ├── TextEditor
  │   ├── TextInput
  │   ├── ColorPicker
  │   ├── FontPicker
  │   ├── FontSizeSlider
  │   ├── YPositionSlider
  │   └── AlignmentSelector
  ├── ExportProgress (local progress)
  └── GlobalExportProgress (floating, all pages)
```

#### Vince (Vertical INstant Content Editor) - `/vince`
AI-powered vertical video editing via Submagic API

**Features:**
- 8 Built-in Templates:
  1. Bold & Energetic (Hormozi 4)
  2. Clean Professional (Sara)
  3. Influencer Style (Iman)
  4. MrBeast Vibes (Beast)
  5. Minimal Modern (Daniel)
  6. Storyteller (Ella)
  7. Dark Mode (Leon)
  8. Coaching Style (Jason)

- Enhancement Options:
  - Magic Zooms (auto camera movement)
  - Magic B-rolls (background footage insertion)
  - Remove Silence (natural/fast/extra-fast pace)
  - Remove Bad Takes
  - Hook Title (AI-generated or custom)

- 12 Language Support: EN, ES, FR, DE, IT, PT, NL, PL, RU, JA, KO, ZH

**Component Hierarchy:**
```
VincePage
  ├── TabNav (Editor/Library toggle)
  ├── Editor Tab
  │   ├── VideoUploader
  │   ├── TemplateSelector
  │   ├── FeatureToggles
  │   └── ProcessingProgress
  └── Library Tab
      └── VideoLibrary
          └── VideoCard[] (download/delete)
```

**Processing States:**
`idle` → `uploading` → `uploaded` → `creating` → `processing` → `completed`/`error`

---

## State Management

### Context Provider Hierarchy (App.tsx)
```
QueryClientProvider (React Query)
  ↓
ThemeProvider (dark/light mode)
  ↓
AuthProvider (Supabase auth)
  ↓
StylesProvider (user writing styles)
  ↓
ToastProvider (notifications)
  ↓
ExportProvider (global video export - Tyler)
  ↓
AppContent + GlobalExportProgress
```

### Export Context (Critical for Tyler)
The ExportContext enables video exports to continue when navigating away from the Tyler page:

```typescript
interface ExportState {
  status: 'idle' | 'loading-ffmpeg' | 'processing' | 'completed' | 'error' | 'cancelled';
  ffmpegProgress: number;
  processingProgress: number;
  outputBlob: Blob | null;
  outputBlobUrl: string | null;
  error: string | null;
  videoFileName: string | null;
}

interface ExportContextType {
  state: ExportState;
  startExport: (file, settings, dimensions) => Promise<void>;
  cancelExport: () => void;
  clearExport: () => void;
  downloadResult: () => void;
  isExporting: boolean;
}
```

### State Persistence Strategies
| Type | Storage | Use Case |
|------|---------|----------|
| Session State | SessionStorage | Tyler video settings |
| Video Files | IndexedDB | Tyler input/output videos |
| User Preferences | localStorage | Theme preference |
| Server State | React Query | API data caching |
| Auth State | Supabase | User session |

---

## Developer Quick Start

### 1. Setup Development Environment

```bash
# Clone the repository
git clone [repository-url]
cd "AI INTERFACE"

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.development

# Configure environment variables (see Environment Variables section)

# Start development server
npm run dev
```

### 2. Available Scripts

```bash
npm run dev              # Start Vite dev server
npm run build            # Production build (via build.sh)
npm run build:original   # TypeScript + Vite build
npm run preview          # Preview production build
npm run lint             # Run ESLint
npm run test             # Run Jest tests
```

### 3. Understanding Code Flow

1. **Entry Point**: `main.tsx` → `App.tsx`
2. **Context Providers** wrap the entire app (see hierarchy above)
3. **Routing** handled in `App.tsx` with protected routes
4. **Pages** correspond to routes
5. **Services** handle external API calls and Supabase operations
6. **Components** are organized by feature (tyler/, vince/, styles/)

---

## Adding New Features - Step by Step

### 1. Adding a New AI Agent (e.g., "TARA" for Twitter)

#### Step 1: Create the Service Layer
Create `/src/services/tara/index.ts`:

```typescript
import { supabase } from '../supabase/client';
import type { User } from '@supabase/supabase-js';

export interface TaraMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface TaraResponse {
  output: string;
  conversation_id: string;
}

export const sendMessage = async (
  message: string,
  user: User | null,
  conversationId?: string,
  style?: any
): Promise<TaraResponse> => {
  if (!user) {
    throw new Error('Authentication required');
  }

  const webhookUrl = import.meta.env.VITE_TARA_WEBHOOK_URL;

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      userId: user.id,
      conversationId,
      style
    })
  });

  const data = await response.json();
  return {
    output: data.output || data.response || "Response from TARA",
    conversation_id: data.conversation_id || conversationId || crypto.randomUUID()
  };
};
```

#### Step 2: Create the Chat Page
Create `/src/pages/tara/TaraChat.tsx`:

```typescript
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStyles } from '../../context/StylesContext';
import { FiSend } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import { sendMessage, TaraMessage } from '../../services/tara';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const TaraChat: React.FC = () => {
  const { user } = useAuth();
  const { styles, selectedStyleId, setSelectedStyleId } = useStyles();
  const [messages, setMessages] = useState<TaraMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Implementation following AvaChat.tsx pattern

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Style selector */}
      {/* Message list */}
      {/* Input area */}
    </div>
  );
};

export default TaraChat;
```

#### Step 3: Add Route in App.tsx

```typescript
// Add import
import TaraChat from './pages/tara/TaraChat';

// Add route in the protected routes section
<Route path="tara" element={<TaraChat />} />
```

#### Step 4: Add Navigation in MainLayout.tsx

```typescript
// In the navigation items, add:
{
  name: 'TARA Chat',
  path: '/tara',
  icon: FiMessageSquare,
  description: 'Twitter content assistant'
}
```

#### Step 5: Add Environment Variable
Update `.env.example` and your `.env.development`:

```bash
VITE_TARA_WEBHOOK_URL=your_tara_webhook_url_here
```

### 2. Adding a New Video Processing Feature

#### For Browser-Based Processing (like Tyler)
1. Create service in `/src/services/newfeature/`
2. Use FFmpeg.wasm pattern from `/src/services/tyler/ffmpegService.ts`
3. Create components in `/src/components/newfeature/`
4. Add context if global state needed (like ExportContext)
5. Create page in `/src/pages/newfeature/`

#### For Cloud-Based Processing (like Vince)
1. Create service in `/src/services/newfeature/`
2. Follow Submagic pattern from `/src/services/vince/`
3. Add database table for tracking jobs
4. Implement polling for status updates
5. Create UI components and page

### 3. Adding a New Context Provider

Create `/src/context/NewFeatureContext.tsx`:

```typescript
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface NewFeatureState {
  // State shape
}

interface NewFeatureContextType {
  state: NewFeatureState;
  // Actions
}

const NewFeatureContext = createContext<NewFeatureContextType | undefined>(undefined);

export const NewFeatureProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<NewFeatureState>({});

  // Implement actions

  return (
    <NewFeatureContext.Provider value={{ state /* actions */ }}>
      {children}
    </NewFeatureContext.Provider>
  );
};

export const useNewFeature = (): NewFeatureContextType => {
  const context = useContext(NewFeatureContext);
  if (context === undefined) {
    throw new Error('useNewFeature must be used within NewFeatureProvider');
  }
  return context;
};
```

Add to App.tsx provider hierarchy.

---

## Code Patterns & Conventions

### 1. Component Structure

```typescript
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

interface ComponentProps {
  // Props interface
}

/**
 * Component description
 */
const ComponentName: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // 1. Hooks first
  const { user } = useAuth();

  // 2. State declarations
  const [state, setState] = useState();

  // 3. Effects
  useEffect(() => {
    // Effect logic
  }, [dependencies]);

  // 4. Handler functions
  const handleClick = () => {
    // Handler logic
  };

  // 5. Render helpers (optional)
  const renderSection = () => {
    return <div>Section</div>;
  };

  // 6. Main render
  return (
    <div className="...">
      {/* JSX content */}
    </div>
  );
};

export default ComponentName;
```

### 2. Service Pattern

```typescript
import { supabase } from '../supabase/client';
import type { User } from '@supabase/supabase-js';

// Types/Interfaces
export interface ServiceResponse {
  data: any;
  error?: string;
}

// Main service functions
export const fetchData = async (user: User | null): Promise<ServiceResponse> => {
  if (!user) {
    throw new Error('Authentication required');
  }

  try {
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;

    return { data };
  } catch (error) {
    console.error('Service error:', error);
    throw new Error('Failed to fetch data');
  }
};
```

### 3. Styling Conventions (Tailwind)

```typescript
// Use Tailwind classes with dark mode support
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md transition-colors">
    Click me
  </button>
</div>

// Common patterns:
// - Containers: "p-4 md:p-6 lg:p-8"
// - Cards: "bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4"
// - Buttons: "px-4 py-2 rounded-md transition-colors"
// - Text: "text-gray-900 dark:text-white"
// - Inputs: "border border-gray-300 dark:border-gray-600 rounded-md"
```

### 4. Error Handling Pattern

```typescript
try {
  setLoading(true);
  const result = await someAsyncOperation();
  setData(result);
} catch (error) {
  console.error('Descriptive error message:', error);
  setError(error instanceof Error ? error.message : 'An unexpected error occurred');

  // Show toast notification
  showToast({
    type: 'error',
    message: 'User-friendly error message'
  });
} finally {
  setLoading(false);
}
```

### 5. TypeScript Best Practices

```typescript
// Always define interfaces for props
interface Props {
  title: string;
  onSave: (data: FormData) => void;
  optional?: string;
}

// Use type for unions and simple types
type Status = 'idle' | 'loading' | 'success' | 'error';

// Use interfaces for objects
interface User {
  id: string;
  email: string;
  name?: string;
}

// Type guards for runtime checks
const isValidResponse = (response: unknown): response is ValidResponse => {
  return (
    typeof response === 'object' &&
    response !== null &&
    'data' in response
  );
};
```

---

## Architecture Guidelines

### 1. State Management Strategy

| Type | Solution | Use Case |
|------|----------|----------|
| Local State | `useState` | Component-specific state |
| Global UI State | Context API | Theme, auth, exports |
| Server State | React Query | API data with caching |
| Form State | Local `useState` | Form inputs |
| Persistent State | localStorage/IndexedDB | User preferences, video files |

### 2. Data Flow

```
User Action → Component → Service → External API/Supabase
                ↓                         ↓
            Local State              Response
                ↓                         ↓
            UI Update ← ← ← ← ← ← Process Data
```

### 3. File Organization Rules

- **Pages**: One folder per route
- **Components**: Group by feature (tyler/, vince/, styles/)
- **Services**: One folder per external integration
- **Context**: One file per global state concern
- **Types**: Shared types in `/types`, local types in component files

### 4. Performance Considerations

- **Lazy load** routes and heavy components
- **Memoize** expensive computations with `useMemo`
- **Use React.memo** for expensive pure components
- **Debounce** user inputs (search, etc.)
- **Virtualize** long lists with react-virtualized
- **Cache** API responses with React Query
- **Wake lock** for long-running video processes

---

## Common Tasks & Recipes

### 1. Adding a New Supabase Table

```sql
-- In supabase-schema.sql or via Supabase Dashboard
CREATE TABLE IF NOT EXISTS public.your_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- your columns here
  name TEXT NOT NULL,
  data JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view own data"
  ON public.your_table FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
  ON public.your_table FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
  ON public.your_table FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data"
  ON public.your_table FOR DELETE
  USING (auth.uid() = user_id);
```

### 2. Using Toast Notifications

```typescript
import { useToast } from '../../context/ToastContext';

const MyComponent = () => {
  const { showToast } = useToast();

  const handleAction = async () => {
    try {
      await someAction();
      showToast({
        type: 'success',
        message: 'Action completed successfully!'
      });
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to complete action'
      });
    }
  };
};
```

### 3. File Upload to Supabase Storage

```typescript
const handleFileUpload = async (file: File) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from('videos')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  // Get signed URL for external access
  const { data: { signedUrl } } = await supabase.storage
    .from('videos')
    .createSignedUrl(fileName, 60 * 60 * 24); // 24 hours

  return signedUrl;
};
```

### 4. Real-time Subscriptions

```typescript
useEffect(() => {
  const subscription = supabase
    .channel('custom-channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        console.log('New message:', payload.new);
        setMessages(prev => [...prev, payload.new]);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

### 5. Polling for External Process Status

```typescript
// Pattern from Vince/Submagic integration
const pollForStatus = async (projectId: string) => {
  const pollInterval = parseInt(import.meta.env.VITE_SUBMAGIC_POLL_INTERVAL_MS) || 30000;

  const checkStatus = async () => {
    const response = await fetch(`${API_URL}/projects/${projectId}`);
    const data = await response.json();

    if (data.status === 'completed') {
      setStatus('completed');
      setOutputUrl(data.output_url);
      return;
    }

    if (data.status === 'failed') {
      setStatus('error');
      setError(data.error_message);
      return;
    }

    // Continue polling
    setTimeout(checkStatus, pollInterval);
  };

  checkStatus();
};
```

---

## Debugging & Troubleshooting

### Common Issues

#### 1. Supabase Connection Issues
```typescript
// Check configuration
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Has Anon Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

// Test connection
const { data, error } = await supabase.auth.getSession();
console.log('Session test:', { data, error });
```

#### 2. FFmpeg Not Loading (Tyler)
- Check browser supports SharedArrayBuffer
- Verify CORS headers are set correctly in vite.config.ts
- Check CDN URL is accessible: `unpkg.com/@ffmpeg/core@0.12.6/dist/esm`

#### 3. Video Export Fails
- Check video file format (MP4 preferred)
- Verify video dimensions are even numbers
- Check browser console for FFmpeg errors
- Ensure wake lock is active (prevents throttling)

#### 4. Webhook/API Integration Issues
```typescript
// Add detailed logging
console.log('Sending to webhook:', webhookUrl);
console.log('Payload:', JSON.stringify(payload, null, 2));

const response = await fetch(webhookUrl, options);
console.log('Response status:', response.status);
const text = await response.text();
console.log('Raw response:', text);
```

#### 5. State Not Updating
```typescript
// Ensure immutable updates
setState(prev => ({
  ...prev,
  newField: value
}));

// For arrays
setState(prev => [...prev, newItem]);

// Check useEffect dependencies
useEffect(() => {
  // Effect
}, [dependency1, dependency2]); // All dependencies listed
```

### Development Tools

1. **React DevTools**: Inspect component tree and state
2. **Network Tab**: Monitor API calls and responses
3. **Application Tab**: Check localStorage, IndexedDB, sessionStorage
4. **Console**: Strategic logging for debugging
5. **Supabase Dashboard**: Monitor database and auth
6. **TypeScript**: `npx tsc --noEmit` for type checking

---

## File Reference

### Core Configuration Files

| File | Purpose | When to Modify |
|------|---------|----------------|
| `package.json` | Dependencies and scripts | Adding packages |
| `vite.config.ts` | Build and dev server config | API proxies, build options |
| `tsconfig.json` | TypeScript configuration | Path aliases, strictness |
| `tailwind.config.js` | Tailwind customization | Custom colors, utilities |
| `netlify.toml` | Deployment configuration | Build commands, redirects |

### Key Source Files

| File | Purpose | Key Exports |
|------|---------|-------------|
| `src/App.tsx` | Main app with routing | Default App component |
| `src/context/AuthContext.tsx` | Authentication state | AuthProvider, useAuth |
| `src/context/ExportContext.tsx` | Video export state | ExportProvider, useExport |
| `src/services/supabase/client.ts` | Supabase client | supabase |
| `src/services/tyler/ffmpegService.ts` | FFmpeg wrapper | ffmpegService |
| `src/services/vince/index.ts` | Submagic integration | bettyService |

### Component Counts

| Category | Count | Location |
|----------|-------|----------|
| Pages | 12+ | `/src/pages/` |
| Tyler Components | 10 | `/src/components/tyler/` |
| Vince Components | 7 | `/src/components/vince/` |
| UI Components | 2 | `/src/components/ui/` |
| Layout Components | 1 | `/src/components/layouts/` |
| Context Providers | 5 | `/src/context/` |

---

## Environment Variables

### Required Variables

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# AI Agent Webhooks (n8n)
VITE_AVA_WEBHOOK_URL=https://...
VITE_LARA_WEBHOOK_URL=https://...
VITE_LACY_WEBHOOK_URL=https://...
VITE_FRANCK_WEBHOOK_URL=https://...
VITE_FARIS_WEBHOOK_URL=https://...

# Submagic API (Vince)
VITE_SUBMAGIC_API_URL=https://api.submagic.co/v1
VITE_SUBMAGIC_API_KEY=your-api-key
VITE_SUBMAGIC_POLL_INTERVAL_MS=30000
```

### Environment Files

| File | Purpose | Committed |
|------|---------|-----------|
| `.env.example` | Template with placeholders | Yes |
| `.env.development` | Local development values | No |
| `.env.production` | Production values | No |
| `.env` | Default fallback | No |

---

## Best Practices Summary

1. **Always use TypeScript** - Define interfaces and types
2. **Follow established patterns** - Consistency across the codebase
3. **Handle errors gracefully** - User-friendly error messages
4. **Test both themes** - Dark and light mode support
5. **Consider mobile** - Responsive design required
6. **Document complex logic** - Future developers will thank you
7. **Use environment variables** - Never hardcode secrets
8. **Optimize for performance** - Lazy load, memoize, virtualize
9. **Maintain separation of concerns** - Services, components, pages
10. **Write meaningful commits** - Clear history for team

---

## Quick Command Reference

```bash
# Development
npm run dev              # Start Vite dev server (localhost:5173)
npm run build            # Production build (via build.sh)
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
npx tsc --noEmit         # Type check without build

# Testing
npm run test             # Run Jest tests

# Deployment
./build.sh               # Production build script
```

---

**Last Updated**: December 12, 2025

This guide should serve as your primary reference when working with MAXAI. Keep it updated as the project evolves!
