# ChillTour Travel Planner

An AI-powered travel planning web application built with Next.js 15, React, Supabase, and Google Gemini 2.0 Flash.

## Features

- 🤖 AI-powered itinerary generation using Gemini 2.0 Flash
- 🗺️ Interactive Google Maps integration
- 💬 Conversational chat interface for itinerary refinement
- 🛣️ Route optimization — fast (TSP) and full (with Place enrichment & time windows) per-day ordering
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
- Python 3.10+ (for route optimization service)
- Supabase account
- Google Cloud account (for Maps API and OAuth)
- Google AI Studio account (for Gemini API)

### Installation

#### Windows（一鍵安裝）

```bat
setup.bat   # 建立 Python venv、安裝所有依賴
run.bat     # 同時啟動 Python 服務（port 8000）與 Next.js（port 3000）
```

Worker 數量依 CPU 核心數自動設定（`cpu_count // 2`，上限 4）。

#### 手動安裝

1. Clone the repository:

```bash
git clone <repository-url>
cd aitravelplanner
```

2. Install Node.js dependencies:

```bash
npm install
```

3. Install Python dependencies:

```bash
cd python
python -m venv venv
venv/Scripts/pip install -r requirements.txt   # Windows
# source venv/bin/activate && pip install -r requirements.txt  # macOS/Linux
```

4. Set up environment variables:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your API keys:

| Variable | Description |
| -------- | ----------- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key (domain-restricted, for map rendering) |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key (unrestricted, for Distance Matrix & Places API used by Python service) |
| `PYTHON_API_URL` | Python route-optimization service URL (default: `http://localhost:8000`) |
| `SUPABASE_URL` | Supabase URL (for Python service place cache) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for Python service place cache writes) |
| `SOLVER_TIME_LIMIT_SMALL` | OR-Tools time limit per strategy for n≤8 (default: `1`) |
| `SOLVER_TIME_LIMIT_LARGE` | OR-Tools time limit per strategy for n>8 (default: `3`) |

1. Run the services:

```bash
# Terminal 1 — Python route optimization service
cd python && uvicorn main:app --reload

# Terminal 2 — Next.js frontend
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
│   │   ├── optimize-route/       # POST — fast TSP ordering (proxy → Python /optimize)
│   │   └── optimize-route-full/  # POST — full optimization with Place enrichment (proxy → Python /optimize/full)
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
├── python/                  # Route optimization service (FastAPI)
│   ├── main.py              # OR-Tools TSP solver + Places API enrichment
│   ├── requirements.txt     # Python dependencies (ortools, fastapi, numpy…)
│   └── venv/                # Python virtual environment (git-ignored)
├── doc/                     # Technical documentation
│   ├── route-optimization.md    # OR-Tools algorithm design & benchmarks
│   ├── python-concurrency.md    # GIL, multi-worker, threading guide
│   └── ORTOOLS_SPEC.md          # Original OR-Tools specification
├── hooks/                   # Custom React hooks
├── types/                   # TypeScript type definitions
├── test/                    # Test files and utilities
│   ├── utils/               # Test helpers
│   └── setup.ts             # Test setup
├── supabase/                # Supabase configuration
│   ├── migrations/          # Database migrations
│   └── functions/           # Edge Functions
├── setup.bat                # Windows: set up Python venv & install dependencies
└── run.bat                  # Windows: start Python service + Next.js
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
