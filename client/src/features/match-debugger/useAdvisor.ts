import { useEffect, useState, useCallback } from 'react';
import { useSessionStore } from '@/store/session';
import { api } from '@/services/api';
import { advisorMock } from './Advisor.mock';
import type { AdvisorResolution, ResolveResult } from '@/types/domain';

interface UseAdvisorResult {
  data: AdvisorResolution | null;
  loading: boolean;
  accepting: boolean;
  accepted: boolean;
  resolveResult: ResolveResult | null;
  accept: () => Promise<void>;
  skip: () => void;
}

export function useAdvisor(): UseAdvisorResult {
  const transactionId = useSessionStore((s) => s.selectedTransactionId);

  const [data, setData]               = useState<AdvisorResolution | null>(null);
  const [loading, setLoading]         = useState(false);
  const [accepting, setAccepting]     = useState(false);
  const [accepted, setAccepted]       = useState(false);
  const [resolveResult, setResolve]   = useState<ResolveResult | null>(null);
  const [skipped, setSkipped]         = useState(false);

  useEffect(() => {
    setData(null);
    setAccepted(false);
    setSkipped(false);
    setResolve(null);

    if (!transactionId) return;

    let cancelled = false;
    setLoading(true);

    api.getAdvisor(transactionId)
      .then((result) => { if (!cancelled) setData(result); })
      .catch(() => { if (!cancelled) setData(advisorMock); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [transactionId]);

  const accept = useCallback(async () => {
    if (!data || accepting || accepted) return;
    setAccepting(true);
    try {
      const result = await api.resolve(data.transactionId, data.actionType);
      setResolve(result);
      setAccepted(true);
    } catch {
      // Absorb — in demo, show accepted anyway
      setAccepted(true);
    } finally {
      setAccepting(false);
    }
  }, [data, accepting, accepted]);

  const skip = useCallback(() => setSkipped(true), []);

  const visible = !skipped && !accepted;

  return {
    data: visible ? data : null,
    loading,
    accepting,
    accepted,
    resolveResult,
    accept,
    skip,
  };
}
