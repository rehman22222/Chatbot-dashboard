import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

const initialState = {
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  data: null,
  lastUpdate: null,
  isLoading: true,
  error: null,
  historicalData: [],
  maxHistoryLength: 60,
  eventLog: [],
  maxEvents: 80,
  isPaused: false,
  severityFilter: 'all',
  skippedUpdates: 0,
  lastManualRefresh: null,
};

const normalizeSeverity = (event) => event.severity || event.type || 'info';

export const useDashboardStore = create(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    setConnecting: (isConnecting) => set({ isConnecting }),
    setConnected: (isConnected) =>
      set({
        isConnected,
        isConnecting: false,
        connectionError: null,
      }),
    setConnectionError: (error) =>
      set({
        connectionError: error,
        isConnecting: false,
        isConnected: false,
      }),

    updateData: (data, options = {}) => {
      const { isPaused, historicalData, maxHistoryLength, eventLog, maxEvents } = get();
      const forceUpdate = options.force || data?.source === 'manual' || data?.source === 'initial';

      if (isPaused && !forceUpdate) {
        set({ skippedUpdates: get().skippedUpdates + 1 });
        return;
      }

      const timestamp = data?.timestamp || new Date().toISOString();
      const incomingEvents = (data?.events || []).map((event) => ({
        ...event,
        severity: normalizeSeverity(event),
      }));
      const existingEventIds = new Set(eventLog.map((event) => event.id));
      const mergedEvents = [
        ...incomingEvents.filter((event) => !existingEventIds.has(event.id)),
        ...eventLog,
      ].slice(0, maxEvents);

      set({
        data: { ...data, timestamp },
        lastUpdate: timestamp,
        historicalData: [...historicalData, { ...data, timestamp }].slice(-maxHistoryLength),
        eventLog: mergedEvents,
        isLoading: false,
        error: null,
        skippedUpdates: forceUpdate ? 0 : get().skippedUpdates,
        lastManualRefresh: data?.source === 'manual' ? timestamp : get().lastManualRefresh,
      });
    },

    setError: (error) => set({ error, isLoading: false }),
    setLoading: (isLoading) => set({ isLoading }),
    togglePaused: () =>
      set((state) => ({
        isPaused: !state.isPaused,
        skippedUpdates: state.isPaused ? 0 : state.skippedUpdates,
      })),
    setSeverityFilter: (severityFilter) => set({ severityFilter }),
    clearEvents: () => set({ eventLog: [] }),

    reset: () =>
      set({
        ...initialState,
        historicalData: [],
        eventLog: [],
      }),

    getConnectionStatus: () => {
      const { isConnected, isConnecting, connectionError } = get();
      if (isConnected) return 'connected';
      if (isConnecting) return 'connecting';
      if (connectionError) return 'error';
      return 'disconnected';
    },

    getMetricsData: () => {
      const { historicalData } = get();
      return historicalData.map((item) => ({
        timestamp: new Date(item.timestamp),
        apiLatency: item.metrics?.apiLatency ?? item.metrics?.network ?? 0,
        cpuLoad: item.metrics?.cpuLoad ?? item.metrics?.cpu ?? 0,
        memoryUsage: item.metrics?.memoryUsage ?? item.metrics?.memory ?? 0,
        errorRate: item.metrics?.errorRate ?? 0,
        transactionsPerMinute: item.metrics?.transactionsPerMinute ?? item.transactions ?? 0,
        activeUsers: item.metrics?.activeUsers ?? item.users ?? 0,
      }));
    },

    getFilteredEvents: () => {
      const { eventLog, severityFilter } = get();
      if (severityFilter === 'all') return eventLog;
      return eventLog.filter((event) => normalizeSeverity(event) === severityFilter);
    },
  })),
);
