We want to **duplicate the entire AVA module for Franck** with only these changes:
- Rename to Franck
- Use `VITE_FRANCK_WEBHOOK_URL`
- Change button text to "Lets create a viral script"
- Everything else identical

Here's the detailed game plan with tasks and subtasks:

## Game Plan: Create Franck Module (Duplicate of AVA)

### Task 1: Create Franck Service Layer
**Purpose:** Duplicate AVA's service layer for Franck

#### Subtask 1.1: Create Franck service directory and main file
- Create directory: `/src/services/franck/`
- Create file: `/src/services/franck/index.ts`
- Copy entire contents from `/src/services/ava/index.ts`
- Find and replace all instances:
  - `AVA` → `FRANCK`
  - `Ava` → `Franck`
  - `ava` → `franck`
  - `VITE_AVA_WEBHOOK_URL` → `VITE_FRANCK_WEBHOOK_URL`

### Task 2: Create Franck Chat Page
**Purpose:** Duplicate AVA's chat interface for Franck

#### Subtask 2.1: Create Franck page directory and component
- Create directory: `/src/pages/franck/`
- Create file: `/src/pages/franck/FranckChat.tsx`
- Copy entire contents from `/src/pages/ava/AvaChat.tsx`

#### Subtask 2.2: Update imports and naming in FranckChat.tsx
- Change import: `import { sendMessage, AvaMessage, getInitialGreeting } from '@services/ava';` 
  → `import { sendMessage, FranckMessage, getInitialGreeting } from '@services/franck';`
- Replace all instances:
  - `AvaChat` → `FranckChat`
  - `AVA Chat` → `Franck Chat`
  - `AvaMessage` → `FranckMessage`
  - `ava_` → `franck_` (for localStorage keys)
  - `Make me 10 Viral Scripts` → `Lets create a viral script`

### Task 3: Update App Routing
**Purpose:** Add Franck to the application routing

#### Subtask 3.1: Import Franck component in App.tsx
- In `/src/App.tsx`, add import after other chat imports:
  ```typescript
  import FranckChat from './pages/franck/FranckChat';
  ```

#### Subtask 3.2: Add Franck route
- In the protected routes section, verify this route already exists:
  ```typescript
  <Route path="franck" element={<FranckChat />} />
  ```

### Task 4: Update Environment Configuration
**Purpose:** Add Franck webhook URL configuration

#### Subtask 4.1: Update .env.example
- In `/.env.example`, add after AVA webhook URL:
  ```
  VITE_FRANCK_WEBHOOK_URL=your_franck_webhook_url_here
  ```

#### Subtask 4.2: Update your local .env files
- Add the same line to `.env.development` and `.env.production` with actual webhook URL

### Task 5: Verify Sidebar Navigation
**Purpose:** Ensure Franck is accessible from navigation

#### Subtask 5.1: Check Sidebar.tsx
- Verify `/src/components/layouts/Sidebar.tsx` already has Franck entry in menuItems
- Should already exist as it's mentioned in the codebase

### Task 6: Update TypeScript Types (if needed)
**Purpose:** Ensure type consistency

#### Subtask 6.1: Update service types
- In `/src/services/franck/index.ts`, ensure all type names are updated:
  - `AvaResponse` → `FranckResponse`
  - `AvaRequest` → `FranckRequest`
  - `AvaMessage` → `FranckMessage`

## Implementation Order:
1. Start with Task 1 (Service Layer) - This is the foundation
2. Then Task 4 (Environment) - Need the webhook URL configured
3. Then Task 2 (Chat Page) - The main UI component
4. Then Task 3 (Routing) - Connect it to the app
5. Finally Task 5 & 6 (Verification) - Ensure everything works

## Testing Checklist:
- [ ] Franck service sends to correct webhook URL
- [ ] Chat interface loads without errors
- [ ] Messages persist in localStorage with `franck_` prefix
- [ ] Style selection works
- [ ] Button says "Lets create a viral script"
- [ ] Responses display correctly