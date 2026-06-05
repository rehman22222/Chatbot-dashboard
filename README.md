# PulseOps - Real-Time WebSocket Monitoring Dashboard

PulseOps is a polished portfolio-ready monitoring dashboard built with React, Express, and Socket.IO. It streams live operations telemetry from a Node.js backend to a dark professional dashboard, showing API latency, infrastructure load, memory pressure, active users, error rate, transactions per minute, service health, and incident-style event updates.

The application is intentionally still real-time: the backend emits Socket.IO updates every two seconds, the frontend keeps a rolling history for charts, and operators can pause the live view, filter events, clear the feed, or manually request a fresh payload.

## Tech Stack

- React 18 and Vite
- Tailwind CSS
- Zustand state management
- Socket.IO client and server
- Node.js and Express
- CORS and dotenv for deployment configuration

## Features

- Real-time Socket.IO telemetry stream
- Live connection status and reconnect-aware UI
- Premium dark operations dashboard
- Metrics cards for API latency, CPU/load, memory, active users, error rate, and transactions per minute
- Responsive SVG history chart
- Service health panel with operational, degraded, and incident states
- Real-time event feed with critical, warning, and info severities
- Pause/resume stream control
- Severity filter
- Clear events button
- Manual refresh using the existing `requestData` WebSocket event
- Deployment-ready environment variables for separate frontend and backend hosting
- Optional real monitoring mode for the deployed Loadshedding Tracker backend

## WebSocket Events

PulseOps keeps the original Socket.IO pattern simple and easy to inspect.

### Server to client: `data`

Emitted immediately on connection, every two seconds afterward, and whenever the client asks for a manual refresh.

```js
{
  source: "stream", // "initial", "stream", or "manual"
  timestamp: "2026-06-04T14:20:00.000Z",
  metrics: {
    apiLatency: 142.5,
    cpuLoad: 48.2,
    memoryUsage: 62.1,
    activeUsers: 1840,
    errorRate: 0.42,
    transactionsPerMinute: 1280
  },
  services: [
    {
      name: "API Gateway",
      region: "us-east-1",
      latency: 128.4,
      status: "operational",
      uptime: 99.98
    }
  ],
  events: [
    {
      id: "1780000000000-1",
      severity: "info",
      type: "info",
      service: "API Gateway",
      message: "Synthetic checkout probe completed within SLA",
      source: "stream",
      timestamp: "2026-06-04T14:20:00.000Z"
    }
  ],
  summary: {
    status: "operational",
    incidentCount: 0,
    degradedCount: 0,
    healthyServices: 6,
    totalServices: 6
  }
}
```

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

### Run separately

```bash
npm run dev:server
npm run dev:client
```

### Build frontend

```bash
npm run build
```

## Environment Variables

### Frontend

Copy `client/.env.example` to `client/.env` for local overrides, or set this in Netlify.

```env
VITE_SOCKET_URL=https://your-pulseops-backend.onrender.com
```

Default local fallback:

```env
VITE_SOCKET_URL=http://localhost:3001
```

### Backend

Copy `server/.env.example` to `server/.env` for local overrides, or set these in Render.

```env
PORT=3001
CLIENT_URL=https://your-pulseops-frontend.netlify.app
MONITORED_APP_NAME=Loadshedding Tracker
MONITORED_APP_URL=https://loadshedding-api-krv9.onrender.com
MONITORED_APP_TOKEN=your-shared-monitoring-token
MONITORING_POLL_INTERVAL_MS=5000
```

The server always allows local Vite origins for development. `CLIENT_URL` adds your production frontend origin and may contain comma-separated origins:

```env
CLIENT_URL=http://localhost:5173,https://your-pulseops-frontend.netlify.app
```

If `MONITORED_APP_URL` and `MONITORED_APP_TOKEN` are set, PulseOps polls the monitored app at:

```text
GET /api/monitoring/metrics
```

and streams those real metrics to the dashboard through Socket.IO. If either value is missing, PulseOps falls back to simulated portfolio telemetry.

## Deployment Guide

### Backend on Render

1. Create a new Web Service from this repository.
2. Set the root directory to `server`.
3. Use `npm install` as the build command.
4. Use `npm start` as the start command.
5. Add environment variables:
   - `PORT` can usually be left unset because Render injects it automatically.
   - `CLIENT_URL=https://your-pulseops-frontend.netlify.app`
   - `MONITORED_APP_NAME=Loadshedding Tracker`
   - `MONITORED_APP_URL=https://loadshedding-api-krv9.onrender.com`
   - `MONITORED_APP_TOKEN=<same token configured as MONITORING_TOKEN in Loadshedding>`
   - `MONITORING_POLL_INTERVAL_MS=5000`
6. Deploy and copy the backend URL.
7. Confirm the health check works at `https://your-backend-url/health`.

### Frontend on Netlify

1. Create a new Netlify site from this repository.
2. Set the base directory to `client`.
3. Netlify can use `client/netlify.toml`, which sets:
   - build command: `npm run build`
   - publish directory: `dist`
   - SPA fallback redirects to `index.html`
4. Add `VITE_SOCKET_URL=https://your-render-backend.onrender.com`.
5. Deploy the site.

### Deployment Order

1. Pick or create the Netlify site URL first, such as `https://your-pulseops-frontend.netlify.app`.
2. Deploy the Render backend with `CLIENT_URL` set to that Netlify URL.
3. Deploy the Netlify frontend with `VITE_SOCKET_URL` set to the Render backend URL.
4. Open the Netlify URL and verify the status pill says `Connected`.

Do not set `VITE_SOCKET_URL` to the Render health endpoint. Use the backend origin only, for example `https://your-render-backend.onrender.com`.

### Loadshedding Tracker Monitoring Setup

The Loadshedding backend must expose a protected monitoring endpoint:

```text
GET https://loadshedding-api-krv9.onrender.com/api/monitoring/metrics
Authorization: Bearer <MONITORING_TOKEN>
```

Set the same secret in both places:

- Loadshedding Render backend: `MONITORING_TOKEN`
- PulseOps Render backend: `MONITORED_APP_TOKEN`

This keeps the monitoring endpoint private while allowing PulseOps to poll it server-to-server.

## Scripts

Root workspace:

- `npm run dev` starts the server and client together.
- `npm run dev:server` starts the Socket.IO backend.
- `npm run dev:client` starts the Vite frontend.
- `npm run build` builds the frontend.
- `npm run start` starts the backend.

## Project Structure

```text
realtime-dashboard-websocket/
|-- client/
|   |-- .env.example
|   |-- netlify.toml
|   |-- src/
|   |   |-- components/
|   |   |-- services/websocketService.js
|   |   |-- store/useDashboardStore.js
|   |   |-- App.jsx
|   |   `-- index.css
|   |-- index.html
|   `-- package.json
|-- server/
|   |-- .env.example
|   |-- src/index.js
|   `-- package.json
|-- package.json
|-- LICENSE
`-- README.md
```

## License and Attribution

This project remains MIT licensed. It is based on the original open-source repository [falakthkr/realtime-dashboard-websocket](https://github.com/falakthkr/realtime-dashboard-websocket), with custom PulseOps branding, operations-focused telemetry, UI redesign, dashboard controls, and deployment documentation added for portfolio presentation.
