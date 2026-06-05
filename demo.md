# PulseOps Demo Guide

## Quick Demo

1. Start the application:
   ```bash
   npm run dev
   ```
2. Open `http://localhost:5173`.
3. Confirm the connection pill shows `Connected`.

## What to Show

### Live WebSocket Stream

- Metrics update every two seconds through Socket.IO.
- The chart keeps a rolling telemetry history.
- The event feed adds new operational messages as payloads arrive.

### Operations Metrics

- API latency
- CPU/load
- Memory pressure
- Active users
- Error rate
- Transactions per minute

### Service Health Alerts

- Review the operational, degraded, and incident statuses.
- Watch service latency and uptime change with the stream.

### Dashboard Controls

- Pause the live stream and verify the interface holds its current values.
- Click Refresh to request one manual `requestData` payload.
- Filter events by severity.
- Clear the event feed.

### Reconnection Test

1. Stop the backend terminal.
2. Watch the connection status change.
3. Restart the backend.
4. Confirm Socket.IO reconnects and telemetry resumes.

## Useful URLs

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:3001/health`
