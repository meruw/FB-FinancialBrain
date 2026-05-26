import { useEffect, useState } from 'react';

/**
 * Top-level shell. Replace with the real layout (Brain Briefing screen,
 * reconciliation workspace, etc.) on Day 1.
 *
 * Right now this just pings /api/health so you can verify the server is up
 * and the Vite proxy is wired correctly.
 */
function App() {
  const [health, setHealth] = useState<string>('checking server...');

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => setHealth(JSON.stringify(data, null, 2)))
      .catch((e) => setHealth(`server unreachable: ${String(e)}`));
  }, []);

  return (
    <main className="min-h-screen p-8 font-sans">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-brain-accent">
          FastBank Recon Intelligence
        </h1>
        <p className="text-brain-muted mt-1">Scaffold ready. Time to build the Brain.</p>
      </header>

      <section className="rounded-lg border border-slate-700 bg-brain-surface p-6">
        <h2 className="text-sm uppercase tracking-widest text-brain-muted mb-2">
          Server status
        </h2>
        <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">{health}</pre>
      </section>
    </main>
  );
}

export default App;
