/**
 * API client.
 *
 * Single entry point for all server calls. Every feature should add a
 * function here, NOT call fetch from components. That gives you:
 *   - one place to add auth/headers later
 *   - one place to add error handling and retries
 *   - one place to swap in fixtures during tests
 */

async function postJson<TBody, TResponse>(
  path: string,
  body: TBody
): Promise<TResponse> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${path} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as TResponse;
}

export const api = {
  health: async (): Promise<{ ok: boolean; demoMode: boolean; model: string }> => {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('health check failed');
    return res.json();
  },

  // Feature endpoints get added here as they ship:
  //
  // brief: (sessionId: string) =>
  //   postJson<{ sessionId: string }, Brief>('/api/brief', { sessionId }),
  //
  // debug: (transactionId: string) =>
  //   postJson<{ transactionId: string }, DebugDiagnosis>('/api/debug', { transactionId }),
  //
  // advise: (transactionId: string) =>
  //   postJson<{ transactionId: string }, Advice>('/api/advise', { transactionId }),
  //
  // narrate: (sessionId: string) =>
  //   postJson<{ sessionId: string }, Narrative>('/api/narrate', { sessionId }),
};

// Tells TypeScript postJson is intentionally unused for now (it'll be when features land).
void postJson;
