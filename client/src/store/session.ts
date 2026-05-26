import { create } from 'zustand';

export type SessionStatus = 'briefing' | 'working' | 'closed';

interface SessionState {
  sessionId: string;
  status: SessionStatus;
  selectedTransactionId: string | null;
  openSession: () => void;
  closeSession: () => void;
  selectTransaction: (id: string | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: 'SESSION-MAY-2026',
  status: 'briefing',
  selectedTransactionId: null,
  openSession: () => set({ status: 'working' }),
  closeSession: () => set({ status: 'closed' }),
  selectTransaction: (id) => set({ selectedTransactionId: id }),
}));
