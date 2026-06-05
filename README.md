# PulseOps - Real-Time WebSocket Monitoring Dashboard

PulseOps is a portfolio-ready real-time monitoring dashboard built with React, Express, and Socket.IO. It shows live operational telemetry such as API latency, CPU/load, memory pressure, active users, error rate, transactions per minute, service health, and incident-style event updates.

The preferred production-style architecture is **agent push monitoring**: a monitored backend sends metrics out to PulseOps through a secure ingestion API. That means the monitored app does not need to expose a public monitoring URL. PulseOps receives the metrics, normalizes them, and broadcasts them to the dashboard over Socket.IO.

## Tech Stack

- React 18 and Vite
- Tailwind CSS
- Zustand state management
- Socket.IO client and server
- Node.js and Express
- CORS and dotenv for deployment configuration
- HMAC-signed PulseOps agent API keys

## Features

- Real-time Socket.IO telemetry stream
- Add Project flow that generates `projectId`, `apiKey`, and agent env variables
- Secure `POST /api/ingest` endpoint for monitored apps to push metrics
- Live monitored project list with waiting/receiving status
- Live connection status and reconnect-aware UI
- Premium dark operations dashboard
- Metrics cards for API latency, CPU/load, memory, active users, error rate, and transactions per minute
- Responsive history chart
- Service health panel with operational, degraded, and incident states
- Real-time event feed with critical, warning, and info severities
- Pause/resume stream control
- Severity filter
- Clear events button
- Manual refresh using the `requestData` WebSocket event
- Optional protected polling fallback for older integrations
- Deployment-ready environment variables for separate frontend and backend hosting

## How Monitoring Works

Preferred flow:

```text
Monitored Backend
        |
        | PulseOps agent pushes metrics with projectId + API key
        v
PulseOps Express Ingestion API
        |
        | normalizes telemetry and emits "data"
        v
Socket.IO Server
        |
        | live WebSocket update
        v
React Dashboard
```

User flow:

1. Open PulseOps.
2. Click `Add project`.
3. Enter a project name.
4. PulseOps generates:
   - `PULSEOPS_PROJECT_ID`
   - `PULSEOPS_API_KEY`
   - `PULSEOPS_INGEST_URL`
   - `PULSEOPS_PUSH_INTERVAL_MS`
5. Add those values to the monitored backend environment.
6. The monitored backend agent pushes metrics to PulseOps.
7. PulseOps streams those metrics live to the dashboard with Socket.IO.

This avoids the security concern of exposing every monitored backend's private metrics URL.

## HTTP API

### `GET /health`

Health check for Render or uptime monitors.

### `GET /api/projects`

Returns projects known to the current PulseOps backend process and whether they are recently receiving agent data.

### `POST /api/projects`

Creates a monitoring project and returns setup credentials. The API key is shown once.

Example response:

```json
{
  "project": {
    "id": "project_abc123",
    "name": "Loadshedding Tracker",
    "status": "waiting",
    "ingestUrl": "https://your-pulseops-backend.onrender.com/api/ingest"
  },
  "envSnippet": "PULSEOPS_PROJECT_ID=project_abc123\nPULSEOPS_API_KEY=po.v1...\nPULSEOPS_INGEST_URL=https://your-pulseops-backend.onrender.com/api/ingest\nPULSEOPS_PUSH_INTERVAL_MS=5000"
}
```

### `POST /api/ingest`

Receives telemetry from a monitored backend agent.

Required headers:

```text
Authorization: Bearer <PULSEOPS_API_KEY>
x-pulseops-project-id: <PULSEOPS_PROJECT_ID>
```

## WebSocket Events

### Server to client: `data`

Emitted immediately on connection, on every live update, when an agent push arrives, and whenever the client asks for a manual refresh.

### Client to server: `requestData`

Sent when the user clicks Refresh. The server responds to that socket with a `data` payload whose `source` is `manual`.

### Built-in Socket.IO events

- `connect` updates the dashboard to a live state.
- `disconnect` keeps the last data visible while showing the connection loss.
- `connect_error` stores the connection error for the status indicator.

## Local Setup

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Run frontend and backend together

```bash
npm run dev
```

The backend runs on `http://localhost:3001` and the frontend runs on `http://localhost:5173`.

### Build frontend

```bash
npm run build
```

## Environment Variables

### Frontend

Copy `client/.env.example` to `client/.env` for local overrides, or set this in Vercel/Netlify:

```env
VITE_SOCKET_URL=https://your-pulseops-backend.onrender.com
```

Default local fallback:

```env
VITE_SOCKET_URL=http://localhost:3001
```

### PulseOps Backend

Copy `server/.env.example` to `server/.env` for local overrides, or set these in Render:

```env
PORT=3001
CLIENT_URL=https://your-pulseops-frontend.vercel.app
PUBLIC_PULSEOPS_URL=https://your-pulseops-backend.onrender.com
PULSEOPS_SIGNING_SECRET=replace-with-a-long-private-signing-secret
PULSEOPS_DEFAULT_PROJECT_ID=project_loadshedding_tracker
PULSEOPS_DEFAULT_API_KEY=replace-with-agent-api-key
PULSEOPS_DEFAULT_PROJECT_NAME=Loadshedding Tracker
INGESTION_STALE_AFTER_MS=30000
```

`PULSEOPS_SIGNING_SECRET` is used to verify API keys generated from the Add Project UI after the backend restarts. Keep it private and stable in Render.

Optional polling fallback:

```env
MONITORED_APP_NAME=Loadshedding Tracker
MONITORED_APP_URL=https://loadshedding-api-krv9.onrender.com
MONITORED_APP_TOKEN=your-shared-monitoring-token
MONITORING_POLL_INTERVAL_MS=5000
```

The agent push model is preferred. The polling variables can stay as a backup while migrating older monitored apps.

### Monitored Backend Agent

Add these values to the backend you want to monitor:

```env
PULSEOPS_PROJECT_ID=project_xxx
PULSEOPS_API_KEY=po.v1.xxx
PULSEOPS_INGEST_URL=https://your-pulseops-backend.onrender.com/api/ingest
PULSEOPS_PUSH_INTERVAL_MS=5000
```

The monitored backend pushes metrics outward to PulseOps. It does not need to expose a public `/metrics` URL.

## Deployment Guide

### Backend on Render

1. Create a new Render Web Service from this repository.
2. Set the root directory to `server`.
3. Use `npm install` as the build command.
4. Use `npm start` as the start command.
5. Add environment variables:
   - `CLIENT_URL=https://your-pulseops-frontend.vercel.app`
   - `PUBLIC_PULSEOPS_URL=https://your-pulseops-backend.onrender.com`
   - `PULSEOPS_SIGNING_SECRET=<long private random string>`
   - `PULSEOPS_DEFAULT_PROJECT_ID=project_loadshedding_tracker`
   - `PULSEOPS_DEFAULT_API_KEY=<same key used by the Loadshedding agent>`
   - `PULSEOPS_DEFAULT_PROJECT_NAME=Loadshedding Tracker`
   - `INGESTION_STALE_AFTER_MS=30000`
6. Deploy and confirm `https://your-pulseops-backend.onrender.com/health` works.

Render injects `PORT` automatically, so it usually does not need to be set manually.

### Frontend on Vercel

1. Import this repository into Vercel.
2. Set the root directory to `client`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Add:

```env
VITE_SOCKET_URL=https://your-pulseops-backend.onrender.com
```

6. Redeploy.

### Frontend on Netlify

The project also includes `client/netlify.toml`.

1. Create a Netlify site from this repository.
2. Set the base directory to `client`.
3. Add `VITE_SOCKET_URL=https://your-pulseops-backend.onrender.com`.
4. Deploy.

Do not set `VITE_SOCKET_URL` to `/health` or `/api/ingest`. Use only the backend origin.

## Loadshedding Tracker Agent Setup

For the current Loadshedding deployment, add these Render environment variables to the Loadshedding backend:

```env
PULSEOPS_PROJECT_ID=project_loadshedding_tracker
PULSEOPS_API_KEY=<same key configured in PulseOps as PULSEOPS_DEFAULT_API_KEY>
PULSEOPS_INGEST_URL=https://chatbot-dashboard-fv7x.onrender.com/api/ingest
PULSEOPS_PUSH_INTERVAL_MS=5000
```

The Loadshedding backend starts a PulseOps agent on boot. Every few seconds it builds a monitoring snapshot and pushes it to PulseOps.

## Scripts

- `npm run dev` starts the server and client together.
- `npm run dev:server` starts the Socket.IO backend.
- `npm run dev:client` starts the Vite frontend.
- `npm run build` builds the frontend.
- `npm run start` starts the backend.

## License and Attribution

This project remains MIT licensed. It is based on the original open-source repository [falakthkr/realtime-dashboard-websocket](https://github.com/falakthkr/realtime-dashboard-websocket), with custom PulseOps branding, operations-focused telemetry, UI redesign, agent ingestion flow, dashboard controls, and deployment documentation added for portfolio presentation.
