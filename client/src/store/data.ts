import { create } from 'zustand';
import { api } from '@/services/api';
import type {
  FinancialBrain,
  ReconciliationSession,
  BankTransaction,
  SapTransaction,
  MatchedRecord,
  UnmatchedCase,
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
  setBrain: (brain: FinancialBrain | null) => void;
  setSession: (session: ReconciliationSession | null) => void;
  setTransactions: (transactions: BankTransaction[]) => void;
  setSapTransactions: (sapTransactions: SapTransaction[]) => void;
  setMatchedRecords: (matchedRecords: MatchedRecord[]) => void;
  setUnmatchedCases: (unmatchedCases: UnmatchedCase[]) => void;
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
  setBrain: (brain) => set({ brain }),
  setSession: (session) => set({ session }),
  setTransactions: (transactions) => set({ transactions }),
  setSapTransactions: (sapTransactions) => set({ sapTransactions }),
  setMatchedRecords: (matchedRecords) => set({ matchedRecords }),
  setUnmatchedCases: (unmatchedCases) => set({ unmatchedCases }),
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
      set({ brain, session, transactions, sapTransactions, matchedRecords, unmatchedCases });
    } catch (err) {
      set({ error: String(err) });
    } finally {
      set({ isLoading: false });
    }
  },
}));
