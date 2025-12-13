# MAXAI - AI-Powered Content Creation Platform

MAXAI is a comprehensive content creation platform with multiple AI-powered components designed to help content creators, marketers, and businesses generate high-performing social media content.

*Last updated: December 12, 2025*

## Features

### AI Content Assistants
- **AVA (Advanced Viral Automator)** - Conversational AI for content ideation and script generation
- **VERA (Viral Enhanced Rewrite Automator)** - System to analyze viral videos and create customized script variants
- **LARA (LinkedIn Automated Rewriting Assistant)** - Rewrites LinkedIn posts based on others' content in your personal tone & style
- **LACY (LinkedIn Automated Content for You)** - Creates LinkedIn posts tailored for coaching & service providing businesses from scratch
- **Franck (Facebook Relevant Automated Niche Content Kreator)** - Creates Facebook posts tailored for coaching & service providing businesses from scratch
- **Faris (Facebook Automated Rewriting Intelligent Scholar)** - Rewrites Facebook posts into your personalized tone

### Video Tools
- **Tyler (Text Your Layer Editor for Rendering)** - Browser-based video text overlay editor using FFmpeg.wasm
  - Custom text overlays with font, size, color, and positioning controls
  - Real-time canvas preview
  - Global export tracking (continue editing while exporting)
  - Client-side processing (no server required)

- **Vince (Vertical INstant Content Editor)** - AI-powered video editing via Submagic API
  - 8 professional templates (Hormozi, MrBeast, and more)
  - Auto-captions and subtitles
  - Magic zooms and B-roll insertion
  - Silence removal with pace control
  - Bad take detection and removal
  - AI-generated hook titles
  - Support for 12 languages

### Supporting Features
- **My Styles** - Create and manage personalized writing voice profiles
- **All Rewrites** - Browse and search your generated content variations
- **Dark/Light Mode** - Full theme support across the application

## Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 18 with TypeScript |
| **Build Tool** | Vite 6.3 |
| **Styling** | Tailwind CSS |
| **State Management** | React Context API + React Query |
| **Routing** | React Router v6 |
| **Database/Auth** | Supabase (PostgreSQL) |
| **Video Processing** | FFmpeg.wasm (browser-based) |
| **AI Video Editing** | Submagic API |
| **Deployment** | Netlify |

## Project Structure

```
src/
├── assets/           # Static assets (images, icons)
├── components/       # Shared UI components
│   ├── auth/         # Authentication components
│   ├── layouts/      # Layout wrappers (MainLayout)
│   ├── tyler/        # Video text overlay components
│   ├── vince/        # AI video editor components
│   ├── styles/       # Style management components
│   └── ui/           # Generic UI components
├── context/          # React context providers
│   ├── AuthContext   # Supabase authentication
│   ├── ExportContext # Global video export state
│   ├── StylesContext # User writing styles
│   ├── ThemeContext  # Dark/light mode
│   └── ToastContext  # Notifications
├── hooks/            # Custom React hooks
├── pages/            # Route-specific page components
│   ├── ava/          # AVA chat page
│   ├── vera/         # VERA rewrite page
│   ├── lara/         # LARA chat page
│   ├── lacy/         # LACY chat page
│   ├── franck/       # Franck chat page
│   ├── faris/        # Faris chat page
│   ├── tyler/        # Video text overlay page
│   ├── vince/        # AI video editor page
│   └── ...           # Other pages
├── services/         # API and external service integrations
│   ├── supabase/     # Supabase client and services
│   ├── tyler/        # FFmpeg video processing service
│   ├── vince/        # Submagic API integration
│   └── ...           # Agent services
├── types/            # TypeScript type definitions
└── sql/              # SQL schema files
```

## Getting Started

### Prerequisites

- Node.js v16 or higher
- npm or yarn
- Supabase account (for database and authentication)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/colliercoder/maxai.git
   cd maxai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with your credentials:
   ```bash
   # Supabase Configuration
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

   # AI Agent Webhooks (n8n)
   VITE_AVA_WEBHOOK_URL=your_ava_webhook_url
   VITE_LARA_WEBHOOK_URL=your_lara_webhook_url
   VITE_LACY_WEBHOOK_URL=your_lacy_webhook_url
   VITE_FRANCK_WEBHOOK_URL=your_franck_webhook_url
   VITE_FARIS_WEBHOOK_URL=your_faris_webhook_url

   # Submagic API (Vince)
   VITE_SUBMAGIC_API_URL=https://api.submagic.co/v1
   VITE_SUBMAGIC_API_KEY=your_submagic_api_key
   VITE_SUBMAGIC_POLL_INTERVAL_MS=30000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the production-ready app |
| `npm run build:original` | TypeScript compile + Vite build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint to check for code issues |
| `npm run test` | Run Jest tests |

### Key Technologies

#### FFmpeg.wasm (Tyler)
Tyler uses FFmpeg compiled to WebAssembly for client-side video processing. This allows users to add text overlays to videos without uploading to a server.

- Loaded from CDN: `unpkg.com/@ffmpeg/core@0.12.6/dist/esm`
- Requires browser support for SharedArrayBuffer
- Wake lock prevents browser throttling during export

#### Submagic API (Vince)
Vince integrates with Submagic's AI video editing API for advanced video processing:

- Video upload to Supabase Storage
- Template-based processing with 8 styles
- Auto-captions, zooms, and B-roll
- Polling-based status tracking

### Adding New Features

See the [Codebase Guide](./code_base_guide.md) for detailed instructions on:
- Adding new AI agents
- Adding video processing features
- Creating new context providers
- Database schema modifications

## Deployment

### Production Build

1. Create a production build:
   ```bash
   npm run build
   ```

2. The build output will be in the `dist` directory, ready for deployment.

### Deploying to Netlify

The project includes `netlify.toml` for easy deployment:

1. Connect your repository to Netlify
2. Configure environment variables in Netlify dashboard
3. Deploy automatically on push to main branch

Alternatively, use the Netlify CLI:
```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Environment Variables for Production

Ensure these are set in your deployment platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_AVA_WEBHOOK_URL`
- `VITE_LARA_WEBHOOK_URL`
- `VITE_LACY_WEBHOOK_URL`
- `VITE_FRANCK_WEBHOOK_URL`
- `VITE_FARIS_WEBHOOK_URL`
- `VITE_SUBMAGIC_API_URL`
- `VITE_SUBMAGIC_API_KEY`

## Database Schema

The application uses Supabase (PostgreSQL) with the following key tables:

| Table | Purpose |
|-------|---------|
| `profiles` | User profile data and preferences |
| `styles` | Writing voice profiles |
| `rewrites` | Generated content variations |
| `videos` | Vince video processing records |
| `conversations` | Chat history (future) |
| `messages` | Chat messages (future) |

All tables have Row Level Security (RLS) enabled, ensuring users can only access their own data.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Documentation

- [Codebase Guide](./code_base_guide.md) - Detailed developer documentation
- [Planning](./PLANNING.md) - Architecture planning and decisions
- [Task List](./TASK.md) - Current development tasks

## License

This project is proprietary and confidential.

## Acknowledgments

- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.io/)
- [Vite](https://vitejs.dev/)
- [FFmpeg.wasm](https://ffmpegwasm.netlify.app/)
- [Submagic](https://submagic.co/)
