import { CheckCircle2, CircleAlert, Clock3, ServerCog } from 'lucide-react';
import { useDashboardStore } from '../store/useDashboardStore';

const statusConfig = {
  operational: {
    label: 'Operational',
    icon: CheckCircle2,
    dot: 'bg-emerald-300',
    text: 'text-emerald-200',
    badge: 'border-emerald-300/20 bg-emerald-400/10',
  },
  degraded: {
    label: 'Degraded',
    icon: Clock3,
    dot: 'bg-amber-300',
    text: 'text-amber-200',
    badge: 'border-amber-300/20 bg-amber-400/10',
  },
  incident: {
    label: 'Incident',
    icon: CircleAlert,
    dot: 'bg-rose-300',
    text: 'text-rose-200',
    badge: 'border-rose-300/20 bg-rose-400/10',
  },
};

const ServiceHealth = () => {
  const { data } = useDashboardStore();
  const services = data?.services || [];
  const summary = data?.summary;
  const summaryConfig = statusConfig[summary?.status || 'operational'];
  const SummaryIcon = summaryConfig.icon;

  return (
    <section className="panel p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Service Health Alerts</h2>
          <p className="text-sm text-zinc-500">
            {summary
              ? `${summary.healthyServices}/${summary.totalServices} services healthy`
              : 'Waiting for service telemetry'}
          </p>
        </div>
        <div className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 ${summaryConfig.badge}`}>
          <SummaryIcon className={`h-4 w-4 ${summaryConfig.text}`} aria-hidden="true" />
          <span className={`text-xs font-semibold uppercase tracking-[0.16em] ${summaryConfig.text}`}>
            {summaryConfig.label}
          </span>
        </div>
      </div>

      {services.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-white/10 text-center">
          <div>
            <ServerCog className="mx-auto mb-3 h-8 w-8 text-zinc-600" aria-hidden="true" />
            <div className="text-sm font-medium text-zinc-300">No service data yet</div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((service) => {
            const config = statusConfig[service.status] || statusConfig.operational;
            const Icon = config.icon;

            return (
              <div key={service.name} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${config.dot}`} />
                      <h3 className="truncate text-sm font-semibold text-zinc-100">{service.name}</h3>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{service.region}</p>
                  </div>
                  <div className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 ${config.badge}`}>
                    <Icon className={`h-3.5 w-3.5 ${config.text}`} aria-hidden="true" />
                    <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${config.text}`}>
                      {config.label}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-zinc-600">Latency</p>
                    <p className="mt-1 font-semibold text-zinc-200">{Math.round(service.latency)} ms</p>
                  </div>
                  <div>
                    <p className="text-zinc-600">Uptime</p>
                    <p className="mt-1 font-semibold text-zinc-200">{service.uptime.toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ServiceHealth;
