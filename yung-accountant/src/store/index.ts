// store/index.ts

// Stores
export { useMetaStore } from './meta.store'
export { useUserStore } from './user.store';
export { useCategoryStore } from './category.store';
export { useWalletStore } from './wallet.store';
export { useTransactionStore } from './transaction.store';
export { useGoalStore } from './goal.store';
export { useDebtStore } from './debt.store';
export { useHabitStore } from './habit.store';
export { useCommunityStore } from './community.store';
export { useSimulationStore } from './simulation.store';

// Selectors globales
export { useTotalBalance, useGoalsAllocatedBalance, useAvailableBalance, useDebtsBalance, useRealAvailableBalance, useUserStats } from './selectors.store';