# Healthion API

FastAPI backend that integrates with [Open Wearables](https://openwearables.io) to provide unified access to wearable health data.

## What It Does

- **Proxies requests** to Open Wearables API for all wearable data
- **Handles authentication** via Auth0 JWT tokens
- **Auto-registers users** with Open Wearables on first login
- **Manages OAuth flows** for connecting wearable devices

## Prerequisites

- Docker and Docker Compose
- [Open Wearables](https://openwearables.io) API key
- [Auth0](https://auth0.com) account

## Setup

1. **Create environment file**
   ```bash
   cp ./envs/.env.example ./envs/.env
   ```

2. **Configure environment variables**
   ```env
   # Open Wearables
   OPEN_WEARABLES_API_KEY=your-api-key
   
   # Auth0
   AUTH0_DOMAIN=your-domain.auth0.com
   AUTH0_AUDIENCE=your-api-audience
   
   # Database
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=healthion
   ```

## Running

### Docker (Recommended)

```bash
# Start services (API + PostgreSQL)
docker compose up -d

# View logs
docker compose logs -f app

# Run database migrations
docker compose exec app uv run alembic upgrade head
```

### Local Development

```bash
# Install dependencies
uv sync

# Start PostgreSQL (via Docker or locally)
docker compose up -d db

# Run migrations
uv run alembic upgrade head

# Start development server
uv run fastapi dev app/main.py --reload
```

## API Endpoints

### User
- `GET /api/v1/me` - Get current user info

### Wearables (proxied to Open Wearables)
- `GET /api/v1/wearables/providers` - List available providers
- `GET /api/v1/wearables/connections` - List user's connected devices
- `POST /api/v1/wearables/connections/{provider}/connect` - Get OAuth URL
- `DELETE /api/v1/wearables/connections/{provider}` - Disconnect provider

### Health Data
- `GET /api/v1/wearables/timeseries` - Get timeseries data (heart rate, steps, etc.)
- `GET /api/v1/wearables/timeseries/types` - List available data types
- `GET /api/v1/wearables/workouts` - Get workout sessions
- `GET /api/v1/wearables/sleep` - Get sleep sessions

### Daily Summaries
- `GET /api/v1/wearables/summaries/activity` - Activity summary
- `GET /api/v1/wearables/summaries/sleep` - Sleep summary
- `GET /api/v1/wearables/summaries/recovery` - Recovery summary
- `GET /api/v1/wearables/summaries/body` - Body metrics summary

## Access

- API: http://localhost:8000
- Swagger Docs: http://localhost:8000/docs
- OpenAPI JSON: http://localhost:8000/openapi.json

## Project Structure

```
healthion-api/
├── app/
│   ├── api/routes/v1/     # API endpoints
│   ├── models/            # SQLAlchemy models
│   ├── schemas/           # Pydantic schemas
│   ├── services/          # Business logic
│   │   ├── open_wearables_client.py  # Open Wearables API client
│   │   ├── wearables_service.py      # Wearables service layer
│   │   └── user_service.py           # User management
│   └── utils/             # Auth dependencies, helpers
├── migrations/            # Alembic migrations
├── envs/                  # Environment files
└── docker-compose.yml
```
