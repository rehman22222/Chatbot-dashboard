# PulseOps Project Explanation

## What This Project Is

PulseOps is a real-time WebSocket monitoring dashboard. It can show simulated demo telemetry, or it can monitor a real deployed backend when monitoring environment variables are configured. In this setup, it is designed to monitor the Loadshedding Tracker backend by showing API latency, CPU/load estimate, memory usage, request traffic, error rate, service health, outage counts, area coverage, and event alerts.

The main purpose of the project is to demonstrate a full-stack real-time application using React on the frontend and Node.js with Socket.IO on the backend.

This is not a static dashboard. The backend either fetches real monitoring data from the Loadshedding Tracker API or generates fallback demo telemetry, then sends it to the frontend through Socket.IO. The frontend updates the UI immediately when new data arrives.

## What It Monitors

By default, PulseOps can run with simulated telemetry so the portfolio dashboard works without another app connected.

When connected to the Loadshedding Tracker project, PulseOps monitors that deployed backend, not the local laptop. It reads a protected endpoint from the Loadshedding API:

```text
GET /api/monitoring/metrics
```

The monitored Loadshedding services are:

- Loadshedding API
- MongoDB connection
- Auth Service
- Outage Service
- Area Search
- Feedback Service

The monitored values are:

- API request latency
- Requests per minute
- API error rate
- Backend memory usage
- Backend uptime
- MongoDB connection status
- Total users
- Premium users
- Total areas
- Total outages
- Active outages
- Scheduled outages
- Feedback count

## What It Is Used For

PulseOps simulates the kind of dashboard an operations, DevOps, SRE, or platform team might use to monitor a live system.

It can be used to show:

- Whether the frontend is connected to the backend in real time
- Current API performance
- System load and memory pressure
- Active user traffic
- Error rate and transaction volume
- Service health status
- Live incident or operational events
- Real-time charts based on incoming data

For a portfolio, this project shows practical knowledge of real-time systems, WebSocket communication, React state management, API server setup, environment configuration, and deployment preparation.

## Tech Stack Used

### Frontend

The frontend is built with:

- **React**: Used to build the dashboard UI with reusable components.
- **Vite**: Used as the frontend development server and production build tool.
- **Tailwind CSS**: Used for styling the dark professional dashboard interface.
- **Zustand**: Used for frontend state management.
- **Socket.IO Client**: Used to connect the React app to the backend WebSocket server.
- **Lucide React**: Used for clean dashboard icons.

### Backend

The backend is built with:

- **Node.js**: JavaScript runtime for the server.
- **Express**: Provides the HTTP server and health check endpoint.
- **Socket.IO**: Provides real-time bidirectional communication between backend and frontend.
- **CORS**: Controls which frontend URLs are allowed to connect to the backend.
- **dotenv**: Loads environment variables from `.env` files during local development.

## Project Structure

```text
realtime-dashboard-websocket/
|-- client/
|   |-- .env.example
|   |-- netlify.toml
|   |-- index.html
|   |-- package.json
|   |-- src/
|   |   |-- App.jsx
|   |   |-- index.css
|   |   |-- main.jsx
|   |   |-- components/
|   |   |   |-- ConnectionStatus.jsx
|   |   |   |-- Dashboard.jsx
|   |   |   |-- DashboardControls.jsx
|   |   |   |-- LiveDataTable.jsx
|   |   |   |-- LoadingSpinner.jsx
|   |   |   |-- MetricsCards.jsx
|   |   |   |-- MetricsChart.jsx
|   |   |   `-- ServiceHealth.jsx
|   |   |-- services/
|   |   |   `-- websocketService.js
|   |   `-- store/
|   |       `-- useDashboardStore.js
|-- server/
|   |-- .env.example
|   |-- package.json
|   `-- src/
|       `-- index.js
|-- README.md
|-- LICENSE
|-- package.json
`-- PROJECT_EXPLANATION.md
```

## How The Application Works

The app has two main parts:

1. The backend server fetches real Loadshedding monitoring data or generates fallback demo data.
2. The frontend dashboard receives that data through Socket.IO and updates the UI.

The flow looks like this:

```text
Loadshedding Backend on Render
        |
        | protected /api/monitoring/metrics endpoint
        v
PulseOps Node.js + Express + Socket.IO server
        |
        | emits "data" event every 2 seconds
        v
React + Vite frontend
        |
        | updates Zustand store
        v
Dashboard cards, chart, service health, and event feed update live
```

## How Socket.IO Is Working

Socket.IO is the most important part of this project.

The backend creates a Socket.IO server inside `server/src/index.js`:

```js
const io = new Server(server, {
  cors: corsOptions,
});
```

When a browser connects, the server listens for the connection:

```js
io.on('connection', (socket) => {
  socket.emit('data', generateOperationsData('initial'));
});
```

This means every new client immediately receives an initial dashboard payload.

The server also sends new data at the configured polling interval:

```js
setInterval(() => {
  io.emit('data', data);
}, MONITORING_POLL_INTERVAL_MS);
```

That `io.emit()` sends the `data` event to every connected client.

The frontend connects using `socket.io-client` inside `client/src/services/websocketService.js`. The app passes the backend URL from `App.jsx`:

```js
const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const socket = websocketService.connect(socketUrl);
```

Then the frontend listens for the server's `data` event:

```js
socket.on('data', (data) => {
  updateData(data);
});
```

When data arrives, Zustand stores it and the dashboard components automatically re-render.

## WebSocket Events Used

### `connect`

Triggered when the frontend successfully connects to the Socket.IO backend.

Used for:

- Showing the dashboard as connected
- Resetting connection errors
- Confirming that real-time updates are active

### `disconnect`

Triggered when the frontend loses connection to the backend.

Used for:

- Showing disconnected status
- Keeping the last known data visible
- Letting Socket.IO attempt reconnection

### `connect_error`

Triggered when Socket.IO cannot connect.

Used for:

- Showing connection error details
- Helping debug incorrect backend URLs or CORS settings

### `data`

Custom event sent from the backend to the frontend.

Used for:

- Metrics cards
- Chart history
- Service health status
- Event feed
- Last update timestamp

### `requestData`

Custom event sent from the frontend to the backend when the user clicks the Refresh button.

Used for:

- Manually requesting a fresh telemetry payload
- Proving the socket connection is bidirectional

## Data Being Generated

The backend can work in two modes.

### Real Monitoring Mode

If these variables are set in the PulseOps backend, it polls the Loadshedding Tracker backend:

```env
MONITORED_APP_NAME=Loadshedding Tracker
MONITORED_APP_URL=https://loadshedding-api-krv9.onrender.com
MONITORED_APP_TOKEN=your-shared-monitoring-token
MONITORING_POLL_INTERVAL_MS=5000
```

PulseOps sends the token to Loadshedding as:

```text
Authorization: Bearer <MONITORED_APP_TOKEN>
```

The Loadshedding backend must have the same value as:

```env
MONITORING_TOKEN=your-shared-monitoring-token
```

### Demo Fallback Mode

If the monitored app URL or token is missing, PulseOps generates realistic operations data instead of generic random numbers. This keeps the dashboard usable for demos even when the monitored app is unavailable.

Example fields:

- `apiLatency`: Simulated API response latency in milliseconds
- `cpuLoad`: Simulated compute load percentage
- `memoryUsage`: Simulated memory usage percentage
- `activeUsers`: Simulated number of active users
- `errorRate`: Simulated API error percentage
- `transactionsPerMinute`: Simulated transaction volume
- `services`: Health data for individual services
- `events`: Live event feed messages
- `summary`: Overall health summary

Example payload:

```js
{
  source: "stream",
  timestamp: "2026-06-05T17:30:00.000Z",
  metrics: {
    apiLatency: 146.2,
    cpuLoad: 51.4,
    memoryUsage: 64.8,
    activeUsers: 1904,
    errorRate: 0.62,
    transactionsPerMinute: 1420
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
      severity: "info",
      service: "API Gateway",
      message: "Synthetic checkout probe completed within SLA"
    }
  ]
}
```

## Frontend State Management

The frontend uses Zustand in `client/src/store/useDashboardStore.js`.

The store manages:

- Connection state
- Latest telemetry payload
- Historical chart data
- Event log
- Pause/resume state
- Severity filter
- Loading and error states

When new socket data arrives, `updateData()` saves it into the store. Components such as `MetricsCards`, `MetricsChart`, `ServiceHealth`, and `LiveDataTable` read from the same store and update automatically.

## Main Frontend Components

### `App.jsx`

Main application shell.

Responsibilities:

- Reads `VITE_SOCKET_URL`
- Connects to Socket.IO
- Registers socket event listeners
- Renders the main dashboard layout

### `ConnectionStatus.jsx`

Shows whether the dashboard is connected, connecting, disconnected, or in an error state.

### `Dashboard.jsx`

Main dashboard layout.

It combines:

- Controls
- Metrics cards
- Chart
- Service health panel
- Event feed

### `DashboardControls.jsx`

Contains user controls:

- Pause live stream
- Resume live stream
- Filter events by severity
- Clear events
- Request manual refresh

### `MetricsCards.jsx`

Displays the main operation metrics:

- API latency
- CPU/load
- Memory
- Active users
- Error rate
- Transactions per minute

### `MetricsChart.jsx`

Displays historical telemetry data as a responsive SVG chart.

### `ServiceHealth.jsx`

Shows health status for services such as:

- API Gateway
- Auth Service
- Payments API
- Orders Worker
- Postgres Cluster
- Edge Cache

### `LiveDataTable.jsx`

Shows the real-time event feed with severity labels.

## Dashboard Controls

### Pause / Resume

Pause stops stream updates from changing the dashboard. The socket connection remains active, but regular stream updates are ignored until the user resumes.

### Severity Filter

Filters the event feed by:

- All events
- Critical
- Warning
- Info

### Clear Events

Removes events from the local frontend event log.

### Manual Refresh

Sends this event to the backend:

```js
websocketService.emit('requestData');
```

The backend responds with a fresh `data` payload.

## Backend API

The backend has one HTTP endpoint:

```text
GET /health
```

It returns:

```json
{
  "service": "PulseOps WebSocket API",
  "status": "ok",
  "timestamp": "2026-06-05T17:30:00.000Z"
}
```

This endpoint is useful for checking whether the Render backend is running.

## Environment Variables

### Client

File:

```text
client/.env.example
```

Variable:

```env
VITE_SOCKET_URL=http://localhost:3001
```

Purpose:

- Tells the frontend where the Socket.IO backend is hosted.
- In production, this should be your Render backend URL.

Example production value:

```env
VITE_SOCKET_URL=https://your-render-backend.onrender.com
```

### Server

File:

```text
server/.env.example
```

Variables:

```env
PORT=3001
CLIENT_URL=http://localhost:5173,https://your-pulseops-site.netlify.app
```

Purpose:

- `PORT`: Defines the backend server port.
- `CLIENT_URL`: Defines which frontend URLs are allowed by CORS.

The server always allows local development origins:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

Production Netlify URLs should be added through `CLIENT_URL`.

## CORS Configuration

CORS is used so the backend only accepts browser connections from approved frontend origins.

In local development, the frontend runs on:

```text
http://localhost:5173
```

In production, the frontend might run on:

```text
https://your-pulseops-site.netlify.app
```

The backend combines local origins with `CLIENT_URL`, then allows only those origins.

This is important because the frontend and backend are deployed separately.

## Deployment Setup

### Backend: Render

Render runs the Node.js backend.

Recommended settings:

```text
Root Directory: server
Build Command: npm install
Start Command: npm start
```

Environment variable:

```env
CLIENT_URL=https://your-netlify-site.netlify.app
```

Render usually provides `PORT` automatically, so it does not need to be manually set.

### Frontend: Netlify

Netlify runs the React/Vite frontend.

The project includes:

```text
client/netlify.toml
```

It configures:

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

Environment variable:

```env
VITE_SOCKET_URL=https://your-render-backend.onrender.com
```

The frontend must point to the backend origin, not the `/health` endpoint.

Correct:

```env
VITE_SOCKET_URL=https://your-render-backend.onrender.com
```

Incorrect:

```env
VITE_SOCKET_URL=https://your-render-backend.onrender.com/health
```

## How To Run Locally

Install dependencies:

```bash
npm install
```

Run backend and frontend together:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

Backend health check:

```text
http://localhost:3001/health
```

## How To Build

Build the frontend:

```bash
npm run build
```

The production frontend files are generated in:

```text
client/dist
```

## Why This Project Is Good For A Portfolio

This project demonstrates:

- Full-stack JavaScript development
- Real-time WebSocket communication
- Socket.IO event handling
- React component architecture
- Centralized state management with Zustand
- Responsive UI design
- Environment-based deployment configuration
- Separate frontend and backend hosting
- Professional documentation
- Open-source attribution and MIT license awareness

## Important Notes

- Socket.IO must remain in the project because real-time communication is the main feature.
- The metrics are simulated only when no monitored app is configured. With Loadshedding configured, PulseOps displays real metrics from that backend.
- The frontend and backend can be deployed independently.
- The dashboard updates through live socket events, not static JSON files.
- The backend health endpoint is for uptime checks only.
- The frontend connects to the backend using `VITE_SOCKET_URL`.
