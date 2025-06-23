# MAXAI - Codebase Analysis & Developer Guide

**Generated**: June 18, 2025  
**Location**: `/Users/dan/Downloads/Max Tornow 2/AI INTERFACE`  
**Purpose**: Complete reference guide for developers adding new features

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Developer Quick Start](#developer-quick-start)
5. [Adding New Features - Step by Step](#adding-new-features---step-by-step)
6. [Code Patterns & Conventions](#code-patterns--conventions)
7. [Architecture Guidelines](#architecture-guidelines)
8. [Common Tasks & Recipes](#common-tasks--recipes)
9. [Debugging & Troubleshooting](#debugging--troubleshooting)
10. [File Reference](#file-reference)

## Project Overview

MAXAI is a comprehensive AI-powered content creation platform built with React, TypeScript, and Supabase. The application provides multiple AI agents specialized for different content creation tasks across various social media platforms.

### AI Agents
- **AVA** (Advanced Viral Automator) - Content ideation and script generation
- **VERA** (Viral Enhanced Rewrite Automator) - Analyze viral videos and create script variants
- **LARA** (LinkedIn Automated Rewriting Assistant) - Rewrite LinkedIn posts in personal style
- **LACY** (LinkedIn Automated Content for You) - Create original LinkedIn posts
- **Franck** (Facebook Relevant Automated Niche Content Kreator) - Create Facebook posts
- **Faris** (Facebook Automated Rewriting Intelligent Scholar) - Rewrite Facebook posts

## Technology Stack

### Core Technologies
- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (with dark mode)
- **State Management**: React Context API + React Query
- **Database/Auth**: Supabase
- **Routing**: React Router v6
- **UI Icons**: React Icons (Feather Icons)
- **Markdown**: React Markdown with GFM

### External Integrations
- **n8n**: Webhook-based AI agent integration (temporary)
- **Supabase**: Authentication, database, real-time subscriptions
- **External APIs**: Claude, FastSaver, AssemblyAI, TikTok

## Project Structure

```
/AI INTERFACE
├── /src
│   ├── /assets          # Static files (images, logos)
│   ├── /components      # Reusable UI components
│   │   ├── /auth        # Authentication components
│   │   ├── /layouts     # Layout components (MainLayout, Sidebar)
│   │   ├── /styles      # Style management components
│   │   ├── /ui          # Basic UI components
│   │   └── /VideoProcessing
│   ├── /context         # React Context providers
│   ├── /hooks           # Custom React hooks
│   ├── /pages           # Page components (routes)
│   │   ├── /auth        # Auth pages
│   │   ├── /ava         # AVA chat page
│   │   ├── /lara        # LARA chat page
│   │   ├── /lacy        # LACY chat page
│   │   ├── /franck      # Franck chat page
│   │   ├── /faris       # Faris chat page
│   │   ├── /vera        # VERA rewrite page
│   │   ├── /styles      # Styles management
│   │   ├── /rewrites    # Rewrites library
│   │   └── /settings    # User settings
│   ├── /services        # API and service integrations
│   │   ├── /ava         # AVA agent service
│   │   ├── /rewrites    # Rewrites service
│   │   ├── /styles      # Styles service
│   │   ├── /supabase    # Supabase client
│   │   └── /videoProcessing
│   ├── /types           # TypeScript type definitions
│   ├── App.tsx          # Main app component with routing
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── Configuration Files
│   ├── package.json     # Dependencies and scripts
│   ├── vite.config.ts   # Vite configuration
│   ├── tsconfig.json    # TypeScript configuration
│   ├── tailwind.config.js
│   ├── netlify.toml     # Deployment configuration
│   └── .env.example     # Environment variables template
└── Documentation
    ├── README.md
    ├── PLANNING.md      # Architecture planning
    └── TASK.md          # Current tasks

```

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

# Add your environment variables:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - VITE_AVA_WEBHOOK_URL (n8n webhook)
# - Other API keys as needed

# Start development server
npm run dev
```

### 2. Understanding the Code Flow

1. **Entry Point**: `main.tsx` → `App.tsx`
2. **Context Providers** wrap the entire app:
   - `ThemeProvider` - Dark/light mode
   - `AuthProvider` - User authentication state
   - `StylesProvider` - User content styles
   - `ToastProvider` - Notifications
3. **Routing** is handled in `App.tsx` with protected routes
4. **Pages** are lazy-loaded and correspond to routes
5. **Services** handle external API calls and Supabase operations

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
  
  // Similar implementation to AVA service
  // Send to webhook, parse response, return formatted data
  
  return {
    output: "Response from TARA",
    conversation_id: conversationId || crypto.randomUUID()
  };
};
```

#### Step 2: Create the Chat Page
Create `/src/pages/tara/TaraChat.tsx`:

```typescript
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@context/AuthContext';
import { useStyles } from '@context/StylesContext';
import { FiSend, FiPaperclip } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import { sendMessage, TaraMessage } from '@services/tara';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const TaraChat: React.FC = () => {
  // Copy structure from AvaChat.tsx
  // Modify for Twitter-specific features
  
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Chat interface */}
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

#### Step 4: Add Navigation in Sidebar.tsx

```typescript
// In the menuItems array, add:
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

### 2. Adding a New Feature Page (e.g., Analytics Dashboard)

#### Step 1: Create the Service
Create `/src/services/analytics/index.ts`:

```typescript
import { supabase } from '../supabase/client';

export interface AnalyticsData {
  totalRewrites: number;
  totalConversations: number;
  popularStyles: Array<{
    name: string;
    usage: number;
  }>;
}

export const getAnalytics = async (userId: string): Promise<AnalyticsData> => {
  // Fetch data from Supabase
  // Process and return analytics
};
```

#### Step 2: Create the Page Component
Create `/src/pages/analytics/Analytics.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { useAuth } from '@context/AuthContext';
import { getAnalytics, AnalyticsData } from '@services/analytics';

const Analytics: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadAnalytics = async () => {
      if (user) {
        try {
          const analytics = await getAnalytics(user.id);
          setData(analytics);
        } catch (error) {
          console.error('Failed to load analytics:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadAnalytics();
  }, [user]);
  
  if (loading) {
    return <div>Loading analytics...</div>;
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>
      {/* Display analytics data */}
    </div>
  );
};

export default Analytics;
```

#### Step 3: Add Route and Navigation
Follow similar steps as adding a new AI agent.

### 3. Adding a New Context Provider

#### Step 1: Create the Context
Create `/src/context/AnalyticsContext.tsx`:

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface AnalyticsContextType {
  trackEvent: (event: string, data?: any) => void;
  events: Array<{ event: string; data: any; timestamp: Date }>;
}

const AnalyticsContext = createContext<AnalyticsContextType>({
  trackEvent: () => {},
  events: []
});

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  
  const trackEvent = (event: string, data?: any) => {
    const newEvent = {
      event,
      data,
      timestamp: new Date(),
      userId: user?.id
    };
    
    setEvents(prev => [...prev, newEvent]);
    
    // Optionally send to analytics service
  };
  
  return (
    <AnalyticsContext.Provider value={{ trackEvent, events }}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within AnalyticsProvider');
  }
  return context;
};
```

#### Step 2: Add to App.tsx

```typescript
import { AnalyticsProvider } from './context/AnalyticsContext';

// Wrap in the provider chain
<AnalyticsProvider>
  {/* Other providers and content */}
</AnalyticsProvider>
```

## Code Patterns & Conventions

### 1. Component Structure

```typescript
// Standard component template
import React, { useState, useEffect } from 'react';
import { useAuth } from '@context/AuthContext';
// Other imports

interface ComponentProps {
  // Props interface
}

/**
 * Component description
 * @param props - Component props
 * @returns JSX.Element
 */
const ComponentName: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // Hooks first
  const { user } = useAuth();
  
  // State declarations
  const [state, setState] = useState();
  
  // Effects
  useEffect(() => {
    // Effect logic
  }, [dependencies]);
  
  // Handler functions
  const handleClick = () => {
    // Handler logic
  };
  
  // Render helpers
  const renderSection = () => {
    return <div>Section</div>;
  };
  
  // Main render
  return (
    <div className="standard-classes">
      {/* JSX content */}
    </div>
  );
};

export default ComponentName;
```

### 2. Service Pattern

```typescript
// Standard service template
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

### 3. Styling Conventions

```typescript
// Use Tailwind classes with dark mode support
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md">
    Click me
  </button>
</div>

// Common class patterns:
// - Containers: "p-4 md:p-6 lg:p-8"
// - Cards: "bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4"
// - Buttons: "px-4 py-2 rounded-md transition-colors"
// - Text: "text-gray-900 dark:text-white"
```

### 4. Error Handling Pattern

```typescript
try {
  setLoading(true);
  const result = await someAsyncOperation();
  setData(result);
} catch (error) {
  console.error('Descriptive error message:', error);
  setError(error.message || 'An unexpected error occurred');
  
  // Optionally show toast
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

// Use type for simple types
type Status = 'idle' | 'loading' | 'success' | 'error';

// Use enums for constants
enum AgentType {
  AVA = 'ava',
  LARA = 'lara',
  LACY = 'lacy'
}

// Type guards
const isValidResponse = (response: any): response is ValidResponse => {
  return response && typeof response.data === 'object';
};
```

## Architecture Guidelines

### 1. State Management Strategy

- **Local State**: Use `useState` for component-specific state
- **Global State**: Use Context API for app-wide state
- **Server State**: Use React Query for API data
- **Persistent State**: Use localStorage for user preferences

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
- **Components**: Group by feature, not by type
- **Services**: One file per external integration
- **Context**: One file per global state concern
- **Types**: Shared types in `/types`, local types in component files

### 4. API Integration Patterns

```typescript
// For external APIs, use Vite proxy (vite.config.ts)
'/api/external': {
  target: 'https://external-api.com',
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/api\/external/, '')
}

// For Supabase, use the client
import { supabase } from '@services/supabase/client';
```

### 5. Performance Considerations

- Use React.memo for expensive components
- Implement virtualization for long lists
- Lazy load routes and heavy components
- Debounce user inputs
- Cache API responses appropriately

## Common Tasks & Recipes

### 1. Adding a New Supabase Table

```sql
-- In supabase-schema.sql
CREATE TABLE IF NOT EXISTS public.your_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- your columns
);

-- Enable RLS
ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view own data" 
  ON public.your_table 
  FOR SELECT 
  USING (auth.uid() = user_id);
```

### 2. Creating a Reusable Component

```typescript
// Create /src/components/ui/CustomButton.tsx
interface CustomButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

const CustomButton: React.FC<CustomButtonProps> = ({
  variant = 'primary',
  size = 'md',
  onClick,
  children,
  disabled = false
}) => {
  const baseClasses = 'font-medium rounded-md transition-colors';
  
  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {children}
    </button>
  );
};
```

### 3. Implementing Real-time Features

```typescript
// Subscribe to Supabase real-time changes
useEffect(() => {
  const subscription = supabase
    .channel('custom-channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        console.log('New message:', payload.new);
        // Update local state
      }
    )
    .subscribe();
    
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

### 4. Adding Toast Notifications

```typescript
import { useToast } from '@context/ToastContext';

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

### 5. Implementing File Upload

```typescript
const handleFileUpload = async (file: File) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${uuidv4()}.${fileExt}`;
  
  const { error: uploadError } = await supabase.storage
    .from('uploads')
    .upload(fileName, file);
    
  if (uploadError) throw uploadError;
  
  const { data: { publicUrl } } = supabase.storage
    .from('uploads')
    .getPublicUrl(fileName);
    
  return publicUrl;
};
```

## Debugging & Troubleshooting

### Common Issues

#### 1. Supabase Connection Issues
```typescript
// Check if configured properly
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Has Anon Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

// Test connection
const { data, error } = await supabase.auth.getSession();
console.log('Session test:', { data, error });
```

#### 2. Webhook/API Integration Issues
```typescript
// Add detailed logging
console.log('Sending to webhook:', webhookUrl);
console.log('Payload:', JSON.stringify(payload, null, 2));

// Check response
const response = await fetch(webhookUrl);
console.log('Response status:', response.status);
console.log('Response headers:', response.headers);
const text = await response.text();
console.log('Raw response:', text);
```

#### 3. State Not Updating
```typescript
// Ensure state updates are immutable
setState(prev => ({
  ...prev,
  newField: value
}));

// For arrays
setState(prev => [...prev, newItem]);

// Check dependencies in useEffect
useEffect(() => {
  // Effect
}, [dependency1, dependency2]); // All dependencies listed
```

#### 4. TypeScript Errors
```typescript
// Use type assertions carefully
const data = response as ExpectedType;

// Or better, use type guards
if (isExpectedType(response)) {
  // TypeScript knows the type here
}

// For any unavoidable cases
const value = someValue as any; // Last resort
```

### Development Tools

1. **React DevTools**: Inspect component tree and state
2. **Network Tab**: Monitor API calls and responses
3. **Console Logging**: Strategic logging for debugging
4. **Supabase Dashboard**: Monitor database and auth
5. **TypeScript Compiler**: `npx tsc --noEmit` for type checking

### Performance Debugging

```typescript
// Use React Profiler
import { Profiler } from 'react';

<Profiler id="Navigation" onRender={callback}>
  <Navigation />
</Profiler>

// Measure render time
const callback = (id, phase, actualDuration) => {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
};
```

## File Reference

### Core Configuration Files

#### `/package.json`
- **Purpose**: Dependencies and project configuration
- **Key sections**: scripts, dependencies, devDependencies
- **When to modify**: Adding new packages or scripts

#### `/vite.config.ts`
- **Purpose**: Build and dev server configuration
- **Key features**: Path aliases, proxy configuration
- **When to modify**: Adding new API proxies or build optimizations

#### `/tsconfig.json`
- **Purpose**: TypeScript compiler configuration
- **Key settings**: Target ES version, path mappings
- **When to modify**: Changing TypeScript strictness or paths

#### `/tailwind.config.js`
- **Purpose**: Tailwind CSS customization
- **Key sections**: Theme extensions, colors, plugins
- **When to modify**: Adding custom colors or utilities

#### `/.env.example`
- **Purpose**: Environment variables template
- **Usage**: Copy to `.env.development` and fill in values
- **Security**: Never commit actual `.env` files

### Key Source Files

#### `/src/App.tsx`
- **Purpose**: Main app component with routing
- **Dependencies**: All contexts, React Router
- **Exports**: Default App component

#### `/src/context/AuthContext.tsx`
- **Purpose**: Global authentication state
- **Key functions**: signIn, signUp, signOut
- **Hooks**: useAuth()

#### `/src/services/supabase/client.ts`
- **Purpose**: Supabase client initialization
- **Exports**: supabase client, error handlers
- **Configuration**: Uses environment variables

#### `/src/components/layouts/MainLayout.tsx`
- **Purpose**: Primary app layout wrapper
- **Features**: Sidebar, main content area
- **Used by**: All authenticated pages

### Service Layer Files

#### `/src/services/ava/index.ts`
- **Purpose**: AVA agent communication
- **Key function**: sendMessage()
- **Integration**: n8n webhook

#### `/src/services/styles/index.ts`
- **Purpose**: User styles CRUD operations
- **Database**: styles table
- **Used by**: StylesContext, style pages

### Page Components

#### `/src/pages/ava/AvaChat.tsx`
- **Purpose**: AVA chat interface
- **Features**: Message history, style selection
- **State**: Local message storage

#### `/src/pages/auth/Register.tsx`
- **Purpose**: User registration
- **Features**: Invitation flow support
- **Integration**: Supabase auth

### Database Schema

#### `/supabase-schema.sql`
- **Tables**: styles, profiles (referenced)
- **Features**: RLS policies, indexes
- **When to modify**: Adding new tables or columns

## Best Practices Summary

1. **Always use TypeScript** - Define interfaces and types
2. **Follow the established patterns** - Consistency is key
3. **Handle errors gracefully** - User-friendly messages
4. **Test on both themes** - Dark and light mode
5. **Consider mobile** - Responsive design required
6. **Document complex logic** - Future you will thank you
7. **Use environment variables** - Never hardcode secrets
8. **Optimize for performance** - Lazy load when possible
9. **Maintain separation of concerns** - Services, components, pages
10. **Write meaningful commit messages** - Help future developers

## Quick Command Reference

```bash
# Development
npm run dev              # Start dev server
npm run build           # Production build
npm run preview         # Preview production build

# Code Quality
npm run lint            # Run ESLint
npx tsc --noEmit       # Type check

# Supabase
npx supabase status     # Check connection
npx supabase db diff    # Generate migration

# Testing (when implemented)
npm run test            # Run tests
npm run test:watch      # Watch mode

# Deployment
./build.sh              # Production build script
```

---

This guide should serve as your primary reference when adding new features to MAXAI. Remember to keep it updated as the project evolves!