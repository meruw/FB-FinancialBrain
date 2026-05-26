import { useEffect } from 'react';
import { useSessionStore } from '@/store/session';
import { useDataStore } from '@/store/data';

function App() {
  const status = useSessionStore((s) => s.status);
  const { isLoading, error, loadAll } = useDataStore((s) => ({
    isLoading: s.isLoading,
    error: s.error,
    loadAll: s.loadAll,
  }));

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-brain-bg">
        <svg
          className="h-8 w-8 animate-spin text-brain-accent"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="text-sm text-brain-muted">Financial Brain initializing...</span>
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-brain-bg">
        <span className="text-sm text-brain-danger">{error}</span>
      </div>
    );
  }

  if (status === 'briefing') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-brain-bg">
        <span className="text-2xl font-semibold tracking-wide text-brain-accent">
          Brain Briefing
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-brain-bg">
      {/* Reconciliation workspace — left 65 % */}
      <div className="flex h-full w-[65%] flex-col items-center justify-center bg-brain-surface">
        <span className="text-brain-muted text-sm uppercase tracking-widest">Workspace</span>
      </div>

      {/* Divider */}
      <div className="w-px shrink-0 bg-slate-700" />

      {/* Brain Panel — right 35 % */}
      <div className="flex h-full w-[35%] flex-col items-center justify-center bg-brain-bg">
        <span className="text-brain-muted text-sm uppercase tracking-widest">Brain Panel</span>
      </div>
    </div>
  );
}

export default App;
