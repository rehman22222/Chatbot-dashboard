import { useEffect } from 'react';
import { Activity, RadioTower, ShieldCheck } from 'lucide-react';
import { useDashboardStore } from './store/useDashboardStore';
import { websocketService } from './services/websocketService';
import Dashboard from './components/Dashboard';
import ConnectionStatus from './components/ConnectionStatus';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

function App() {
  const {
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

  return (
    <div className="dashboard-shell">
      <header className="border-b border-white/10 bg-[#0b0c10]/95">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-400/10 text-cyan-200">
              <Activity className="h-6 w-6" aria-hidden="true" />
            </div>
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
