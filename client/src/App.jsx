import { useEffect } from 'react';
import { RadioTower, ShieldCheck } from 'lucide-react';
import { useDashboardStore } from './store/useDashboardStore';
import { websocketService } from './services/websocketService';
import Dashboard from './components/Dashboard';
import ConnectionStatus from './components/ConnectionStatus';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

const PulseOpsLogo = () => (
  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-cyan-300/30 bg-[#101820] shadow-[0_0_40px_rgba(103,232,249,0.12)]">
    <div className="absolute inset-1 rounded-lg border border-white/5" />
    <span className="relative text-2xl font-black tracking-[-0.02em] text-white">P</span>
    <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full border border-[#0b0c10] bg-emerald-300">
      <span className="h-2 w-2 rounded-full bg-emerald-950" />
    </span>
  </div>
);

function App() {
  const {
    data,
    setConnecting,
    setConnected,
    setConnectionError,
    updateData,
    setError,
    reset,
  } = useDashboardStore();

  useEffect(() => {
    const connectToWebSocket = () => {
      try {
        setConnecting(true);
        setError(null);

        const socket = websocketService.connect(socketUrl);

        const handleConnect = () => {
          setConnected(true);
        };

        const handleDisconnect = () => {
          setConnected(false);
        };

        const handleConnectError = (error) => {
          setConnectionError(error.message);
        };

        const handleData = (data) => {
          updateData(data, {
            force: data?.source === 'manual' || data?.source === 'initial',
          });
        };

        const handleSocketError = (error) => {
          setError(error.message || 'PulseOps socket error');
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);
        socket.on('data', handleData);
        socket.on('error', handleSocketError);
      } catch (error) {
        setConnectionError(error.message);
        setError('Failed to connect to the PulseOps WebSocket API');
      }
    };

    connectToWebSocket();

    return () => {
      websocketService.disconnect();
      reset();
    };
  }, [setConnecting, setConnected, setConnectionError, updateData, setError, reset]);

  const monitoredProjectName = data?.monitoredApp?.name || 'Demo Operations Environment';
  const monitoredProjectStatus = data?.monitoredApp?.status || (data?.mode === 'monitored' ? 'syncing' : 'simulated');

  return (
    <div className="dashboard-shell">
      <header className="border-b border-white/10 bg-[#0b0c10]/95">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-start gap-4">
            <PulseOpsLogo />
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-white sm:text-3xl">PulseOps</h1>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                  Live
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-zinc-400 sm:text-base">
                Real-Time WebSocket Monitoring Dashboard for API reliability, service health, and operations traffic.
              </p>
              <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-50">
                <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-200 shadow-[0_0_14px_rgba(103,232,249,0.8)]" />
                <span className="shrink-0 text-zinc-400">Monitoring</span>
                <span className="truncate font-semibold">{monitoredProjectName}</span>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  {monitoredProjectStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-300">
              <RadioTower className="h-4 w-4 text-cyan-200" aria-hidden="true" />
              <span>Socket.IO stream</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-300">
              <ShieldCheck className="h-4 w-4 text-emerald-200" aria-hidden="true" />
              <span>SLA watch</span>
            </div>
            <ConnectionStatus />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Dashboard />
      </main>
    </div>
  );
}

export default App;
