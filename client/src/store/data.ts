import { create } from 'zustand';
import { api } from '@/services/api';
import type {
  FinancialBrain,
  ReconciliationSession,
  BankTransaction,
  MatchedRecord,
  UnmatchedCase,
} from '@/types/domain';

interface DataState {
  brain: FinancialBrain | null;
  session: ReconciliationSession | null;
  transactions: BankTransaction[];
  matchedRecords: MatchedRecord[];
  unmatchedCases: UnmatchedCase[];
  isLoading: boolean;
  error: string | null;
  setBrain: (brain: FinancialBrain | null) => void;
  setSession: (session: ReconciliationSession | null) => void;
  setTransactions: (transactions: BankTransaction[]) => void;
  setMatchedRecords: (matchedRecords: MatchedRecord[]) => void;
  setUnmatchedCases: (unmatchedCases: UnmatchedCase[]) => void;
  loadAll: () => Promise<void>;
}

export const useDataStore = create<DataState>((set) => ({
  brain: null,
  session: null,
  transactions: [],
  matchedRecords: [],
  unmatchedCases: [],
  isLoading: false,
  error: null,
  setBrain: (brain) => set({ brain }),
  setSession: (session) => set({ session }),
  setTransactions: (transactions) => set({ transactions }),
  setMatchedRecords: (matchedRecords) => set({ matchedRecords }),
  setUnmatchedCases: (unmatchedCases) => set({ unmatchedCases }),
  loadAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const [brain, session, transactions, matchedRecords, unmatchedCases] =
        await Promise.all([
          api.getBrain(),
          api.getSession(),
          api.getBankTransactions(),
          api.getMatches(),
          api.getUnmatched(),
        ]);
      set({ brain, session, transactions, matchedRecords, unmatchedCases });
    } catch (err) {
      set({ error: String(err) });
    } finally {
      set({ isLoading: false });
    }
  },
}));
