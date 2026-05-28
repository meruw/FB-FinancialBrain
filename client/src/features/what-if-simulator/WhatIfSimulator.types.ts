import type { SimulationResult, SimulationScenario } from '@/types/domain';

export type { SimulationResult, SimulationScenario };

export interface SimulationRequest {
  sessionId: string;
  scenarioType: SimulationScenario;
  vendorName?: string;
  proposedToleranceDays?: number;
}

export interface ScenarioOption {
  id: string;
  title: string;
  hint: string;
  hero?: boolean;
  request: Omit<SimulationRequest, 'sessionId'>;
}
