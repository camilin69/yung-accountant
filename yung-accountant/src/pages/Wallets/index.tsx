// pages/Wallets/index.tsx
import React from 'react';
import { Wallet as WalletIcon, Sparkles, Plus, Eye, EyeOff } from 'lucide-react';
import { useTransactionStore } from '../../store';
import WalletDetailModal from './WalletDetailModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import ToastNotification from '../../components/common/ToastNotification';
import { WalletCard } from './WalletCard';
import { InactiveWalletCard } from './InactiveWalletCard';
import { WalletStats } from './WalletStats';
import { WalletFormModal } from './WalletFormModal';
import { EmptyState } from './EmptyState';
import { useWallets } from './useWallets';

const Wallets: React.FC = () => {
  const { transactions } = useTransactionStore();
  
  const {
    showModal, setShowModal, showDetailModal, setShowDetailModal,
    editingWallet, selectedWalletId, setSelectedWalletId,
    showDeleteConfirm, setShowDeleteConfirm,
    showToast, setShowToast, toastMessage, toastType,
    showBalances, setShowBalances,
    formData, setFormData, errors,
    totalBalance, hasWallets, activeWallets, inactiveWallets,
    totalTransactions, handleDeleteClick, confirmDelete,
    resetForm, handleEdit, handleSubmit, handleWalletClick, handleTypeChange,
  } = useWallets();

  return (
    <div className="max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 mb-10 pt-4 animate-fade-in-down">
        <div>
          <h1 className="text-[34px] font-light tracking-[-0.03em]" style={{ color: 'var(--theme-text-primary)' }}>
            Wallets
          </h1>
          <p className="text-[14px] mt-1.5 tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)' }}>
            Manage your money sources
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowBalances(!showBalances)}
            className="px-5 py-3 rounded-2xl text-[12px] font-medium tracking-[0.04em] uppercase flex items-center gap-2 transition-all duration-500 hover:-translate-y-1 glass-sm"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            {showBalances ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
            {showBalances ? 'Hide' : 'Show'} Balances
          </button>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="px-5 py-3 rounded-2xl text-[12px] font-medium tracking-[0.04em] uppercase flex items-center gap-2 transition-all duration-500 hover:-translate-y-1 active:scale-95"
            style={{ 
              backgroundColor: 'var(--theme-primary)', 
              color: '#FFFFFF',
              boxShadow: '0 4px 20px -6px var(--theme-primary)'
            }}
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} /> Add Wallet
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {hasWallets && (
        <WalletStats
          totalBalance={totalBalance}
          activeWalletsCount={activeWallets.length}
          totalTransactions={totalTransactions}
          showBalances={showBalances}
        />
      )}

      {/* Conditional: Show "Create First Wallet" or Active Wallets */}
      {!hasWallets ? (
        <EmptyState onCreateWallet={() => { resetForm(); setShowModal(true); }} />
      ) : (
        <>
          {/* Active Wallets */}
          <div className="mb-10">
            <h2 className="text-[15px] font-medium tracking-[0.02em] mb-5 flex items-center gap-3" style={{ color: 'var(--theme-text-secondary)' }}>
              <div className="w-9 h-9 rounded-[1rem] flex items-center justify-center glass-sm">
                <WalletIcon className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />
              </div>
              Active Wallets
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeWallets.map(wallet => {
                const walletTransactions = transactions.filter(t => t.walletId === wallet.id);
                const transactionCount = walletTransactions.length;
                
                return (
                  <WalletCard
                    key={wallet.id}
                    wallet={wallet}
                    transactionCount={transactionCount}
                    showBalances={showBalances}
                    onWalletClick={handleWalletClick}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                  />
                );
              })}
            </div>
          </div>

          {/* Inactive Wallets */}
          {inactiveWallets.length > 0 && (
            <div>
              <h2 className="text-[15px] font-medium tracking-[0.02em] mb-5 flex items-center gap-3" style={{ color: 'var(--theme-text-tertiary)' }}>
                <div className="w-9 h-9 rounded-[1rem] flex items-center justify-center glass-sm">
                  <Sparkles className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
                </div>
                Inactive Wallets
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {inactiveWallets.map(wallet => (
                  <InactiveWalletCard
                    key={wallet.id}
                    wallet={wallet}
                    showBalances={showBalances}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <WalletFormModal
        isOpen={showModal}
        editingWallet={editingWallet}
        formData={formData}
        setFormData={setFormData}
        errors={errors}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        onTypeChange={handleTypeChange}
      />

      <WalletDetailModal
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedWalletId(null); }}
        walletId={selectedWalletId}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Wallet"
        message="Are you sure you want to delete this wallet? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />

      <ToastNotification
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </div>
  );
};

export default Wallets;