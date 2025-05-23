# PLANNING.md

## Project Vision
MAXAI is a comprehensive content creation platform with multiple AI-powered components:
1. **AVA (Advanced Viral Automator)** - Conversational AI for content ideation and script generation
2. **VERA (Viral Enhanced Rewrite Automator)** - System to analyze viral videos and create customized script variants
3. **Additional AI Agents** - Each with specialized platform focus:
   - **LARA (LinkedIn Automated Rewriting Assistant)** - Rewrites LinkedIn posts based on others' content in your personal tone & style
   - **LACY (LinkedIn Automated Content for You)** - Creates LinkedIn posts tailored for coaching & service providing businesses from scratch
   - **Franck (Facebook Relevant Automated Niche Content Kreator)** - Creates Facebook posts tailored for coaching & service providing businesses from scratch
   - **Faris (Facebook Automated Rewriting Intelligent Scholar)** - Rewrites Facebook posts into your personalized tone

The platform aims to help content creators, marketers, and businesses generate high-performing social media content using AI technology.

## Architecture Overview

### Frontend Architecture
- **Framework**: React SPA with React Router for navigation
- **UI Library**: Tailwind CSS for styling
- **State Management**: React Context API + local component state
- **Client-Side Storage**: LocalStorage for preferences, session data
- **User Experience**: Dark/light mode, responsive design

### Backend Services
- **Authentication/Database**: Supabase for user auth, data storage
- **Initial Workflow Automation**:
  - **n8n**: Handles AVA chat interactions with Claude (temporary)
  - **Make.com** (formerly Integromat): Handles VERA functionality (temporary)
- **Final Implementation**:
  - Direct Pydantic-based agent for AVA
  - Hardcoded VERA functionality in codebase
- **Communication**: 
  - Initial: Webhook-based interaction with automation platforms
  - Final: Direct API integrations

## Technical Constraints
- Frontend-focused application with minimal backend code
- Reliance on Make.com for complex processing workflows (initially)
- Limited to TikTok and Instagram for video analysis
- Mobile-first design approach
- Optimized for modern browsers
- API rate limits for external services (Claude API, FastSaverAPI, AssemblyAI)
- Handling large audio files and processing times
- Managing transition from no-code tools to hardcoded solutions

## Data Model

### User
- ID
- Email
- Name
- Avatar URL
- Subscription Status
- Created At
- Last Login

### Style
- ID
- User ID (Foreign Key)
- Name
- Description
- Niche
- Target Audience
- Communication Style
- Hero Story
- Pain Points
- System Prompt
- Created At
- Updated At

### Rewrite
- ID
- User ID (Foreign Key)
- Style ID (Foreign Key, Optional)
- Source Video URL
- Platform (TikTok/Instagram)
- Original Transcription
- Script Variations (JSON array)
- Created At
- Updated At

### Conversation
- ID
- User ID (Foreign Key)
- Agent Type (AVA, LARA, LACY, Franck, Faris)
- Title
- Created At
- Updated At

### Message
- ID
- Conversation ID (Foreign Key)
- Role (User or Assistant)
- Content
- Timestamp
- Attachments (Optional)

### Agent Setting
- ID
- User ID (Foreign Key)
- Agent Type (AVA, LARA, LACY, Franck, Faris)
- Custom Instructions
- Temperature Setting
- Created At
- Updated At

## AI Agent Differentiation

### AVA (Advanced Viral Automator)
- **Primary Function**: Generate viral content ideas and scripts
- **Key Features**: 
  - Content ideation based on trends
  - Script generation for short-form videos
  - Content research assistance

### LARA (LinkedIn Automated Rewriting Assistant)
- **Primary Function**: Rewrite LinkedIn content in personal style
- **Key Features**:
  - Transform others' LinkedIn posts into your voice
  - Adapt YouTube video content for LinkedIn
  - Convert article content to LinkedIn format
  - Maintain personal tone and style while leveraging existing content

### LACY (LinkedIn Automated Content for You)
- **Primary Function**: Create original LinkedIn posts for service businesses
- **Key Features**:
  - Generate posts specifically for coaching businesses
  - Create content for service providers
  - Develop original LinkedIn-optimized content from scratch
  - Focus on professional services messaging

### Franck (Facebook Relevant Automated Niche Content Kreator)
- **Primary Function**: Create original Facebook posts for service businesses
- **Key Features**:
  - Generate posts specifically for coaching businesses on Facebook
  - Create content for service providers
  - Develop Facebook-optimized original content
  - Adapt to Facebook's unique engagement patterns

### Faris (Facebook Automated Rewriting Intelligent Scholar)
- **Primary Function**: Rewrite Facebook posts in personal style
- **Key Features**:
  - Transform existing Facebook content into personalized voice
  - Maintain engagement factors while personalizing tone
  - Adapt content to match personal brand on Facebook
  - Preserve key messages while changing presentation style

## Component Structure
- Main Layout
  - Sidebar Navigation
  - Content Area
- Authentication
  - Login
  - Register
  - Password Reset
- AI Chat Interfaces
  - AVA (Advanced Viral Automator)
    - Chat Interface
    - Message History
    - Prompt Templates
  - LARA (LinkedIn Automated Rewriting Assistant)
    - Chat Interface
    - Source Content Input
    - Personal Style Configuration
    - Message History
  - LACY (LinkedIn Automated Content for You)
    - Chat Interface
    - Business Type Selection
    - Content Parameters
    - Message History
  - Franck (Facebook Relevant Automated Niche Content Kreator)
    - Chat Interface
    - Business Type Selection
    - Content Parameters
    - Message History
  - Faris (Facebook Automated Rewriting Intelligent Scholar)
    - Chat Interface
    - Source Content Input
    - Personal Style Configuration
    - Message History
- VERA
  - URL Input
  - Content Parameters Form
  - Script Variations Display
- Styles
  - Styles List
  - Style Editor
  - Style Templates
- Rewrites
  - Rewrites List
  - Rewrite Details
  - Filters and Sorting

## Technology Stack
- **Frontend**:
  - React
  - React Router
  - Tailwind CSS
  - Lucide React (icons)
  - React Query (optional)
- **Backend**:
  - Supabase
  - n8n (for AVA - initial phase)
  - Make.com (for VERA - initial phase)
  - Pydantic (for AVA - final implementation)
  - Direct API integrations (for VERA - final implementation)
- **Tools**:
  - Supabase JS Client
  - Axios for HTTP requests
  - JWT handling (via Supabase)
  - FastSaverAPI (for final VERA implementation)
  - AssemblyAI (for final VERA implementation)
  - Claude API (for both final implementations)

## Development Workflow
1. Set up project structure and core components
2. Implement authentication with Supabase
3. Create basic UI layouts and navigation
4. Connect to existing n8n workflow for AVA chat interface (initial phase)
5. Connect to existing Make.com workflow for VERA rewrite creation (initial phase)
6. Build styles management system
7. Create rewrites library
8. Implement direct AVA integration using Pydantic (replacing n8n)
   - Create base agent architecture
   - Implement Claude API integration
   - Develop conversation persistence
   - Build message handling system
9. Hardcode VERA functionality (replacing Make.com)
   - Implement FastSaverAPI integration for video processing
   - Create AssemblyAI integration for transcription
   - Develop Claude API integration for script generation
   - Build result parsing and display
   - Implement error handling and retry logic
10. Create n8n workflows for additional AI agents (LARA, LACY, Franck, Faris)
11. Connect to n8n workflows for additional AI agents
12. Create transition plan for moving from no-code to code solutions
13. Implement direct Pydantic-based agents for all additional AI interfaces
14. Develop account management features
15. Add final polish and optimizations
16. Implement CI/CD pipeline for automated testing and deployment

## Deployment Strategy
- Development: Local environment with Supabase project
- Staging: Vercel/Netlify deployment with staging Supabase
- Production: Vercel/Netlify with production Supabase
- CI/CD: GitHub Actions or similar for automated testing and deployment
- Feature flags for gradual rollout of hardcoded replacements
- Backup strategy for n8n and Make.com workflows during transition

## Performance Considerations
- Optimize component rendering with memoization and virtualization
- Implement proper data fetching strategies (React Query)
- Use code splitting for larger application sections
- Implement caching for frequently accessed data
- Optimize image/asset loading
- Handle API rate limiting for external services
- Manage application state to minimize unnecessary re-renders
- Implement debounce for user inputs in chat interfaces
- Store and lazily load conversation history
- Consider WebSocket implementation for real-time features

## Security Considerations
- Secure authentication via Supabase
- Proper JWT handling
- Input validation and sanitization
- CORS configurations
- API rate limiting

## Accessibility Requirements
- Semantic HTML structure
- Keyboard navigation support
- Screen reader compatibility
- Color contrast compliance
- Responsive design for all device sizes

## Future Expansion Areas
- Additional social media platform support
- Enhanced analytics dashboard
- Team collaboration features
- Content calendar integration
- Direct social media posting

## Dashboard & Navigation
- Sidebar navigation with main sections:
  - AVA Chat (Advanced Viral Automator)
  - LARA Chat (LinkedIn Automated Rewriting Assistant)
  - LACY Chat (LinkedIn Automated Content for You)
  - Franck Chat (Facebook Relevant Automated Niche Content Kreator)
  - Faris Chat (Facebook Automated Rewriting Intelligent Scholar)
  - Create Rewrite (VERA)
  - My Styles
  - All Rewrites
  - Account Settings
- Dark/light mode toggle
- User profile access