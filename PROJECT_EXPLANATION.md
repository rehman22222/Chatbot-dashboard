# PulseOps Project Explanation

## What This Project Is

PulseOps is a real-time WebSocket monitoring dashboard. It can show demo telemetry, but the professional use case is monitoring deployed backend projects through a small agent that pushes metrics into PulseOps.

It does **not** monitor your laptop by default. It monitors whichever backend project is connected to it. In the current setup, it is prepared to monitor the deployed Loadshedding Tracker backend.

The main purpose of the project is to demonstrate a full-stack real-time application using React on the frontend and Node.js, Express, and Socket.IO on the backend.

## What It Is Monitoring

PulseOps monitors application/backend health, not personal device health.

For the Loadshedding Tracker project, it monitors:

- API latency
- requests per minute
- API error rate
- backend uptime
- memory usage
- CPU/load estimate
- MongoDB connection status
- total users
- premium users
- total areas
- total outages
- active outages
- scheduled outages
- feedback count
- active purchases

So when the dashboard says `Loadshedding Tracker`, it means it is showing health data from that deployed backend service.

## Preferred Architecture: Agent Push

The recommended approach is:

```text
Monitored Backend
        |
        | pushes metrics using PulseOps agent credentials
        v
PulseOps /api/ingest
        |
        | emits Socket.IO "data" event
        v
React dashboard updates live
```

This is better than asking users to expose a public metrics URL.

Instead of requiring a monitored app to expose its backend URL, PulseOps gives the user a project ID and API key. The monitored app uses those credentials to push telemetry to PulseOps from inside its own backend.

## Add Project Flow

In the PulseOps UI, the user can click `Add project`.

PulseOps creates:

- `PULSEOPS_PROJECT_ID`
- `PULSEOPS_API_KEY`
- `PULSEOPS_INGEST_URL`
- `PULSEOPS_PUSH_INTERVAL_MS`

The user places those values in the backend environment of the project they want to monitor.

Example:

```env
PULSEOPS_PROJECT_ID=project_loadshedding_tracker
PULSEOPS_API_KEY=po.v1.generated-key
PULSEOPS_INGEST_URL=https://chatbot-dashboard-fv7x.onrender.com/api/ingest
PULSEOPS_PUSH_INTERVAL_MS=5000
```

After that, the monitored backend pushes metrics to PulseOps every few seconds.

## Why This Is Safer

With the agent-push model:

- The monitored app does not need to expose a public `/metrics` URL.
- The monitored app does not need to share its private backend URL with users.
- PulseOps only accepts pushes with a valid project ID and API key.
- The dashboard still receives live data through Socket.IO.

For a real commercial product, you would also add login/authentication and store projects in a database. For this portfolio version, generated keys are signed by a server secret and active project status is kept in memory.

## How Socket.IO Is Working

Socket.IO is still the main real-time feature.

The backend creates a Socket.IO server inside `server/src/index.js`:

```js
const io = new Server(server, {
  cors: corsOptions,
});
```

When a browser connects, the server sends an initial payload:

```js
io.on('connection', (socket) => {
  socket.emit('data', data);
});
```

When the PulseOps backend receives agent telemetry at `/api/ingest`, it immediately broadcasts the normalized dashboard payload:

```js
io.emit('data', data);
```

The frontend connects with `socket.io-client`:

```js
const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const socket = websocketService.connect(socketUrl);
```

Then it listens for the `data` event:

```js
socket.on('data', (data) => {
  updateData(data);
});
```

Zustand stores the latest payload, chart history, and event feed. React components re-render automatically when new Socket.IO data arrives.

## HTTP Endpoints In PulseOps

### `GET /health`

Checks whether the PulseOps backend is running.

### `GET /api/projects`

Returns projects known by PulseOps and whether each one is currently:

- `waiting`: created but no recent agent push
- `receiving`: recent telemetry has arrived

### `POST /api/projects`

Creates a new monitored project and returns the env variables needed by the monitored backend.

### `POST /api/ingest`

Receives metrics from a monitored backend agent.

Required:

```text
Authorization: Bearer <PULSEOPS_API_KEY>
x-pulseops-project-id: <PULSEOPS_PROJECT_ID>
```

## Loadshedding Tracker Integration

The Loadshedding backend now has a PulseOps agent.

On server startup, it checks for:

```env
PULSEOPS_PROJECT_ID
PULSEOPS_API_KEY
PULSEOPS_INGEST_URL
PULSEOPS_PUSH_INTERVAL_MS
```

If those values exist, the agent starts. It builds a monitoring snapshot from the Loadshedding backend and pushes it to PulseOps.

The snapshot includes:

- database status
- runtime memory
- CPU/load estimate
- request latency
- error rate
- user/outage/business counts

The older protected endpoint `/api/monitoring/metrics` still exists as a fallback, but the preferred model is now the outbound agent.

## Frontend Controls

PulseOps includes:

- pause/resume live stream
- severity filter
- clear events
- manual refresh
- Add Project modal
- monitored project status list

Pause only stops the UI from applying stream updates. It does not disconnect Socket.IO.

## Environment Variables

### PulseOps Frontend

```env
VITE_SOCKET_URL=https://chatbot-dashboard-fv7x.onrender.com
```

This tells the frontend where the PulseOps backend is hosted.

### PulseOps Backend

```env
CLIENT_URL=https://chatbot-dashboard-client-six.vercel.app
PUBLIC_PULSEOPS_URL=https://chatbot-dashboard-fv7x.onrender.com
PULSEOPS_SIGNING_SECRET=your-private-signing-secret
PULSEOPS_DEFAULT_PROJECT_ID=project_loadshedding_tracker
PULSEOPS_DEFAULT_API_KEY=your-private-agent-key
PULSEOPS_DEFAULT_PROJECT_NAME=Loadshedding Tracker
INGESTION_STALE_AFTER_MS=30000
```

### Loadshedding Backend

```env
PULSEOPS_PROJECT_ID=project_loadshedding_tracker
PULSEOPS_API_KEY=your-private-agent-key
PULSEOPS_INGEST_URL=https://chatbot-dashboard-fv7x.onrender.com/api/ingest
PULSEOPS_PUSH_INTERVAL_MS=5000
```

## Real-World Use Cases

PulseOps could monitor:

- an e-commerce backend
- a SaaS API
- a school portal backend
- a chatbot API
- a payment service
- a scheduled worker service
- a database-backed admin dashboard

Any backend can connect if it can collect metrics and send a JSON payload to PulseOps.

## What Makes It Portfolio-Ready

This project demonstrates:

- full-stack JavaScript
- real-time WebSocket communication
- Socket.IO client/server events
- secure-ish agent credential flow
- backend ingestion API design
- React component architecture
- Zustand state management
- deployment configuration for Render and Vercel/Netlify
- operational dashboard UI design
- open-source attribution and MIT license awareness

## Important Notes

- Socket.IO remains the main selling point.
- The dashboard is not static.
- The monitored backend pushes metrics to PulseOps.
- PulseOps broadcasts those metrics live to connected browsers.
- Generated project status is stored in memory in this portfolio version.
- For a real multi-user product, add auth and persistent project storage.
