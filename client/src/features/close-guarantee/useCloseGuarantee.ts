import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import type { Brief } from '@/types/domain';

export interface UseCloseGuaranteeResult {
  data: Brief | null;
  loading: boolean;
  error: string | null;
}

export function useCloseGuarantee(sessionId: string): UseCloseGuaranteeResult {
  const [data, setData] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getBrief(sessionId)
      .then(setData)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [sessionId]);

  return { data, loading, error };
}
