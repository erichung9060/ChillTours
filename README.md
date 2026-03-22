# ChillTour Travel Planner

An AI-powered travel planning web application built with Next.js 15, React, Supabase, and Google Gemini 2.0 Flash.

## Features

- 🤖 AI-powered itinerary generation using Gemini 2.0 Flash
- 🗺️ Interactive Google Maps integration
- 💬 Conversational chat interface for itinerary refinement
- 🛣️ Route optimization — fast (TSP) and full (with Place enrichment & time windows) per-day ordering, with configurable per-day start/end time and transport mode (driving / transit / walking / bicycling)
- ✨ Perfect Arrangement — one-click smart planning that auto-optimizes all days after generation, respecting meal time windows and fixed-time activities
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

#### Windows（一鍵安裝）

```bat
run.bat                # 啟動 Next.js（port 3000）
run-with-supabase.bat  # 同上，另加啟動本地 Supabase（需 Docker Desktop）
```

#### macOS / Linux（一鍵安裝）

```bash
chmod +x run.sh
./run.sh    # 啟動 Next.js（port 3000）
```

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

3. Set up environment variables:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your API keys:

| Variable | Description |
| -------- | ----------- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key (domain-restricted, for map rendering) |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key (unrestricted, server-side Distance Matrix & Places API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side place cache writes) |
| `ORS_API_KEY` | OpenRouteService API key (server-side Vroom route optimization) |

1. Run the application:

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

## API Documentation

### `/api/resolve-places`

用於將地點名稱轉換為詳細的 Google Maps 資訊（包含經緯度、評分、營業時間等）。此 API 會透過 Supabase Edge Function 代理請求，並使用資料庫快取來節省 Google Maps API 呼叫額度。

**Endpoint:** `POST /api/resolve-places`

**Authentication:** Required (需在 Header 提供 `Authorization: Bearer <Supabase Access Token>`)

**Request Body:**

```json
{
  "places": [
    {
      "id": "1", // 必填：自訂 ID，用於對應回傳結果
      "name": "台北101", // 必填：搜尋的地點名稱 (長度 1~50)
      "lat": 25.0339, // 選填：用於提高搜尋精準度的基準緯度
      "lng": 121.5644 // 選填：用於提高搜尋精準度的基準經度
    }
  ]
}
```

_備註：每次請求的 `places` 數量必須介於 1 到 50 之間。_

**Response:**
回傳狀態碼 `200 OK` 及以下 JSON 結構：

```json
{
  "resolved": [
    {
      "id": "1",                           // 對應請求時傳入的 ID
      "place_id": "ChIJ...",               // Google Maps Place ID (若找到的話)
      "name": "Taipei 101",                // Google Maps 上的正式名稱 (或 fallback 原名稱)
      "lat": 25.0339639,                   // (選填) 緯度
      "lng": 121.5644722,                  // (選填) 經度
      "rating": 4.6,                       // (選填) 地點評分
      "user_ratings_total": 85000,         // (選填) 評論總數
      "website": "https://www.taipei-101.com.tw/", // (選填) 官方網站
      "opening_hours": { ... },            // (選填) 營業時間結構
      "error": "NOT_FOUND"                 // (選填) 若地點找不到則會有此欄位
    }
  ]
}
```

## Project Structure

```
├── app/                      # Next.js App Router
│   ├── (auth)/              # Authentication routes
│   ├── (main)/              # Main application routes
│   ├── api/                 # API routes
│   │   ├── optimize-route/       # POST — fast TSP ordering (ORS Vroom + Google Distance Matrix)
│   │   └── optimize-route-full/  # POST — full optimization with Google Places enrichment
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Landing page
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── ui/                  # Shared UI components
│   ├── landing/             # Landing page components
│   ├── planner/             # Planning interface components
│   └── layout/              # Layout components
├── lib/                     # Core libraries
│   ├── route-optimization/  # Route optimization engine (ORS Vroom + Google APIs)
│   │   ├── types.ts         # Shared TypeScript types
│   │   ├── distance-matrix.ts  # Google Distance Matrix with Haversine fallback
│   │   ├── vroom.ts         # ORS Vroom solver with time windows & priority
│   │   ├── greedy.ts        # Time-window-aware greedy fallback
│   │   ├── places.ts        # Google Places enrichment + Supabase cache
│   │   └── orchestrator.ts  # Orchestration of the full pipeline
│   ├── supabase/            # Supabase integration
│   ├── gemini/              # Gemini AI integration
│   ├── maps/                # Google Maps integration
│   ├── collaboration/       # Yjs collaboration
│   └── utils/               # Utility functions
├── python/                  # Legacy route optimization service (deprecated)
├── doc/                     # Technical documentation
│   ├── route-optimization.md    # Algorithm design & benchmarks
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
├── run.bat                  # Windows: start Python service + Next.js
├── run-with-supabase.bat    # Windows: start Python service + Next.js + local Supabase
├── setup.sh                 # macOS/Linux: set up Python venv & install dependencies
└── run.sh                   # macOS/Linux: start Python service + Next.js
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
