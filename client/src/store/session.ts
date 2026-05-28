import { create } from 'zustand';

export type SessionStatus = 'landing' | 'loading' | 'briefing' | 'working' | 'closed';

interface SessionState {
  sessionId: string;
  status: SessionStatus;
  selectedTransactionId: string | null;
  startDemo: () => void;
  enterBriefing: () => void;
  openSession: () => void;
  closeSession: () => void;
  selectTransaction: (id: string | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: 'SESSION-MAY-2026',
  status: 'landing',
  selectedTransactionId: null,
  startDemo: () => set({ status: 'loading' }),
  enterBriefing: () => set({ status: 'briefing' }),
  openSession: () => set({ status: 'working' }),
  closeSession: () => set({ status: 'closed' }),
  selectTransaction: (id) => set({ selectedTransactionId: id }),
}));
