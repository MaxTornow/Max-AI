# MAXAI - AI-Powered Content Creation Platform

MAXAI is a comprehensive content creation platform with multiple AI-powered components designed to help content creators, marketers, and businesses generate high-performing social media content.

*Last updated: May 20, 2025*

## Features

- **AVA (Advanced Viral Automator)** - Conversational AI for content ideation and script generation
- **VERA (Viral Enhanced Rewrite Automator)** - System to analyze viral videos and create customized script variants
- **LARA (LinkedIn Automated Rewriting Assistant)** - Rewrites LinkedIn posts based on others' content in your personal tone & style
- **LACY (LinkedIn Automated Content for You)** - Creates LinkedIn posts tailored for coaching & service providing businesses from scratch
- **Franck (Facebook Relevant Automated Niche Content Kreator)** - Creates Facebook posts tailored for coaching & service providing businesses from scratch
- **Faris (Facebook Automated Rewriting Intelligent Scholar)** - Rewrites Facebook posts into your personalized tone

## Tech Stack

- **Frontend**: React with TypeScript
- **UI Framework**: Tailwind CSS
- **State Management**: React Context API + React Query
- **Routing**: React Router
- **Authentication/Database**: Supabase
- **Deployment**: Vercel/Netlify

## Project Structure

The project follows a feature-first approach with the following structure:

```
src/
├── assets/           # Static assets like images, icons
├── components/       # Shared UI components
├── context/          # React context providers
├── features/         # Feature-specific components
│   ├── ava/          # AVA chat components
│   ├── vera/         # VERA rewrite components
│   ├── lara/         # LARA chat components
│   ├── lacy/         # LACY chat components
│   ├── franck/       # Franck chat components
│   └── faris/        # Faris chat components
├── hooks/            # Custom React hooks
├── pages/            # Route-specific page components
├── services/         # API and external service integrations
│   └── supabase/     # Supabase client and services
├── types/            # TypeScript type definitions
└── utils/            # Helper functions and utilities
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/colliercoder/maxai.git
   cd maxai
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file in the root directory with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Development

### Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the production-ready app
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint to check for code issues
- `npm run test` - Run Jest tests

## Deployment

### Production Build

1. Create a production build:
   ```bash
   npm run build
   # or
   yarn build
   ```

2. The build output will be in the `dist` directory, which can be deployed to any static hosting service.

### Deploying to Vercel

1. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy to Vercel:
   ```bash
   vercel
   ```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary and confidential.

## Acknowledgments

- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.io/)
- [Vite](https://vitejs.dev/)