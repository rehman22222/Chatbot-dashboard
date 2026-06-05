import { Pause, Play, RefreshCw, Trash2 } from 'lucide-react';
import { useDashboardStore } from '../store/useDashboardStore';
import { websocketService } from '../services/websocketService';
import ProjectOnboarding from './ProjectOnboarding';

const severityOptions = [
  { value: 'all', label: 'All events' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
];

const DashboardControls = () => {
  const {
    isPaused,
    isConnected,
    severityFilter,
    skippedUpdates,
    eventLog,
    lastManualRefresh,
    togglePaused,
    setSeverityFilter,
    clearEvents,
  } = useDashboardStore();

  const requestData = () => {
    websocketService.emit('requestData', { requestedAt: new Date().toISOString() });
  };

  return (
    <section className="panel flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Command Center</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Live operations controls</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {isPaused
            ? `Stream paused${skippedUpdates ? `, ${skippedUpdates} packets held back` : ''}.`
            : 'Socket stream is updating every two seconds.'}
          {lastManualRefresh ? ` Last manual refresh ${new Date(lastManualRefresh).toLocaleTimeString()}.` : ''}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <span className="shrink-0">Severity</span>
          <select
            className="control-select"
            value={severityFilter}
            onChange={(event) => setSeverityFilter(event.target.value)}
            aria-label="Filter event feed by severity"
          >
            {severityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={isPaused ? 'button button-primary' : 'button button-secondary'}
          onClick={togglePaused}
          title={isPaused ? 'Resume live stream' : 'Pause live stream'}
        >
          {isPaused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
          <span>{isPaused ? 'Resume' : 'Pause'}</span>
        </button>

        <button
          type="button"
          className="button button-secondary"
          onClick={requestData}
          disabled={!isConnected}
          title="Request a fresh telemetry payload"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          <span>Refresh</span>
        </button>

        <button
          type="button"
          className="button button-ghost"
          onClick={clearEvents}
          disabled={eventLog.length === 0}
          title="Clear the event feed"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          <span>Clear events</span>
        </button>

        <ProjectOnboarding />
      </div>
    </section>
  );
};

export default DashboardControls;
