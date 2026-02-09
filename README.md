# CheerTour Travel Planner

An AI-powered travel planning web application built with Next.js 15, React, Supabase, and Google Gemini 2.0 Flash.

## Features

- 🤖 AI-powered itinerary generation using Gemini 2.0 Flash
- 🗺️ Interactive Google Maps integration
- 💬 Conversational chat interface for itinerary refinement
- 🤝 Real-time collaborative editing with Yjs
- 📱 Mobile-responsive design
- 🌓 Dark/Light theme support
- 🔐 Secure authentication with Google OAuth

## Tech Stack

### Frontend

- **Next.js 15** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **Shadcn/ui** - UI components

### Backend

- **Supabase** - PostgreSQL database, authentication, and real-time features
- **Supabase Edge Functions** - Serverless functions for AI integration
- **Google Gemini 2.0 Flash** - AI model for itinerary generation

### Collaboration

- **Yjs** - CRDT for conflict-free collaborative editing
- **y-websocket** - WebSocket provider for real-time sync

### Testing

- **Vitest** - Unit testing framework
- **fast-check** - Property-based testing
- **@testing-library/react** - React component testing

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Google Cloud account (for Maps API and OAuth)
- Google AI Studio account (for Gemini API)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd aitravelplanner
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your API keys:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Your Google Maps API key (domain-restricted)

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Testing

Run unit tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run tests with UI:

```bash
npm run test:ui
```

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
├── app/                      # Next.js App Router
│   ├── (auth)/              # Authentication routes
│   ├── (main)/              # Main application routes
│   ├── api/                 # API routes
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Landing page
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── ui/                  # Shared UI components
│   ├── landing/             # Landing page components
│   ├── planner/             # Planning interface components
│   └── layout/              # Layout components
├── lib/                     # Core libraries
│   ├── supabase/            # Supabase integration
│   ├── gemini/              # Gemini AI integration
│   ├── maps/                # Google Maps integration
│   ├── collaboration/       # Yjs collaboration
│   └── utils/               # Utility functions
├── hooks/                   # Custom React hooks
├── types/                   # TypeScript type definitions
├── test/                    # Test files and utilities
│   ├── utils/               # Test helpers
│   └── setup.ts             # Test setup
└── supabase/                # Supabase configuration
    ├── migrations/          # Database migrations
    └── functions/           # Edge Functions
```

## Architecture

The application follows the Single Responsibility Principle (SRP) with a layered architecture:

1. **Presentation Layer** - React components with Gen Z-styled UI/UX
2. **Application Layer** - Business logic and state management
3. **Integration Layer** - API clients for external services
4. **Data Layer** - Supabase database and real-time synchronization

## Development Guidelines

### Code Style

- Use TypeScript strict mode
- Follow ESLint and Prettier configurations
- Write tests for all new features
- Use property-based testing for universal properties

### Testing Strategy

- **Unit Tests** - Specific examples and edge cases
- **Property-Based Tests** - Universal properties across all inputs
- Minimum 100 iterations per property test

### Commit Guidelines

- Write clear, descriptive commit messages
- Reference issue numbers when applicable
- Keep commits focused and atomic

## License

[Your License Here]

## Contributing

[Your Contributing Guidelines Here]
