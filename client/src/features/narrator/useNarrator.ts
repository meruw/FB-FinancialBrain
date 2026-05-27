import { useState } from 'react';
import { useSessionStore } from '@/store/session';
import { api } from '@/services/api';
import { narratorMock } from './Narrator.mock';
import type { Narrative } from '@/types/domain';

export function useNarrator(): {
  data: Narrative | null;
  loading: boolean;
  generated: boolean;
  generate: () => void;
} {
  // Read status so the hook is aware of session lifecycle
  useSessionStore((s) => s.status);

  const [data, setData]           = useState<Narrative | null>(null);
  const [loading, setLoading]     = useState(false);
  const [generated, setGenerated] = useState(false);

  function generate() {
    if (loading || generated) return;
    setLoading(true);

    api.getNarrative('SESSION-MAY-2026')
      .then((result) => {
        setData(result);
        setGenerated(true);
      })
      .catch(() => {
        // Absorb all errors — demo must never show a broken state
        setData(narratorMock);
        setGenerated(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return { data, loading, generated, generate };
}
