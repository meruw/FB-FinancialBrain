import { useEffect } from 'react';
import { useDataStore } from '@/store/data';
import type { Brief } from '@/types/domain';

export interface UseCloseGuaranteeResult {
  data: Brief | null;
  loading: boolean;
  error: string | null;
}

// Reads the brief from the data store. The LoadingScreen prefetches it before
// CloseGuarantee mounts, so this normally returns ready data immediately. The
// fallback fetch covers refreshes/deep links that skip the LoadingScreen.
export function useCloseGuarantee(sessionId: string): UseCloseGuaranteeResult {
  const brief        = useDataStore((s) => s.brief);
  const briefLoading = useDataStore((s) => s.briefLoading);
  const briefError   = useDataStore((s) => s.briefError);
  const loadBrief    = useDataStore((s) => s.loadBrief);

  useEffect(() => {
    if (brief === null && !briefLoading && briefError === null) {
      void loadBrief(sessionId);
    }
  }, [sessionId, brief, briefLoading, briefError, loadBrief]);

  return { data: brief, loading: briefLoading, error: briefError };
}
