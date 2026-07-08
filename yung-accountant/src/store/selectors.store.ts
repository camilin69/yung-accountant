// store/selectors.store.ts

import { useGoalStore } from './goal.store';
import { useDebtStore } from './debt.store';
import { useCommunityStore } from './community.store';
import { useUserStore } from './user.store';
import { useWalletStore } from './wallet.store';

export const useTotalBalance = () => {
  const wallets = useWalletStore((state) => state.wallets);
  return wallets.reduce((total, w) => total + (w.currentBalance || 0), 0);
};

export const useGoalsAllocatedBalance = () => {
  const goals = useGoalStore((state) => state.goals);
  return goals
    .filter(goal => goal.status === 'active')
    .reduce((total, goal) => total + goal.currentAmount, 0);
};

export const useDebtsBalance = () => {
  const debts = useDebtStore((state) => state.debts);
  const borrowed = debts
    .filter(d => d.type === 'borrowed' && d.status === 'active')
    .reduce((sum, d) => sum + d.remainingBalance, 0);
  const lent = debts
    .filter(d => d.type === 'lent' && d.status === 'active')
    .reduce((sum, d) => sum + d.remainingBalance, 0);
  return { borrowed, lent, net: lent - borrowed };
};

export const useAvailableBalance = () => {
  const totalBalance = useTotalBalance();
  const allocatedToGoals = useGoalsAllocatedBalance();
  const { borrowed: activeDebts } = useDebtsBalance();
  
  const realAvailable = totalBalance - activeDebts;
  return realAvailable - allocatedToGoals;
};

export const useRealAvailableBalance = () => {
  const availableBalance = useAvailableBalance();
  const { net } = useDebtsBalance();
  return availableBalance + net;
};

export const useUserStats = () => {
  const posts = useCommunityStore((state) => state.posts);
  const user = useUserStore((state) => state.user);
  
  const userPosts = posts.filter(p => p.userId === user?.id);
  const totalLikes = userPosts.reduce((sum, p) => sum + p.likesCount, 0);
  const totalComments = userPosts.reduce((sum, p) => sum + p.comments.length, 0);
  
  return {
    totalPosts: userPosts.length,
    totalLikes,
    totalComments,
  };
};