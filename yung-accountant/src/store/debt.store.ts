// store/debt.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Category, Debt, DebtPayment, Transaction } from '../types';
import { useTransactionStore } from './transaction.store';
import { useCategoryStore } from './category.store';
import { useGoalStore } from './goal.store';
import { useWalletStore } from './wallet.store';
import { useUserStore } from './user.store';

const generateId = () => Date.now().toString();

interface DebtStore {
  debts: Debt[];
  setDebts: (debts: Debt[]) => void;
  addDebt: (debt: Omit<Debt, 'id' | 'userId' | 'createdAt' | 'remainingBalance' | 'payments'>) => void;
  updateDebt: (id: string, updates: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  addDebtPayment: (debtId: string, payment: Omit<DebtPayment, 'id' | 'debtId'>) => void;
  addCategory: (category: Omit<Category, 'id' | 'userId' | 'createdAt'>) => void;
}

export const useDebtStore = create<DebtStore>()(
  persist(
    (set, get) => ({
      debts: [],
      
      setDebts: (debts) => set({ debts }),
      
      addCategory: (category) => {
        const { addCategory: addCategoryToStore } = useCategoryStore.getState();
        const { user } = useUserStore();
        addCategoryToStore(category, user?.id || '');
      },
      
      addDebt: (debt) => {
        const { categories } = useCategoryStore.getState();
        const category = categories.find(c => c.id === debt.categoryId);
        const isExpense = debt.type === 'lent';
        const { user } = useUserStore();
        if (isExpense) {
          const { calculateWalletBalance, transactions } = useTransactionStore.getState();
          const { goals } = useGoalStore.getState();
          const currentBalance = calculateWalletBalance(debt.walletId, transactions, categories, goals);
          if (currentBalance < debt.originalAmount) {
            return;
          }
        }
        
        const newDebt: Debt = {
          ...debt,
          id: generateId(),
          userId: user?.id || '',
          remainingBalance: debt.originalAmount,
          payments: [],
          createdAt: new Date().toISOString(),
        };
        console.log("Got new Debt", newDebt);

        const transactionId = generateId();
        const newTransaction: Transaction = {
          id: transactionId,
          userId: user?.id || '',
          amount: debt.originalAmount,
          categoryId: debt.categoryId,
          categoryName: category?.name || 'Other',
          walletId: debt.walletId,
          description: `${debt.type === 'borrowed' ? 'Loan received from' : 'Loan given to'} ${debt.creditorName}`,
          date: debt.startDate,
          tags: ['debt', debt.type, newDebt.id, transactionId],
        };
        console.log("Got new transaction", newTransaction);
        
        const { addTransaction } = useTransactionStore.getState();
        addTransaction(newTransaction);
        
        set((state) => ({ debts: [...state.debts, newDebt] }));
      },
      
      updateDebt: (id, updates) => {
        const oldDebt = get().debts.find(d => d.id === id);
        if (!oldDebt) return;

        const finalUpdates = { ...updates };
        const totalPaymentsMade = (oldDebt.payments || []).reduce((sum, p) => sum + p.amount, 0);
        
        const isBeingCompletedByEdit = 
          finalUpdates.originalAmount !== undefined && 
          finalUpdates.originalAmount <= totalPaymentsMade &&
          finalUpdates.originalAmount !== oldDebt.originalAmount;
        
        const isAlreadyPaid = oldDebt.remainingBalance === 0;
        
        if (isBeingCompletedByEdit && !isAlreadyPaid) {
          finalUpdates.status = 'paid';
        }
        
        if (finalUpdates.status === 'paid' && !isAlreadyPaid) {
          finalUpdates.status = 'paid';
        }
        
        const amountChanged = finalUpdates.originalAmount !== undefined && finalUpdates.originalAmount !== oldDebt.originalAmount;
        const categoryChanged = finalUpdates.categoryId !== undefined && finalUpdates.categoryId !== oldDebt.categoryId;
        const walletChanged = finalUpdates.walletId !== undefined && finalUpdates.walletId !== oldDebt.walletId;
        
        if (amountChanged && oldDebt.type === 'lent') {
          const newAmount = finalUpdates.originalAmount!;
          let currentWalletId = oldDebt.walletId;
          if(walletChanged && finalUpdates.walletId) currentWalletId = finalUpdates.walletId;
          
          const { calculateWalletBalance, transactions } = useTransactionStore.getState();
          const { categories } = useCategoryStore.getState();
          const { goals } = useGoalStore.getState();
          const currentBalance = calculateWalletBalance(currentWalletId, transactions, categories, goals);
          
          if (currentBalance < newAmount) {
            console.log('Insufficient balance for lent amount increase');
            return;
          }
        }
        
        let newRemainingBalance = oldDebt.remainingBalance;
        
        if (amountChanged) {
          const amountDifference = finalUpdates.originalAmount! - oldDebt.originalAmount;
          newRemainingBalance = oldDebt.remainingBalance + amountDifference;
        }
        
        if (isBeingCompletedByEdit && !isAlreadyPaid) {
          newRemainingBalance = 0;
        }
        
        if (newRemainingBalance < 0) {
          newRemainingBalance = 0;
        }
        
        if (newRemainingBalance === 0 && oldDebt.status !== 'paid') {
          finalUpdates.status = 'paid';
        }
        
        set((state) => ({
          debts: state.debts.map((d) => 
            d.id === id ? { 
              ...d, 
              ...finalUpdates,
              remainingBalance: newRemainingBalance,
            } : d
          ),
        }));
        
        const updatedDebt = get().debts.find(d => d.id === id);
        
        if (updatedDebt && (amountChanged || categoryChanged || walletChanged)) {
          const { transactions } = useTransactionStore.getState();
          const relatedTransaction = transactions.find(t => 
            t.tags.includes(id) && t.tags.includes('debt') && !t.tags.includes('debt-payment')
          );
          
          if (relatedTransaction) {
            const newAmount = finalUpdates.originalAmount !== undefined ? finalUpdates.originalAmount : oldDebt.originalAmount;
            const newCategoryId = finalUpdates.categoryId !== undefined ? finalUpdates.categoryId : oldDebt.categoryId;
            const newType = finalUpdates.type !== undefined ? finalUpdates.type : oldDebt.type;
            const { categories } = useCategoryStore.getState();
            const newCategory = categories.find(c => c.id === newCategoryId);
            const { wallets } = useWalletStore.getState();
            const newWallet = wallets.find(w => w.id === finalUpdates.walletId);
            
            const { updateTransaction } = useTransactionStore.getState();
            updateTransaction(relatedTransaction.id, {
              amount: newAmount,
              categoryId: newCategoryId,
              walletId: newWallet?.id,
              categoryName: newCategory?.name || 'Other',
              description: `${newType === 'borrowed' ? 'Loan received from' : 'Loan given to'} ${updatedDebt.creditorName}`,
            });
          }
        }
      },
      
      deleteDebt: (id) => {
        const debt = get().debts.find(d => d.id === id);
        if (debt) {
          const { transactions, deleteTransaction } = useTransactionStore.getState();
          const relatedTransactions = transactions.filter(t => 
            t.tags.includes(id) || 
            (t.tags.includes('debt-adjustment') && t.tags.includes(id)) ||
            (t.description.includes(debt.creditorName) && t.tags.includes('debt'))
          );
          
          relatedTransactions.forEach(t => {
            deleteTransaction(t.id);
          });
          
          set((state) => ({
            debts: state.debts.filter((d) => d.id !== id),
          }));
        } else {
          set((state) => ({
            debts: state.debts.filter((d) => d.id !== id),
          }));
        }
      },
      
      addDebtPayment: (debtId, payment) => {
        const debt = get().debts.find(d => d.id === debtId);
        if (!debt) return;
        
        if (debt.type === 'borrowed') {
          const { calculateWalletBalance, transactions } = useTransactionStore.getState();
          const { categories } = useCategoryStore.getState();
          const { goals } = useGoalStore.getState();
          const currentBalance = calculateWalletBalance(debt.walletId, transactions, categories, goals);
          if (currentBalance < payment.amount) {
            console.log('Insufficient balance for debt payment');
            return;
          }
        }
        
        const newPayment: DebtPayment = { ...payment, id: generateId(), debtId };
        const newBalance = debt.remainingBalance - payment.amount;
        const isFullyPaid = newBalance <= 0;
        
        let paymentCategoryId: string | undefined;
        const { categories, addCategory } = useCategoryStore.getState();
        
        if (debt.type === 'borrowed') {
          paymentCategoryId = categories.find(c => c.name === 'Debt Payment' && c.type === 'expense')?.id;
          if (!paymentCategoryId) {
            const newCategory = {
              id: 'debt-payment-default',
              userId: '1',
              name: 'Debt Payment',
              type: 'expense' as const,
              icon: '💸',
              color: '#EF4444',
              isDefault: true,
              createdAt: new Date().toISOString(),
            };
            const { user } = useUserStore();
            addCategory(newCategory, user?.id || '');
            paymentCategoryId = newCategory.id;
          }
        } else {
          paymentCategoryId = categories.find(c => c.name === 'Debt Collection' && c.type === 'income')?.id;
          if (!paymentCategoryId) {
            const newCategory = {
              id: 'debt-collection-default',
              userId: '1',
              name: 'Debt Collection',
              type: 'income' as const,
              icon: '💰',
              color: '#10B981',
              isDefault: true,
              createdAt: new Date().toISOString(),
            };
            const { user } = useUserStore();
            addCategory(newCategory, user?.id || '');
            paymentCategoryId = newCategory.id;
          }
        }
        
        const transactionId = generateId();
        const newTransaction: Transaction = {
          id: transactionId,
          userId: '1',
          amount: payment.amount,
          categoryId: paymentCategoryId,
          categoryName: debt.type === 'borrowed' ? 'Debt Payment' : 'Debt Collection',
          walletId: debt.walletId,
          description: debt.type === 'borrowed' 
            ? `Payment to ${debt.creditorName}${payment.notes ? ` - ${payment.notes}` : ''}`
            : `Payment received from ${debt.creditorName}${payment.notes ? ` - ${payment.notes}` : ''}`,
          date: payment.date,
          tags: ['debt-payment', debtId, transactionId],
        };
        
        const { addTransaction } = useTransactionStore.getState();
        addTransaction(newTransaction);
        
        set((state) => ({
          debts: state.debts.map((d) => 
            d.id === debtId 
              ? { 
                  ...d, 
                  payments: [...(d.payments || []), newPayment],
                  remainingBalance: newBalance,
                  status: isFullyPaid ? 'paid' : d.status
                }
              : d
          ),
        }));
      },
    }),
    { name: 'yung-accountant-debts' }
  )
);