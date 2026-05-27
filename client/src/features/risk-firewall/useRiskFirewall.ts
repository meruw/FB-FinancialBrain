import { useEffect, useState } from 'react';
import { useSessionStore } from '@/store/session';
import { api } from '@/services/api';
import type { RiskAssessment } from '@/types/domain';

export function useRiskFirewall(): { data: RiskAssessment | null; loading: boolean } {
  const transactionId = useSessionStore((s) => s.selectedTransactionId);
  const [data, setData]       = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!transactionId) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api.getRiskAssessment(transactionId)
      .then((result) => {
        if (cancelled) return;
        // Low risk is noise — render nothing
        setData(result.riskLevel === 'low' ? null : result);
      })
      .catch(() => {
        if (cancelled) return;
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [transactionId]);

  return { data, loading };
}
