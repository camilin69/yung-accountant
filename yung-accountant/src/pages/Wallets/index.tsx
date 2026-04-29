// pages/Wallets/index.tsx
import React from 'react';
import { Wallet as WalletIcon, Sparkles, Plus, Eye, EyeOff } from 'lucide-react';
import { useThemeStyles } from '../../hooks/useTheme';
import { useTransactionStore } from '../../store';
import WalletDetailModal from './WalletDetailModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import ToastNotification from '../../components/common/ToastNotification';
import { WalletCard } from './WalletCard';
import { InactiveWalletCard } from './InactiveWalletCard'
import { WalletStats } from './WalletStats';
import { WalletFormModal } from './WalletFormModal';
import { EmptyState } from './EmptyState';
import { useWallets } from './useWallets';

const Wallets: React.FC = () => {
  const { getGradientTextClass } = useThemeStyles();
  const { transactions } = useTransactionStore();
  
  const {
    showModal,
    setShowModal,
    showDetailModal,
    setShowDetailModal,
    editingWallet,
    selectedWalletId,
    setSelectedWalletId,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showToast,
    setShowToast,
    toastMessage,
    toastType,
    showBalances,
    setShowBalances,
    formData,
    setFormData,
    errors,
    totalBalance,
    hasWallets,
    activeWallets,
    inactiveWallets,
    totalTransactions,
    handleDeleteClick,
    confirmDelete,
    resetForm,
    handleEdit,
    handleSubmit,
    handleWalletClick,
    handleTypeChange,
  } = useWallets();

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className={`text-2xl font-light tracking-tight ${getGradientTextClass()}`}>
            Wallets
          </h1>
          <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 font-light">Manage your money sources</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowBalances(!showBalances)}
            className="px-4 py-2 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light transition-all duration-300 flex items-center gap-2 border border-[var(--theme-border-light)]"
          >
            {showBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showBalances ? 'Hide' : 'Show'} Balances
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="group relative px-4 py-2 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] transition-all duration-300 text-[var(--theme-text-primary)] text-sm font-light flex items-center gap-2 overflow-hidden rounded-lg border border-[var(--theme-border-light)]"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
            Add Wallet
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
            <h2 className="text-sm font-light text-[var(--theme-text-secondary)] mb-4 flex items-center gap-2">
              <WalletIcon className="w-4 h-4" />
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
              <h2 className="text-sm font-light text-[var(--theme-text-tertiary)] mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
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

      {/* Wallet Form Modal */}
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

      {/* Wallet Detail Modal */}
      <WalletDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedWalletId(null);
        }}
        walletId={selectedWalletId}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Wallet"
        message="Are you sure you want to delete this wallet? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />

      {/* Toast Notification */}
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