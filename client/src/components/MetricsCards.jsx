import { Activity, AlertTriangle, Gauge, HardDrive, Users, Zap } from 'lucide-react';
import { useDashboardStore } from '../store/useDashboardStore';

const statusStyles = {
  healthy: {
    label: 'Healthy',
    text: 'text-emerald-200',
    badge: 'border-emerald-300/20 bg-emerald-400/10',
    bar: 'bg-emerald-300',
  },
  watch: {
    label: 'Watch',
    text: 'text-amber-200',
    badge: 'border-amber-300/20 bg-amber-400/10',
    bar: 'bg-amber-300',
  },
  critical: {
    label: 'Critical',
    text: 'text-rose-200',
    badge: 'border-rose-300/20 bg-rose-400/10',
    bar: 'bg-rose-300',
  },
};

const getLoadStatus = (value, warning, critical) => {
  if (value >= critical) return 'critical';
  if (value >= warning) return 'watch';
  return 'healthy';
};

const MetricCard = ({ metric }) => {
  const Icon = metric.icon;
  const styles = statusStyles[metric.status];

  return (
    <article className="metric-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-500">{metric.label}</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-3xl font-semibold text-white">{metric.value}</span>
            <span className="text-sm text-zinc-500">{metric.unit}</span>
          </div>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${styles.badge}`}>
          <Icon className={`h-5 w-5 ${styles.text}`} aria-hidden="true" />
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className={styles.text}>{styles.label}</span>
          <span className="text-zinc-500">{metric.description}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${styles.bar}`}
            style={{ width: `${Math.min(Math.max(metric.progress, 4), 100)}%` }}
          />
        </div>
      </div>
    </article>
  );
};

const MetricsCards = () => {
  const { data } = useDashboardStore();

  if (!data?.metrics) return null;

  const { apiLatency, cpuLoad, memoryUsage, activeUsers, errorRate, transactionsPerMinute } = data.metrics;

  const metrics = [
    {
      label: 'API Latency',
      value: Math.round(apiLatency),
      unit: 'ms p95',
      description: '< 220 ms target',
      icon: Gauge,
      status: getLoadStatus(apiLatency, 220, 320),
      progress: (apiLatency / 500) * 100,
    },
    {
      label: 'CPU / Load',
      value: cpuLoad.toFixed(1),
      unit: '%',
      description: 'cluster average',
      icon: Activity,
      status: getLoadStatus(cpuLoad, 72, 86),
      progress: cpuLoad,
    },
    {
      label: 'Memory',
      value: memoryUsage.toFixed(1),
      unit: '%',
      description: 'primary nodes',
      icon: HardDrive,
      status: getLoadStatus(memoryUsage, 76, 88),
      progress: memoryUsage,
    },
    {
      label: 'Active Users',
      value: activeUsers.toLocaleString(),
      unit: 'online',
      description: 'current sessions',
      icon: Users,
      status: 'healthy',
      progress: (activeUsers / 4200) * 100,
    },
    {
      label: 'Error Rate',
      value: errorRate.toFixed(2),
      unit: '%',
      description: '< 1.8% watch',
      icon: AlertTriangle,
      status: getLoadStatus(errorRate, 1.8, 3),
      progress: (errorRate / 6.8) * 100,
    },
    {
      label: 'Transactions',
      value: transactionsPerMinute.toLocaleString(),
      unit: 'per min',
      description: 'checkout and API',
      icon: Zap,
      status: 'healthy',
      progress: (transactionsPerMinute / 5200) * 100,
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} metric={metric} />
      ))}
    </section>
  );
};

export default MetricsCards;
