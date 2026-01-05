<div align="center">
  <img src="https://cdn.prod.website-files.com/66a1237564b8afdc9767dd3d/66df7b326efdddf8c1af9dbb_Momentum%20Logo.svg" height="64">

  [![Contact us](https://img.shields.io/badge/Contact%20us-AFF476.svg)](mailto:hello@themomentum.ai?subject=Healthion)
  [![Check Momentum](https://img.shields.io/badge/Check%20Momentum-1f6ff9.svg)](https://themomentum.ai)
  [![Open Wearables](https://img.shields.io/badge/Open%20Wearables-8B5CF6.svg)](https://openwearables.io)
  [![MIT License](https://img.shields.io/badge/License-MIT-636f5a.svg?longCache=true)](LICENSE)
</div>

# Healthion

A sample health application demonstrating integration with **[Open Wearables](https://openwearables.io)** - a platform that enables easy collection of wearable data from various manufacturers in one unified API.

## What It Does

Healthion showcases how to build a complete health dashboard that displays data from multiple wearable devices through Open Wearables integration. All wearable data flows through Open Wearables API, which handles:

- **Device connections** via OAuth (Garmin, Polar, Suunto, Withings, Whoop, Oura)
- **Data normalization** across different device formats
- **Deduplication** when data comes from multiple sources

## Integrated Data Types

### Timeseries Data (47 types)
| Category | Data Types |
|----------|------------|
| **Heart** | Heart Rate, HRV (RMSSD/SDNN), Blood Pressure |
| **Activity** | Steps, Calories, Distance, Floors Climbed |
| **Body** | Weight, Body Fat %, BMI, Body Temperature |
| **Respiratory** | SpO2, Respiratory Rate, VO2 Max |
| **Blood** | Blood Glucose, Blood Oxygen |
| **Sleep** | Sleep stages, Sleep score |
| **Other** | Stress, Energy, Mindfulness minutes, and more... |

### Event-Based Data
- **Workouts** - All training types with duration, calories, heart rate zones
- **Sleep Sessions** - Sleep phases, quality metrics, interruptions

### Daily Summaries
- **Activity** - Steps, calories burned, active minutes, distance
- **Sleep** - Total sleep time, phases, efficiency, score
- **Recovery** - HRV trends, recovery score, readiness
- **Body** - Weight, BMI, body composition metrics

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  healthion-web  │────▶│  healthion-api  │────▶│  Open Wearables │
│  (React + TS)   │     │    (FastAPI)    │     │      API        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │ Garmin, Polar,  │
                                               │ Suunto, Withings│
                                               │ Whoop, Oura...  │
                                               └─────────────────┘
```

### Backend (healthion-api)

FastAPI-based REST API that:
- Proxies requests to Open Wearables API
- Handles user authentication (Auth0)
- Automatically registers users with Open Wearables on first login
- Manages OAuth flows for device connections

See [healthion-api/README.md](healthion-api/README.md) for setup instructions.

### Frontend (healthion-web)

React + TypeScript application with:
- **Dashboard** - Overview of all health metrics
- **Heart Rate** - Detailed heart rate timeseries and trends
- **Workouts** - Training history and statistics
- **Sleep** - Sleep sessions and quality metrics
- **Activity** - Daily activity summaries
- **Recovery** - HRV and recovery metrics
- **Body** - Weight and body composition
- **Settings** - Connect/disconnect wearable devices

Built with Vite, Tailwind CSS, and shadcn/ui components.

See [healthion-web/README.md](healthion-web/README.md) for setup instructions.

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- [Open Wearables](https://openwearables.io) API key
- [Auth0](https://auth0.com) account for authentication

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/the-momentum/healthion.git
   cd healthion
   ```

2. **Set up the backend**
   ```bash
   cd healthion-api
   cp envs/.env.example envs/.env
   # Edit envs/.env with your Open Wearables API key and Auth0 config
   docker-compose up -d
   ```

3. **Set up the frontend**
   ```bash
   cd healthion-web
   cp .env.example .env
   # Edit .env with your Auth0 config
   npm install
   npm run dev
   ```

4. **Connect your wearables**
   - Open http://localhost:5173
   - Log in with Auth0
   - Go to Settings and connect your devices

## Environment Variables

### Backend (healthion-api)
| Variable | Description |
|----------|-------------|
| `OPEN_WEARABLES_API_KEY` | Your Open Wearables API key |
| `AUTH0_DOMAIN` | Auth0 domain |
| `AUTH0_AUDIENCE` | Auth0 API audience |

### Frontend (healthion-web)
| Variable | Description |
|----------|-------------|
| `VITE_AUTH0_DOMAIN` | Auth0 domain |
| `VITE_AUTH0_CLIENT_ID` | Auth0 client ID |
| `VITE_AUTH0_AUDIENCE` | Auth0 API audience |
| `VITE_API_BASE_URL` | *(Optional)* Backend API URL, defaults to `http://localhost:8000/api/v1` |

## What We Learned

During implementation, we encountered several challenges worth documenting:

### 1. 🔑 API Key Configuration
**Problem:** 401 Unauthorized errors when creating users in Open Wearables.

**Solution:** Ensure `OPEN_WEARABLES_API_KEY` is correctly set and restart Docker containers to load new environment variables.

### 2. 🔇 Silent Error Handling
**Problem:** Errors from Open Wearables were being caught and silently ignored, making debugging difficult.

**Solution:** Added explicit `OpenWearablesConfigurationError` exception and improved logging. Return HTTP 503 when Open Wearables is not configured.

### 3. 👥 Duplicate Users (Race Condition)
**Problem:** Multiple simultaneous requests to authenticate created duplicate users in Open Wearables (5+ accounts for the same email).

**Cause:** Each concurrent request checked if user exists, got `None`, and created a new user - all before any creation completed.

**Solution:** Implemented per-email `asyncio.Lock` in the Open Wearables client to serialize user creation requests.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">
  Built with ❤️ by <a href="https://themomentum.ai">Momentum</a>
</div>
