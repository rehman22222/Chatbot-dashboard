import { Wifi, WifiOff } from 'lucide-react';
import { useDashboardStore } from '../store/useDashboardStore';

const statusConfig = {
  connected: {
    label: 'Connected',
    detail: 'Live updates',
    icon: Wifi,
    dot: 'bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)]',
    text: 'text-emerald-100',
    border: 'border-emerald-300/25',
    background: 'bg-emerald-400/10',
  },
  connecting: {
    label: 'Connecting',
    detail: 'Opening socket',
    icon: Wifi,
    dot: 'bg-amber-300',
    text: 'text-amber-100',
    border: 'border-amber-300/25',
    background: 'bg-amber-400/10',
  },
  error: {
    label: 'Connection error',
    detail: 'Retrying',
    icon: WifiOff,
    dot: 'bg-rose-300',
    text: 'text-rose-100',
    border: 'border-rose-300/25',
    background: 'bg-rose-400/10',
  },
  disconnected: {
    label: 'Disconnected',
    detail: 'Waiting',
    icon: WifiOff,
    dot: 'bg-zinc-500',
    text: 'text-zinc-200',
    border: 'border-white/10',
    background: 'bg-white/[0.04]',
  },
};

const ConnectionStatus = () => {
  const { getConnectionStatus, connectionError } = useDashboardStore();
  const status = getConnectionStatus();
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={`flex min-w-0 items-center gap-3 rounded-lg border px-3 py-2 ${config.border} ${config.background}`}
      title={connectionError || config.detail}
    >
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${config.dot} ${status === 'connected' ? 'animate-pulse' : ''}`} />
      <Icon className={`h-4 w-4 shrink-0 ${config.text}`} aria-hidden="true" />
      <div className="min-w-0">
        <div className={`text-xs font-semibold uppercase tracking-[0.16em] ${config.text}`}>
          {config.label}
        </div>
        <div className="truncate text-xs text-zinc-500">{connectionError || config.detail}</div>
      </div>
    </div>
  );
};

export default ConnectionStatus;
