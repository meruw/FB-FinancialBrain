import { useCallback, useRef, useState } from 'react';
import { api } from '@/services/api';
import { simulationMocks } from './WhatIfSimulator.mock';
import type { SimulationRequest, SimulationResult } from './WhatIfSimulator.types';

export interface UseWhatIfSimulatorResult {
  data: SimulationResult | null;
  loading: boolean;
  error: string | null;
  runScenario: (req: SimulationRequest) => Promise<void>;
  reset: () => void;
}

// Minimum loading time keeps the Brain "thinking" moment visible even when
// the API resolves quickly. The brief's UX flow calls for a ~6s suspense beat
// so judges register the Brain doing work.
const MIN_LOADING_MS = 6000;

export function useWhatIfSimulator(): UseWhatIfSimulatorResult {
  const [data,    setData]    = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const inflightRef = useRef(0);

  const runScenario = useCallback(async (req: SimulationRequest) => {
    const id = ++inflightRef.current;
    setData(null);
    setError(null);
    setLoading(true);

    const startedAt = performance.now();
    let result: SimulationResult;
    try {
      result = await api.simulate(req);
    } catch (err) {
      if (id !== inflightRef.current) return;
      setError(String(err));
      result = simulationMocks[req.scenarioType];
    }

    const elapsed = performance.now() - startedAt;
    const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
    if (id !== inflightRef.current) return;
    setData(result);
    setLoading(false);
  }, []);

  const reset = useCallback(() => {
    inflightRef.current += 1;
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, runScenario, reset };
}
