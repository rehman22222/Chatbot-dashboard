import { AlertCircle } from 'lucide-react';
import { useDashboardStore } from '../store/useDashboardStore';
import DashboardControls from './DashboardControls';
import LiveDataTable from './LiveDataTable';
import LoadingSpinner from './LoadingSpinner';
import MetricsCards from './MetricsCards';
import MetricsChart from './MetricsChart';
import ServiceHealth from './ServiceHealth';

const Dashboard = () => {
  const { data, isLoading, error, isConnected, lastUpdate } = useDashboardStore();

  if (isLoading && !data) {
    return (
      <section className="panel flex min-h-[420px] items-center justify-center p-6">
        <LoadingSpinner text="Opening PulseOps WebSocket stream..." />
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="panel flex min-h-[360px] items-center justify-center p-6 text-center">
        <div>
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-rose-300" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-white">PulseOps could not load telemetry</h2>
          <p className="mt-2 max-w-lg text-sm text-zinc-400">{error}</p>
        </div>
      </section>
    );
  }

  if (!isConnected && !data) {
    return (
      <section className="panel flex min-h-[360px] items-center justify-center p-6 text-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Connecting to PulseOps API</h2>
          <p className="mt-2 max-w-lg text-sm text-zinc-400">
            Keep the Node.js Socket.IO server running so live telemetry can reach this dashboard.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardControls />
      <MetricsCards />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)]">
        <section className="panel p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Operations History</h2>
              <p className="text-sm text-zinc-500">Latency, utilization, and error pressure over the live socket window.</p>
            </div>
            <div className="text-xs font-medium text-zinc-500">
              {lastUpdate ? `Last packet ${new Date(lastUpdate).toLocaleTimeString()}` : 'Waiting for packet'}
            </div>
          </div>
          <MetricsChart />
        </section>

        <ServiceHealth />
      </div>

      <LiveDataTable />
    </div>
  );
};

export default Dashboard;
