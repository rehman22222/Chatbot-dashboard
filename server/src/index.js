import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3001;
const MONITORED_APP_NAME = process.env.MONITORED_APP_NAME || 'Loadshedding Tracker';
const MONITORED_APP_URL = (process.env.MONITORED_APP_URL || '').replace(/\/+$/, '');
const MONITORED_APP_TOKEN = process.env.MONITORED_APP_TOKEN || '';
const MONITORING_POLL_INTERVAL_MS = Number(process.env.MONITORING_POLL_INTERVAL_MS) || 5000;
const LOCAL_CLIENT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const configuredClientOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...LOCAL_CLIENT_ORIGINS, ...configuredClientOrigins])];

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by PulseOps CORS policy`));
  },
  methods: ['GET', 'POST'],
};

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

app.use(cors(corsOptions));
app.use(express.json());

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const jitter = (value, amount, min, max) =>
  Number(clamp(value + (Math.random() - 0.5) * amount, min, max).toFixed(2));
const hasMonitoredAppConfig = Boolean(MONITORED_APP_URL && MONITORED_APP_TOKEN);

const services = [
  { name: 'API Gateway', region: 'us-east-1', baseLatency: 118 },
  { name: 'Auth Service', region: 'us-east-1', baseLatency: 82 },
  { name: 'Payments API', region: 'us-west-2', baseLatency: 146 },
  { name: 'Orders Worker', region: 'us-central-1', baseLatency: 96 },
  { name: 'Postgres Cluster', region: 'us-east-1', baseLatency: 42 },
  { name: 'Edge Cache', region: 'global', baseLatency: 28 },
];

const state = {
  apiLatency: 142,
  cpuLoad: 48,
  memoryUsage: 62,
  activeUsers: 1840,
  errorRate: 0.42,
  transactionsPerMinute: 1280,
  sequence: 0,
};

function generateServiceHealth(metrics) {
  return services.map((service, index) => {
    const latency = jitter(
      service.baseLatency + metrics.apiLatency * (index === 0 ? 0.55 : 0.18),
      34,
      18,
      520,
    );

    const pressure =
      metrics.cpuLoad * 0.25 +
      metrics.memoryUsage * 0.2 +
      metrics.errorRate * 16 +
      latency * 0.08;

    const status =
      pressure > 95 || latency > 420
        ? 'incident'
        : pressure > 72 || latency > 260
          ? 'degraded'
          : 'operational';

    return {
      ...service,
      latency,
      status,
      uptime: Number(clamp(99.99 - metrics.errorRate * (index + 1) * 0.03, 97.5, 99.99).toFixed(2)),
    };
  });
}

function generateEvent(metrics, serviceHealth, source) {
  const unhealthyServices = serviceHealth.filter((service) => service.status !== 'operational');
  const service = unhealthyServices[0] || serviceHealth[Math.floor(Math.random() * serviceHealth.length)];
  const timestamp = new Date().toISOString();

  const candidates = [
    {
      severity: metrics.errorRate >= 3 ? 'critical' : 'warning',
      service: 'API Gateway',
      message: `Error rate is ${metrics.errorRate.toFixed(2)}% across the public API`,
      condition: metrics.errorRate > 1.8,
    },
    {
      severity: metrics.apiLatency >= 320 ? 'critical' : 'warning',
      service: 'API Gateway',
      message: `P95 latency reached ${Math.round(metrics.apiLatency)} ms`,
      condition: metrics.apiLatency > 220,
    },
    {
      severity: metrics.cpuLoad >= 86 ? 'critical' : 'warning',
      service: 'Orders Worker',
      message: `Compute load is ${metrics.cpuLoad.toFixed(1)}% during queue processing`,
      condition: metrics.cpuLoad > 72,
    },
    {
      severity: metrics.memoryUsage >= 88 ? 'critical' : 'warning',
      service: 'Postgres Cluster',
      message: `Memory pressure is ${metrics.memoryUsage.toFixed(1)}% on primary nodes`,
      condition: metrics.memoryUsage > 76,
    },
    {
      severity: service.status === 'incident' ? 'critical' : 'warning',
      service: service.name,
      message: `${service.name} is ${service.status} in ${service.region}`,
      condition: service.status !== 'operational',
    },
  ];

  const triggered = candidates.find((candidate) => candidate.condition);

  if (triggered) {
    return {
      id: `${Date.now()}-${state.sequence}`,
      severity: triggered.severity,
      type: triggered.severity,
      service: triggered.service,
      message: triggered.message,
      source,
      timestamp,
    };
  }

  const healthyMessages = [
    'Autoscaling policy evaluated with no action needed',
    'Synthetic checkout probe completed within SLA',
    'Background reconciliation batch finished successfully',
    'CDN cache hit ratio remains above target',
    'Database replica lag is inside operating threshold',
  ];

  return {
    id: `${Date.now()}-${state.sequence}`,
    severity: 'info',
    type: 'info',
    service: service.name,
    message: healthyMessages[Math.floor(Math.random() * healthyMessages.length)],
    source,
    timestamp,
  };
}

function generateOperationsData(source = 'stream') {
  state.sequence += 1;

  const trafficWave = Math.sin(state.sequence / 6);
  const incidentSpike = Math.random() > 0.92 ? Math.random() * 55 : 0;

  state.activeUsers = Math.round(jitter(state.activeUsers + trafficWave * 42, 180, 900, 4200));
  state.transactionsPerMinute = Math.round(
    clamp(state.activeUsers * jitter(0.62, 0.1, 0.48, 0.82) + Math.random() * 180, 450, 5200),
  );
  state.cpuLoad = jitter(state.cpuLoad + trafficWave * 1.8 + incidentSpike * 0.12, 11, 18, 96);
  state.memoryUsage = jitter(state.memoryUsage + trafficWave * 0.9 + incidentSpike * 0.06, 7, 34, 94);
  state.apiLatency = jitter(
    82 + state.cpuLoad * 1.6 + state.errorRate * 24 + trafficWave * 16 + incidentSpike,
    36,
    55,
    520,
  );
  state.errorRate = jitter(
    state.errorRate + (incidentSpike > 0 ? 1.4 : -0.12) + (state.cpuLoad > 80 ? 0.18 : -0.03),
    0.38,
    0.02,
    6.8,
  );

  const metrics = {
    apiLatency: state.apiLatency,
    cpuLoad: state.cpuLoad,
    memoryUsage: state.memoryUsage,
    activeUsers: state.activeUsers,
    errorRate: state.errorRate,
    transactionsPerMinute: state.transactionsPerMinute,
  };

  const serviceHealth = generateServiceHealth(metrics);
  const incidentCount = serviceHealth.filter((service) => service.status === 'incident').length;
  const degradedCount = serviceHealth.filter((service) => service.status === 'degraded').length;
  const event = generateEvent(metrics, serviceHealth, source);
  const timestamp = new Date().toISOString();

  return {
    source,
    timestamp,
    metrics,
    services: serviceHealth,
    events: [event],
    summary: {
      status: incidentCount > 0 ? 'incident' : degradedCount > 0 ? 'degraded' : 'operational',
      incidentCount,
      degradedCount,
      healthyServices: serviceHealth.length - incidentCount - degradedCount,
      totalServices: serviceHealth.length,
    },
    users: state.activeUsers,
    transactions: state.transactionsPerMinute,
  };
}

function mapMonitoredStatus(status) {
  if (status === 'operational' || status === 'healthy') return 'operational';
  if (status === 'incident' || status === 'down' || status === 'unhealthy') return 'incident';
  return 'degraded';
}

function serviceFromMonitoredData(name, status, latency = 0, region = 'render') {
  return {
    name,
    region,
    latency: Number(latency || 0),
    status: mapMonitoredStatus(status),
    uptime: mapMonitoredStatus(status) === 'incident' ? 98.5 : mapMonitoredStatus(status) === 'degraded' ? 99.4 : 99.99,
  };
}

function eventFromMonitoredData(payload, source, latencyMs) {
  const timestamp = new Date().toISOString();
  const traffic = payload.traffic || {};
  const runtime = payload.runtime || {};
  const business = payload.business || {};
  const services = payload.services || {};
  const mongoStatus = services.mongodb?.status;

  if (!payload.ok || payload.status !== 'healthy') {
    return {
      id: `${Date.now()}-${source}`,
      severity: 'critical',
      type: 'critical',
      service: MONITORED_APP_NAME,
      message: `${MONITORED_APP_NAME} reported ${payload.status || 'unhealthy'} status`,
      source,
      timestamp,
    };
  }

  if (mongoStatus && mapMonitoredStatus(mongoStatus) !== 'operational') {
    return {
      id: `${Date.now()}-${source}`,
      severity: 'critical',
      type: 'critical',
      service: 'MongoDB',
      message: `MongoDB connection is ${services.mongodb.connectionState || mongoStatus}`,
      source,
      timestamp,
    };
  }

  if ((traffic.errorRate || 0) >= 3) {
    return {
      id: `${Date.now()}-${source}`,
      severity: 'warning',
      type: 'warning',
      service: 'Loadshedding API',
      message: `API error rate is ${traffic.errorRate.toFixed(2)}% over the last ${traffic.windowSeconds || 60}s`,
      source,
      timestamp,
    };
  }

  if ((traffic.p95LatencyMs || latencyMs) >= 1500) {
    return {
      id: `${Date.now()}-${source}`,
      severity: 'warning',
      type: 'warning',
      service: 'Loadshedding API',
      message: `P95 latency reached ${Math.round(traffic.p95LatencyMs || latencyMs)} ms`,
      source,
      timestamp,
    };
  }

  return {
    id: `${Date.now()}-${source}`,
    severity: 'info',
    type: 'info',
    service: MONITORED_APP_NAME,
    message: `${business.totalOutages || 0} outages across ${business.totalAreas || 0} monitored areas`,
    source,
    timestamp,
  };
}

function normalizeMonitoredPayload(payload, source, requestLatencyMs) {
  const traffic = payload.traffic || {};
  const runtime = payload.runtime || {};
  const business = payload.business || {};
  const services = payload.services || {};
  const apiLatency = Number(traffic.p95LatencyMs || traffic.averageLatencyMs || requestLatencyMs || 0);
  const cpuLoad = Number(runtime.cpu?.loadPercentEstimate || 0);
  const memoryUsage = Number(runtime.hostMemory?.usedPercent || runtime.nodeMemory?.heapUsedPercent || 0);
  const requestsPerMinute = Number(traffic.requestsPerMinute || 0);
  const totalUsers = Number(business.totalUsers || 0);
  const errorRate = Number(traffic.errorRate || 0);

  const serviceHealth = [
    serviceFromMonitoredData('Loadshedding API', services.api?.status || payload.status, apiLatency),
    serviceFromMonitoredData('MongoDB', services.mongodb?.status || 'degraded', 0, services.mongodb?.connectionState || 'render'),
    serviceFromMonitoredData('Auth Service', services.auth?.status || 'operational', apiLatency * 0.6),
    serviceFromMonitoredData('Outage Service', services.outages?.status || 'operational', apiLatency * 0.75),
    serviceFromMonitoredData('Area Search', services.areas?.status || 'operational', apiLatency * 0.7),
    serviceFromMonitoredData('Feedback Service', services.feedback?.status || 'operational', apiLatency * 0.5),
  ];
  const incidentCount = serviceHealth.filter((service) => service.status === 'incident').length;
  const degradedCount = serviceHealth.filter((service) => service.status === 'degraded').length;
  const timestamp = payload.timestamp || new Date().toISOString();

  return {
    source,
    timestamp,
    mode: 'monitored',
    monitoredApp: {
      name: payload.app || MONITORED_APP_NAME,
      url: MONITORED_APP_URL,
      status: payload.status || 'unknown',
      uptimeSeconds: runtime.uptimeSeconds || 0,
    },
    metrics: {
      apiLatency,
      cpuLoad,
      memoryUsage,
      activeUsers: totalUsers,
      errorRate,
      transactionsPerMinute: requestsPerMinute,
      totalUsers,
      activeOutages: business.activeOutages || 0,
      scheduledOutages: business.scheduledOutages || 0,
      totalAreas: business.totalAreas || 0,
    },
    services: serviceHealth,
    events: [eventFromMonitoredData(payload, source, requestLatencyMs)],
    summary: {
      status: incidentCount > 0 ? 'incident' : degradedCount > 0 ? 'degraded' : 'operational',
      incidentCount,
      degradedCount,
      healthyServices: serviceHealth.length - incidentCount - degradedCount,
      totalServices: serviceHealth.length,
    },
    users: totalUsers,
    transactions: requestsPerMinute,
  };
}

async function fetchMonitoredAppData(source = 'stream') {
  if (!hasMonitoredAppConfig) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const startedAt = Date.now();

  try {
    const response = await fetch(`${MONITORED_APP_URL}/api/monitoring/metrics`, {
      headers: {
        Authorization: `Bearer ${MONITORED_APP_TOKEN}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    const requestLatencyMs = Date.now() - startedAt;

    if (!response.ok) {
      throw new Error(`Monitoring endpoint returned ${response.status}`);
    }

    const payload = await response.json();
    return normalizeMonitoredPayload(payload, source, requestLatencyMs);
  } catch (error) {
    const timestamp = new Date().toISOString();

    return {
      source,
      timestamp,
      mode: 'monitored',
      monitoredApp: {
        name: MONITORED_APP_NAME,
        url: MONITORED_APP_URL,
        status: 'unreachable',
        error: error.message,
      },
      metrics: {
        apiLatency: 0,
        cpuLoad: 0,
        memoryUsage: 0,
        activeUsers: 0,
        errorRate: 100,
        transactionsPerMinute: 0,
      },
      services: [
        serviceFromMonitoredData('Loadshedding API', 'incident', 0),
        serviceFromMonitoredData('MongoDB', 'degraded', 0, 'unknown'),
        serviceFromMonitoredData('Auth Service', 'degraded', 0),
        serviceFromMonitoredData('Outage Service', 'degraded', 0),
        serviceFromMonitoredData('Area Search', 'degraded', 0),
        serviceFromMonitoredData('Feedback Service', 'degraded', 0),
      ],
      events: [
        {
          id: `${Date.now()}-${source}`,
          severity: 'critical',
          type: 'critical',
          service: MONITORED_APP_NAME,
          message: `Could not reach monitoring endpoint: ${error.message}`,
          source,
          timestamp,
        },
      ],
      summary: {
        status: 'incident',
        incidentCount: 1,
        degradedCount: 5,
        healthyServices: 0,
        totalServices: 6,
      },
      users: 0,
      transactions: 0,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function getDashboardData(source = 'stream') {
  const monitoredData = await fetchMonitoredAppData(source);
  return monitoredData || generateOperationsData(source);
}

app.get('/health', (req, res) => {
  res.json({
    service: 'PulseOps WebSocket API',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

io.on('connection', (socket) => {
  console.log(`PulseOps client connected: ${socket.id}`);

  getDashboardData('initial')
    .then((data) => socket.emit('data', data))
    .catch((error) => socket.emit('error', { message: error.message }));

  socket.on('requestData', () => {
    getDashboardData('manual')
      .then((data) => socket.emit('data', data))
      .catch((error) => socket.emit('error', { message: error.message }));
  });

  socket.on('disconnect', (reason) => {
    console.log(`PulseOps client disconnected: ${socket.id} (${reason})`);
  });
});

setInterval(async () => {
  const data = await getDashboardData('stream');
  io.emit('data', data);
}, MONITORING_POLL_INTERVAL_MS);

server.listen(PORT, () => {
  console.log(`PulseOps API listening on port ${PORT}`);
  console.log(`Socket.IO telemetry stream ready for ${allowedOrigins.join(', ')}`);
  console.log(
    hasMonitoredAppConfig
      ? `Monitoring ${MONITORED_APP_NAME} at ${MONITORED_APP_URL}`
      : 'Using simulated telemetry because MONITORED_APP_URL or MONITORED_APP_TOKEN is not set',
  );
  console.log(`Health check: http://localhost:${PORT}/health`);
});
