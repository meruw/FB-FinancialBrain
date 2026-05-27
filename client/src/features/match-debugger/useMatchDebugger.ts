import { useEffect, useState } from 'react';
import { useSessionStore } from '@/store/session';
import { api } from '@/services/api';
import { debugMock } from './MatchDebugger.mock';
import type { DebugDiagnosis } from '@/types/domain';

export function useMatchDebugger(): { data: DebugDiagnosis | null; loading: boolean; error: boolean } {
  const transactionId = useSessionStore((s) => s.selectedTransactionId);
  const [data, setData]       = useState<DebugDiagnosis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(false);

  useEffect(() => {
    if (!transactionId) {
      setData(null);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    api.getDebugDiagnosis(transactionId)
      .then((result) => {
        if (cancelled) return;
        setData(result);
      })
      .catch(() => {
        if (cancelled) return;
        // Absorb error — surface mock so the Brain panel always shows something
        setData(debugMock);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [transactionId]);

  return { data, loading, error };
}
