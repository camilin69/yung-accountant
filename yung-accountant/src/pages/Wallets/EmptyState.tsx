// pages/Wallets/EmptyState.tsx

import React from 'react';
import { Plus, Wallet as WalletIcon } from 'lucide-react';

interface EmptyStateProps {
  onCreateWallet: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onCreateWallet }) => {
  return (
    <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
          <WalletIcon className="w-8 h-8 text-white/30" />
        </div>
        <div>
          <h3 className="text-lg font-light text-white mb-2">No Wallets Yet</h3>
          <p className="text-sm text-white/40 mb-6">Create your first wallet to start tracking your finances</p>
          <button
            onClick={onCreateWallet}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm font-light transition-all duration-300 flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Create First Wallet
          </button>
        </div>
      </div>
    </div>
  );
};