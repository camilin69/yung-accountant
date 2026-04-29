// pages/Wallets/EmptyState.tsx
import React from 'react';
import { Plus, Wallet as WalletIcon } from 'lucide-react';

interface EmptyStateProps {
  onCreateWallet: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onCreateWallet }) => {
  return (
    <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-12 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-[var(--theme-background-glass)] rounded-full flex items-center justify-center">
          <WalletIcon className="w-8 h-8 text-[var(--theme-text-tertiary)]/50" />
        </div>
        <div>
          <h3 className="text-lg font-light text-[var(--theme-text-primary)] mb-2">No Wallets Yet</h3>
          <p className="text-sm text-[var(--theme-text-tertiary)] mb-6">Create your first wallet to start tracking your finances</p>
          <button
            onClick={onCreateWallet}
            className="px-4 py-2 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light transition-all duration-300 flex items-center gap-2 mx-auto border border-[var(--theme-border-light)]"
          >
            <Plus className="w-4 h-4" />
            Create First Wallet
          </button>
        </div>
      </div>
    </div>
  );
};