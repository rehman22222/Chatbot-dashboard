import { useDashboardStore } from '../store/useDashboardStore';

const width = 760;
const height = 280;
const padding = 28;
const plotWidth = width - padding * 2;
const plotHeight = height - padding * 2;

const series = [
  { key: 'apiLatency', label: 'Latency', color: '#67e8f9', max: 500, suffix: 'ms' },
  { key: 'cpuLoad', label: 'CPU', color: '#fbbf24', max: 100, suffix: '%' },
  { key: 'memoryUsage', label: 'Memory', color: '#a7f3d0', max: 100, suffix: '%' },
  { key: 'errorRate', label: 'Errors', color: '#fb7185', max: 6.8, suffix: '%' },
  { key: 'transactionsPerMinute', label: 'TPM', color: '#c4b5fd', max: 5200, suffix: '' },
];

const createPath = (data, key, max) => {
  if (data.length < 2) return '';

  return data
    .map((item, index) => {
      const x = padding + (index / (data.length - 1)) * plotWidth;
      const normalized = Math.min(Math.max(item[key] / max, 0), 1);
      const y = padding + plotHeight - normalized * plotHeight;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
};

const formatValue = (value, suffix) => {
  if (suffix === 'ms') return `${Math.round(value)} ms`;
  if (suffix === '%') return `${Number(value).toFixed(value < 10 ? 2 : 1)}%`;
  return Math.round(value).toLocaleString();
};

const MetricsChart = () => {
  const { getMetricsData } = useDashboardStore();
  const metricsData = getMetricsData();
  const latest = metricsData[metricsData.length - 1];

  if (metricsData.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-white/10 text-center">
        <div>
          <div className="text-sm font-medium text-zinc-300">Waiting for live metrics</div>
          <div className="mt-1 text-xs text-zinc-500">The chart will render once Socket.IO data arrives.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        {series.map((item) => (
          <div key={item.key} className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
            {latest && <span className="text-zinc-600">{formatValue(latest[item.key], item.suffix)}</span>}
          </div>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-lg border border-white/10 bg-[#0b0c10]">
        <svg className="h-72 w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Live operations metrics chart">
          {[0, 0.25, 0.5, 0.75, 1].map((line) => {
            const y = padding + plotHeight - line * plotHeight;
            return (
              <g key={line}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.08)" />
                <text x={8} y={y + 4} fill="rgba(212,212,216,0.42)" fontSize="10">
                  {Math.round(line * 100)}
                </text>
              </g>
            );
          })}

          {series.map((item) => (
            <path
              key={item.key}
              d={createPath(metricsData, item.key, item.max)}
              fill="none"
              stroke={item.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              opacity="0.92"
            />
          ))}

          {latest &&
            series.map((item, index) => {
              const x = padding + plotWidth;
              const normalized = Math.min(Math.max(latest[item.key] / item.max, 0), 1);
              const y = padding + plotHeight - normalized * plotHeight;

              return <circle key={`${item.key}-${index}`} cx={x} cy={y} r="3.5" fill={item.color} />;
            })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <span>{metricsData.length} telemetry packets in memory</span>
        <span>Normalized scale, newest packet on the right</span>
      </div>
    </div>
  );
};

export default MetricsChart;
