// pages/Wallets/EmptyState.tsx
import React from 'react';
import { Plus, Wallet as WalletIcon } from 'lucide-react';

interface EmptyStateProps {
  onCreateWallet: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onCreateWallet }) => {
  return (
    <div className="rounded-[2.5rem] p-16 text-center glass-aero animate-fade-in-up">
      <div className="flex flex-col items-center gap-5">
        <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center glass-sm">
          <WalletIcon className="w-10 h-10" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.3 }} strokeWidth={1} />
        </div>
        <div>
          <h3 className="text-[20px] font-light tracking-[-0.02em] mb-2" style={{ color: 'var(--theme-text-primary)' }}>No Wallets Yet</h3>
          <p className="text-[14px] tracking-[0.03em] mb-7" style={{ color: 'var(--theme-text-tertiary)' }}>
            Create your first wallet to start tracking your finances
          </p>
          <button
            onClick={onCreateWallet}
            className="px-7 py-3.5 rounded-2xl text-[13px] font-medium tracking-[0.04em] uppercase flex items-center gap-2.5 mx-auto transition-all duration-500 hover:-translate-y-1 active:scale-95"
            style={{ 
              backgroundColor: 'var(--theme-primary)', 
              color: '#FFFFFF',
              boxShadow: '0 4px 24px -6px var(--theme-primary)'
            }}
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} /> Create First Wallet
          </button>
        </div>
      </div>
    </div>
  );
};