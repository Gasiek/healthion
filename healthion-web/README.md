# Healthion Web

React frontend for displaying wearable health data from [Open Wearables](https://openwearables.io).

## What It Does

- **Dashboard** - Overview of all health metrics at a glance
- **Heart Rate** - Detailed heart rate timeseries and trends
- **Workouts** - Training history with duration, calories, heart rate
- **Sleep** - Sleep sessions with phases and quality metrics
- **Activity** - Daily activity summaries (steps, calories, distance)
- **Recovery** - HRV trends and recovery scores
- **Body** - Weight, BMI, and body composition
- **Settings** - Connect/disconnect wearable devices via OAuth

## Prerequisites

- Node.js 18+
- [Auth0](https://auth0.com) account
- Running [healthion-api](../healthion-api) backend

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```

3. **Set environment variables**
   ```env
   VITE_AUTH0_DOMAIN=your-domain.auth0.com
   VITE_AUTH0_CLIENT_ID=your-client-id
   VITE_AUTH0_AUDIENCE=your-api-audience
   
   # Optional - defaults to http://localhost:8000/api/v1
   # VITE_API_BASE_URL=http://your-api-host/api/v1
   ```

## Auth0 Configuration

1. Create a **Single Page Application** in [Auth0 Dashboard](https://manage.auth0.com/)
2. Configure allowed URLs:
   - **Callback URLs**: `http://localhost:5173`
   - **Logout URLs**: `http://localhost:5173`
   - **Web Origins**: `http://localhost:5173`

## Running

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Access the app at http://localhost:5173

## Tech Stack

- **React 18** + TypeScript
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **React Router** - Navigation
- **Auth0** - Authentication
- **Recharts** - Data visualization

## Project Structure

```
healthion-web/
├── src/
│   ├── components/        # Reusable UI components
│   ├── config/            # App configuration, menu
│   ├── hooks/             # Custom React hooks
│   │   ├── use-auth.ts        # Auth0 integration
│   │   └── use-wearables.ts   # Open Wearables data hooks
│   ├── lib/               # API client, utilities
│   ├── pages/             # Page components
│   │   ├── Dashboard.tsx
│   │   ├── HeartRate.tsx
│   │   ├── Workouts.tsx
│   │   ├── Sleep.tsx
│   │   ├── Activity.tsx
│   │   ├── Recovery.tsx
│   │   ├── Body.tsx
│   │   └── Settings.tsx
│   └── Router.tsx         # Route definitions
└── public/                # Static assets
```

## Available Hooks

```tsx
import { 
  useWearableProviders,
  useWearableConnections,
  useWearableTimeseries,
  useWearableWorkouts,
  useSleepSessions,
  useActivitySummary,
  useSleepSummary,
  useRecoverySummary,
  useBodySummary
} from '@/hooks/use-wearables'

// Example: Fetch heart rate data
const { data, loading, error } = useWearableTimeseries({
  types: ['heart_rate'],
  startDate: '2024-01-01',
  endDate: '2024-01-31'
})
```
