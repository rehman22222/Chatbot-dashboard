import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useDashboardStore } from '../store/useDashboardStore';

const severityConfig = {
  critical: {
    label: 'Critical',
    icon: AlertCircle,
    row: 'border-rose-300/20 bg-rose-400/10',
    text: 'text-rose-100',
    chip: 'bg-rose-300 text-rose-950',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    row: 'border-amber-300/20 bg-amber-400/10',
    text: 'text-amber-100',
    chip: 'bg-amber-300 text-amber-950',
  },
  info: {
    label: 'Info',
    icon: Info,
    row: 'border-cyan-300/15 bg-cyan-400/10',
    text: 'text-cyan-100',
    chip: 'bg-cyan-300 text-cyan-950',
  },
};

const formatTimestamp = (timestamp) =>
  new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const LiveDataTable = () => {
  const { getFilteredEvents, severityFilter, eventLog } = useDashboardStore();
  const events = getFilteredEvents();

  return (
    <section className="panel p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Real-Time Event Feed</h2>
          <p className="text-sm text-zinc-500">
            {events.length} visible of {eventLog.length} retained events
          </p>
        </div>
        <div className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
          {severityFilter === 'all' ? 'All severities' : severityFilter}
        </div>
      </div>

      {events.length === 0 ? (
        <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-white/10 text-center">
          <div>
            <div className="text-sm font-medium text-zinc-300">No matching events</div>
            <div className="mt-1 text-xs text-zinc-500">Change the severity filter or wait for the next socket payload.</div>
          </div>
        </div>
      ) : (
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {events.map((event) => {
            const severity = event.severity || event.type || 'info';
            const config = severityConfig[severity] || severityConfig.info;
            const Icon = config.icon;

            return (
              <article key={event.id} className={`rounded-lg border p-4 ${config.row}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.chip}`}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-semibold ${config.text}`}>{config.label}</span>
                        <span className="text-xs text-zinc-500">{event.service || 'PulseOps'}</span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-200">{event.message}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-zinc-500 sm:justify-end">
                    <span>{formatTimestamp(event.timestamp)}</span>
                    <span className="rounded-full border border-white/10 px-2 py-1 uppercase tracking-[0.14em]">
                      {event.source || 'stream'}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default LiveDataTable;
