import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const PORT = process.env.PORT || 3001;
const MONITORED_APP_NAME = process.env.MONITORED_APP_NAME || 'Loadshedding Tracker';
const MONITORED_APP_URL = (process.env.MONITORED_APP_URL || '').replace(/\/+$/, '');
const MONITORED_APP_TOKEN = process.env.MONITORED_APP_TOKEN || '';
const MONITORING_POLL_INTERVAL_MS = Number(process.env.MONITORING_POLL_INTERVAL_MS) || 5000;
const INGESTION_STALE_AFTER_MS = Number(process.env.INGESTION_STALE_AFTER_MS) || 30000;
const PUBLIC_PULSEOPS_URL = (process.env.PUBLIC_PULSEOPS_URL || '').replace(/\/+$/, '');
const DEFAULT_AGENT_PROJECT_ID = process.env.PULSEOPS_DEFAULT_PROJECT_ID || 'project_loadshedding_tracker';
const DEFAULT_AGENT_API_KEY = process.env.PULSEOPS_DEFAULT_API_KEY || process.env.MONITORED_APP_TOKEN || '';
const DEFAULT_AGENT_PROJECT_NAME = process.env.PULSEOPS_DEFAULT_PROJECT_NAME || MONITORED_APP_NAME;
const AGENT_SIGNING_SECRET =
  process.env.PULSEOPS_SIGNING_SECRET ||
  DEFAULT_AGENT_API_KEY ||
  process.env.MONITORED_APP_TOKEN ||
  'pulseops-local-dev-signing-secret';
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
app.use(express.json({ limit: '1mb' }));

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const jitter = (value, amount, min, max) =>
  Number(clamp(value + (Math.random() - 0.5) * amount, min, max).toFixed(2));
const hasMonitoredAppConfig = Boolean(MONITORED_APP_URL && MONITORED_APP_TOKEN);
const projects = new Map();
const ingestedTelemetry = new Map();

function createId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function signAgentKey(projectId, keySecret) {
  return crypto
    .createHmac('sha256', AGENT_SIGNING_SECRET)
    .update(`${projectId}:${keySecret}`)
    .digest('base64url');
}

function createApiKey(projectId) {
  const keySecret = crypto.randomBytes(32).toString('base64url');
  return `po.v1.${keySecret}.${signAgentKey(projectId, keySecret)}`;
}

function safeEqual(a, b) {
  const first = Buffer.from(String(a));
  const second = Buffer.from(String(b));

  return first.length === second.length && crypto.timingSafeEqual(first, second);
}

function hashApiKey(apiKey = '') {
  return crypto.createHash('sha256').update(String(apiKey)).digest('hex');
}

function isSignedApiKeyValid(projectId, apiKey = '') {
  const parts = String(apiKey).split('.');
  if (parts.length !== 4 || parts[0] !== 'po' || parts[1] !== 'v1') {
    return false;
  }

  const [, , keySecret, signature] = parts;
  return safeEqual(signature, signAgentKey(projectId, keySecret));
}

function getIngestUrl(req) {
  const origin = PUBLIC_PULSEOPS_URL || `${req.protocol}://${req.get('host')}`;
  return `${origin.replace(/\/+$/, '')}/api/ingest`;
}

function registerProject({ id, name, apiKey }) {
  const projectId = id || createId('project');
  const projectApiKey = apiKey || createApiKey(projectId);
  const now = new Date().toISOString();
  const project = {
    id: projectId,
    name: String(name || 'Untitled Project').trim() || 'Untitled Project',
    apiKeyHash: hashApiKey(projectApiKey),
    createdAt: now,
    lastSeenAt: null,
  };

  projects.set(project.id, project);
  return { project, apiKey: projectApiKey };
}

function safeProject(project, req) {
  const lastSeenAt = project.lastSeenAt ? new Date(project.lastSeenAt).getTime() : 0;
  const isReceiving = lastSeenAt && Date.now() - lastSeenAt <= INGESTION_STALE_AFTER_MS;

  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    lastSeenAt: project.lastSeenAt,
    status: isReceiving ? 'receiving' : 'waiting',
    ingestUrl: getIngestUrl(req),
  };
}

function findProjectByCredentials(projectId, apiKey, fallbackName = 'Untitled Project') {
  if (!projectId || !apiKey) return null;

  const project = projects.get(projectId);
  const incomingHash = hashApiKey(apiKey);
  if (project && safeEqual(incomingHash, project.apiKeyHash)) {
    return project;
  }

  if (isSignedApiKeyValid(projectId, apiKey)) {
    if (project) return project;

    const restoredProject = {
      id: projectId,
      name: String(fallbackName || projectId).trim() || projectId,
      apiKeyHash: incomingHash,
      createdAt: new Date().toISOString(),
      lastSeenAt: null,
    };

    projects.set(projectId, restoredProject);
    return restoredProject;
  }

  return null;
}

if (DEFAULT_AGENT_API_KEY) {
  registerProject({
    id: DEFAULT_AGENT_PROJECT_ID,
    name: DEFAULT_AGENT_PROJECT_NAME,
    apiKey: DEFAULT_AGENT_API_KEY,
  });
}

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

function eventFromMonitoredData(payload, source, latencyMs, appName = MONITORED_APP_NAME) {
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
      service: appName,
      message: `${appName} reported ${payload.status || 'unhealthy'} status`,
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
    service: appName,
    message: `${business.totalOutages || 0} outages across ${business.totalAreas || 0} monitored areas`,
    source,
    timestamp,
  };
}

function normalizeMonitoredPayload(payload, source, requestLatencyMs, context = {}) {
  const traffic = payload.traffic || {};
  const runtime = payload.runtime || {};
  const business = payload.business || {};
  const services = payload.services || {};
  const appName = context.name || payload.app || MONITORED_APP_NAME;
  const appUrl = context.url || payload.url || MONITORED_APP_URL || 'agent-push';
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
      name: appName,
      url: appUrl,
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
    events: [eventFromMonitoredData(payload, source, requestLatencyMs, appName)],
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
  const ingestedData = getLatestIngestedData(source);
  if (ingestedData) {
    return ingestedData;
  }

  const monitoredData = await fetchMonitoredAppData(source);
  return monitoredData || generateOperationsData(source);
}

function getLatestIngestedData(source = 'stream') {
  const freshEntries = [...ingestedTelemetry.values()]
    .filter((entry) => Date.now() - entry.receivedAt <= INGESTION_STALE_AFTER_MS)
    .sort((a, b) => b.receivedAt - a.receivedAt);

  if (!freshEntries.length) {
    return null;
  }

  return {
    ...freshEntries[0].data,
    source,
    timestamp: new Date().toISOString(),
  };
}

app.get('/api/projects', (req, res) => {
  res.json({
    projects: [...projects.values()].map((project) => safeProject(project, req)),
  });
});

app.post('/api/projects', (req, res) => {
  const name = String(req.body?.name || '').trim();

  if (!name) {
    return res.status(400).json({
      message: 'Project name is required',
    });
  }

  const { project, apiKey } = registerProject({ name });
  const ingestUrl = getIngestUrl(req);

  res.status(201).json({
    project: safeProject(project, req),
    apiKey,
    env: {
      PULSEOPS_PROJECT_ID: project.id,
      PULSEOPS_API_KEY: apiKey,
      PULSEOPS_INGEST_URL: ingestUrl,
      PULSEOPS_PUSH_INTERVAL_MS: '5000',
    },
    envSnippet: [
      `PULSEOPS_PROJECT_ID=${project.id}`,
      `PULSEOPS_API_KEY=${apiKey}`,
      `PULSEOPS_INGEST_URL=${ingestUrl}`,
      'PULSEOPS_PUSH_INTERVAL_MS=5000',
    ].join('\n'),
  });
});

app.post('/api/ingest', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const apiKey = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : req.headers['x-pulseops-api-key'];
  const projectId = req.headers['x-pulseops-project-id'] || req.body?.projectId;
  const project = findProjectByCredentials(projectId, apiKey, req.body?.app);

  if (!project) {
    return res.status(401).json({
      ok: false,
      message: 'Invalid PulseOps project credentials',
    });
  }

  const payload = {
    ...req.body,
    app: req.body?.app || project.name,
  };
  const data = normalizeMonitoredPayload(payload, 'agent', payload.traffic?.averageLatencyMs || 0, {
    name: project.name,
    url: 'agent-push',
  });
  const now = new Date().toISOString();

  project.lastSeenAt = now;
  projects.set(project.id, project);
  ingestedTelemetry.set(project.id, {
    data,
    receivedAt: Date.now(),
  });

  io.emit('data', data);

  res.json({
    ok: true,
    projectId: project.id,
    receivedAt: now,
  });
});

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
