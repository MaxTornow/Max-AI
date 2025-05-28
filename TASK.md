# TASK.md

## Last Updated: 2025-05-28 (Updated for Supabase invitation flow)

## Active Tasks

### Project Setup
- [x] Create project documentation (README.md)
- [x] Set up React project with Vite
- [x] Configure Tailwind CSS
- [x] Configure React Router
- [x] Set up Supabase client
- [x] Implement dark/light mode toggle
- [x] Create basic project structure

### Core Components
- [x] Create MainLayout component
- [x] Build Sidebar navigation with all AI agents
- [x] Implement responsive design for mobile/desktop
- [x] Create common UI components (Button, Input, Card, etc.)
- [x] Set up Context providers (Auth, Theme, App)

### Supabase Invitation Flow
- [x] Fix token verification in Register component
  - [x] Update token handling to work with simple token format (not JWT)
  - [x] Extract email from URL parameters
  - [x] Pre-fill email field for invited users
- [x] Update form submission for invited users
  - [x] Use verifyOtp with type 'invite' to authenticate the invitation token
  - [x] Use updateUser to set password after verification
  - [x] Ensure email field is pre-filled and disabled
  - [x] Handle profile creation for invited users
- [x] Update email template to include email parameter
  - [x] Use format: `{{ .SiteURL }}/register?invitation_token={{ .Token }}&email={{ .Email }}`
- [ ] Test the complete invitation flow
- [x] Create reusable chat interface component (to be used across all AI agents)

### Authentication
- [x] Set up Supabase Auth integration
- [x] Create Login screen
- [x] Create Registration screen
- [x] Implement password reset functionality
- [x] Create authenticated routes protection

### AVA Implementation
- [x] Design chat interface components
  - [x] Create message bubble components
  - [x] Build message list with virtualization
  - [x] Implement typing indicators
  - [x] Create file attachment UI
  - [x] Add message formatting options
- [x] Create message rendering components
- [x] Implement chat input with attachments
- [x] Set up message history persistence in Supabase
- [x] Create frontend-to-AVA-agent connection
- [x] Implement prompt templates
- [x] Add conversation management (save, list, delete)
- [x] Add "Make me 10 Viral Scripts" quick action button
  - [x] Create centered button in AvaChat component
  - [x] Implement click handler to add text to chat input
  - [x] Auto-submit message when button is clicked
  - [x] Style button to match application design

### AVA n8n to Pydantic Agent Conversion
- [x] Analyze n8n workflow structure and components
- [x] Set up Python project structure for the agent
  - [x] Create agent.py for main agent logic
  - [x] Create tools.py for agent tools (Brave search)
  - [x] Create prompts.py for system prompts
  - [x] Create models.py for Pydantic models
- [x] Implement Brave search tool
- [x] Implement memory system for conversation history
- [x] Create FastAPI endpoint for agent interaction
- [x] Implement authentication with Supabase
- [x] Set up CORS configuration for frontend access
- [x] Create Docker configuration for deployment
- [x] Add environment variable configuration

### AVA Agent Development Testing
- [x] Set up environment variables for local development
  - [x] Configure Anthropic API key
  - [x] Configure Brave Search API key
  - [x] Configure Supabase URL and service key
  - [x] Set up CORS origins for local development
- [x] Create development testing documentation
- [x] Resolve package import issues in the agent
- [x] Create run script for local development
- [x] Test agent health endpoint
- [x] Update frontend .env.development to use correct port
- [x] Create standalone test client for API testing
- [x] Test agent API with the test client
- [x] Test integration with the frontend
- [x] Fix authentication issues in the test client
  - [x] Fix 403 Forbidden error in test client
  - [x] Implement development mode authentication bypass
  - [x] Update authentication logic in agent.py
- [x] Fix data model issues
  - [x] Update StyleModel to accept pain_points as a list of strings
  - [x] Modify agent.py to join pain_points list into a string for the prompt template
- [x] Fix Claude model configuration
  - [x] Update model name from "claude-3.7-sonnet" to "claude-3-7-sonnet-20250219"
  - [x] Fix 500 Internal Server Error related to model not found
- [x] Fix Anthropic API integration
  - [x] Remove await from client.messages.create() call
  - [x] Fix "object Message can't be used in 'await' expression" error
- [x] Document testing results and next steps

### AVA Agent Integration with Frontend
- [x] Verify AVA agent server is running correctly
  - [x] Check if the agent server starts without errors
  - [x] Verify the agent server is listening on port 8002
  - [x] Confirm the health endpoint is accessible from the frontend

### Modify AVA Chat Initialization Behavior
- [x] Prevent automatic agent initialization when page loads
  - [x] Modify the `initializeChat` function to only check agent health on page load
  - [x] Create a new function to get the initial greeting when explicitly triggered
  - [x] Update the UI to show only a welcome message and button initially
- [x] Ensure AVA agent only triggers on explicit user actions
  - [x] Trigger agent on "Make me 10 Viral templates" button click
  - [x] Trigger agent on first user message
  - [x] Maintain existing functionality after initial interaction

### Fix Git Repository Issues
- [x] Commit TASK.md updates with git repository maintenance tasks
  - [x] Document the issue with node_modules being tracked in git
  - [x] Create a detailed plan for fixing the issue safely
  - [x] Commit the updated TASK.md file
- [ ] Create a backup of the entire project to prevent any code loss
  - [ ] Create a zip archive of the current project state
  - [ ] Store the backup in a safe location
- [ ] Fix node_modules tracking issues in git
  - [ ] Create a new branch for the fixed repository
  - [ ] Copy all project files except node_modules and .git to the new branch
  - [ ] Reinitialize the git repository with proper .gitignore
  - [ ] Commit all files to the new clean repository
- [ ] Merge changes back to the main development branch
  - [ ] Ensure all code changes are preserved
  - [ ] Verify that node_modules is properly ignored

### Fix AVA Agent String Indices Error
- [x] Fix "string indices must be integers, not 'str'" error
  - [x] Identify the exact location of the error in agent.py
  - [x] Fix data type handling in the agent code
  - [x] Ensure proper validation of incoming data
  - [x] Add better error handling for data type mismatches
  - [x] Test the fix with the frontend integration

### Implement Automatic Initial Greeting in AVA Agent
- [x] Implement automatic initial greeting when chat interface is opened
  - [x] Examine current initialization flow in frontend and backend
  - [x] Create a dedicated endpoint for initial greeting in the backend
  - [x] Modify frontend to request initial greeting on chat initialization
  - [x] Ensure proper error handling for the initial greeting request
  - [x] Test the implementation with the frontend interface

### Fix AvaChat Opening Message and Prompt Implementation
- [x] Remove hardcoded opening message in AvaChat component
  - [x] Modify AvaChat.tsx to not include a default message
  - [x] Update the component to wait for the first message from the agent
- [x] Simplify prompt implementation to use only system prompt
  - [x] Update prompts.py to use only the system prompt from n8n
  - [x] Remove unnecessary template variables if not needed
  - [x] Update agent.py to use the simplified prompt structure
- [x] Implement cognitive bias checking
  - [x] Update the system prompt to include instructions for checking cognitive biases
  - [x] Ensure the agent responds with bias analysis when requested
- [x] Test the updated implementation
  - [x] Verify the opening message comes from the agent
  - [x] Test cognitive bias checking functionality
  - [x] Ensure all existing functionality still works

### Fix AVA Agent Validation Errors
- [x] Fix hero_story validation error
  - [x] Update StyleModel in models.py to handle nullable hero_story field
  - [x] Update frontend formatStyleForApi function to provide default value for hero_story
  - [x] Add better error handling for style validation
  - [x] Test the integration with the frontend
  - [x] Document the solution in FRONTEND_INTEGRATION.md
- [x] Fix Template usage error
  - [x] Replace Template.format() with Template.safe_substitute() in agent.py
  - [x] Fix all template usages for system prompt, search context, memory context
  - [x] Fix template usages for viral scripts, hooks, and content ideas
  - [x] Document the solution in FRONTEND_INTEGRATION.md

### Update AVA Agent System Prompt
- [x] Update system prompt to match n8n version
  - [x] Update SYSTEM_PROMPT_TEMPLATE in prompts.py with detailed n8n prompt
  - [x] Update viral scripts, hooks, and content ideas templates
  - [x] Add Max Tornow's personal style and tone
  - [x] Implement viral video checklist integration
  - [x] Update templates to use search_context and memory_context variables
- [x] Debug frontend-to-agent communication
  - [x] Add detailed logging in the frontend AVA service
  - [x] Add detailed logging in the agent's process_message function
  - [x] Check for CORS issues in browser developer console
  - [ ] Fix CORS configuration to allow requests from http://127.0.0.1:49985
  - [ ] Update CORS_ORIGINS environment variable in .env file
  - [ ] Verify CORS headers are being properly set in responses
  - [ ] Verify authentication token is being sent correctly
- [ ] Fix any identified issues
  - [ ] Update environment variables if needed
  - [ ] Fix any data format mismatches
  - [ ] Resolve authentication issues
  - [ ] Address CORS configuration problems
- [ ] Test the integration
  - [ ] Test sending a simple message from the frontend
  - [ ] Verify conversation history is maintained
  - [ ] Test style selection functionality
  - [ ] Ensure error handling works properly
- [x] Enhance the integration
  - [x] Improve error messages for better debugging
  - [x] Add retry logic for failed requests
  - [x] Optimize performance if needed
- [x] Fix remaining integration issues
  - [x] Resolve the string indices error in the backend
  - [x] Ensure consistent data type handling between frontend and backend
  - [x] Add more robust validation for API requests

### VERA Implementation
- [x] Design video creation interface
- [x] Implement video script generation with Claude
- [x] Create script editing interface
- [x] Implement video rendering with FastSaver API
- [x] Add video preview component
- [x] Create video download functionality
- [x] Implement video sharing options
- [x] Add video history and management

### LARA Implementation
- [ ] Design launch strategy interface
- [ ] Implement strategy generation with Claude
- [ ] Create strategy editing interface
- [ ] Add strategy export functionality
- [ ] Implement strategy history and management

### LACY Implementation
- [ ] Design copywriting interface
- [ ] Implement copy generation with Claude
- [ ] Create copy editing interface
- [ ] Add copy export functionality
- [ ] Implement copy history and management

### FRANCK Implementation
- [ ] Design funnel creation interface
- [ ] Implement funnel generation with Claude
- [ ] Create funnel editing interface
- [ ] Add funnel export functionality
- [ ] Implement funnel history and management

### FARIS Implementation
- [ ] Design Facebook ads interface
- [ ] Implement ad generation with Claude
- [ ] Create ad editing interface
- [ ] Add ad export functionality
- [ ] Implement ad history and management

### Styles Management
- [x] Create styles database schema
- [x] Implement styles CRUD operations
- [x] Design styles management interface
- [x] Create styles form component
- [x] Add styles list component
- [x] Implement styles selection in AI agents
- [x] Add styles sharing functionality
- [x] Create default styles for new users

## Notes
- ✅ Successfully implemented the authentication flow with Supabase
- ✅ Added proper error handling for authentication failures
- ✅ Created a responsive sidebar that collapses on mobile
- ✅ Implemented dark/light mode toggle with system preference detection
- ✅ Created a reusable chat interface component that can be used across all AI agents
- ✅ Added style selection and creation functionality in the VERA rewrite creation process
- ✅ Reused the existing StyleForm component for creating new styles in VERA
- ✅ Created a StylesContext to share style data across components
- ✅ Ensured that when a new style is created in VERA, it's also reflected in the My Styles page
- For the AVA agent conversion, need to ensure the Python implementation maintains the same functionality as the n8n workflow
- Consider implementing a more robust memory system in the Python agent compared to the n8n workflow
- The Brave search tool implementation will need proper error handling and rate limiting
- Need to ensure the Python agent can handle the same style guidelines format as the n8n workflow
- ✅ Successfully implemented a Pydantic-based AVA agent that replicates the n8n workflow functionality
- ✅ Created a more structured and testable codebase with proper separation of concerns
- ✅ Implemented comprehensive error handling in the Brave search tool
- ✅ Added proper type validation with Pydantic models for all inputs and outputs
- ✅ Replaced setTimeout simulation with actual API calls to the AVA agent
- ✅ Added style selection to the AvaChat component for user customization
- ✅ Implemented authentication for the AVA agent API using Supabase
- ✅ Added CORS configuration to allow requests from the frontend
- ✅ Created a Docker configuration for easy deployment of the AVA agent
- ✅ Added conversation persistence for continuity between sessions
- ✅ Implemented proper error handling for API communication
- ✅ Created a standalone HTML test client for testing the AVA agent API directly
- ✅ Fixed import issues in the agent by creating a proper package structure
- ✅ Successfully ran the AVA agent on port 8002 and verified the health endpoint
- ✅ Updated the frontend .env.development to use the correct port for the AVA agent
- The AVA agent requires both Anthropic API key for Claude and Brave Search API key to function
- For development testing, we need to create a separate .env file for the AVA agent with the necessary API keys
- The Supabase keys need to be duplicated in the AVA agent's environment for authentication to work
- Consider adding a feature to export conversations for sharing or backup
- The AVA agent could be enhanced with more specialized tools beyond search in future iterations