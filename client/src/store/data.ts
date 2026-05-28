import { create } from 'zustand';
import { api } from '@/services/api';
import type {
  FinancialBrain,
  MatchedRecord,
  ReconciliationSession,
  BankTransaction,
  SapTransaction,
  UnmatchedCase,
  ResolveResult,
} from '@/types/domain';

interface DataState {
  brain: FinancialBrain | null;
  session: ReconciliationSession | null;
  transactions: BankTransaction[];
  sapTransactions: SapTransaction[];
  matchedRecords: MatchedRecord[];
  unmatchedCases: UnmatchedCase[];
  isLoading: boolean;
  error: string | null;

  // Live close probability — initialized from brain on load, updated by applyResolve.
  closeProbability: number | null;
  // Snapshot at session open — used to compute the "↑ +N%" delta chip.
  initialCloseProbability: number | null;

  setBrain: (brain: FinancialBrain | null) => void;
  setSession: (session: ReconciliationSession | null) => void;
  setTransactions: (transactions: BankTransaction[]) => void;
  setSapTransactions: (sapTransactions: SapTransaction[]) => void;
  setMatchedRecords: (matchedRecords: MatchedRecord[]) => void;
  setUnmatchedCases: (unmatchedCases: UnmatchedCase[]) => void;

  // Optimistic update after POST /api/resolve — no re-fetch needed.
  applyResolve: (result: ResolveResult) => void;

  loadAll: () => Promise<void>;
}

export const useDataStore = create<DataState>((set) => ({
  brain: null,
  session: null,
  transactions: [],
  sapTransactions: [],
  matchedRecords: [],
  unmatchedCases: [],
  isLoading: false,
  error: null,
  closeProbability: null,
  initialCloseProbability: null,

  setBrain: (brain) => set({ brain }),
  setSession: (session) => set({ session }),
  setTransactions: (transactions) => set({ transactions }),
  setSapTransactions: (sapTransactions) => set({ sapTransactions }),
  setMatchedRecords: (matchedRecords) => set({ matchedRecords }),
  setUnmatchedCases: (unmatchedCases) => set({ unmatchedCases }),

  applyResolve: (result) =>
    set((state) => {
      const newUnmatched = state.unmatchedCases.filter(
        (u) => u.bankId !== result.transactionId,
      );

      // Synthetic local record — the server creates the real one.
      // sapId is unknown here; an empty string is safe since nothing in the UI
      // renders individual SAP IDs from matched records.
      const synthetic: MatchedRecord = {
        id: `manual-${result.transactionId}`,
        bankId: result.transactionId,
        sapId: '',
        ruleUsed: 'ManualMatch',
        matchedAt: new Date().toISOString(),
      };

      return {
        closeProbability: result.updatedStats.closeProbability,
        unmatchedCases: newUnmatched,
        matchedRecords: [...state.matchedRecords, synthetic],
      };
    }),

  loadAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const [brain, session, transactions, sapTransactions, matchedRecords, unmatchedCases] =
        await Promise.all([
          api.getBrain(),
          api.getSession(),
          api.getBankTransactions(),
          api.getSapTransactions(),
          api.getMatches(),
          api.getUnmatched(),
        ]);

      const cp = brain.closeProbability.current;

      set({
        brain,
        session,
        transactions,
        sapTransactions,
        matchedRecords,
        unmatchedCases,
        closeProbability: cp,
        initialCloseProbability: cp,
      });
    } catch (err) {
      set({ error: String(err) });
    } finally {
      set({ isLoading: false });
    }
  },
}));
