// pages/Wallets.tsx

import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/formatters';
import { Edit2, Eye, EyeOff, Plus, Save, Trash2, Wallet as WalletIcon, X } from 'lucide-react';;
import ConfirmModal from '../components/common/ConfirmModal';
import ToastNotification from '../components/common/ToastNotification';
import CustomSelect from '../components/common/CustomSelect';
import WalletDetailModal from '../components/modals/WalletDetailModal';
import NumberInput from '../components/common/NumberInput';

const walletTypes = [
  { id: 'cash', label: 'Cash', icon: '💵', color: '#10B981' },
  { id: 'bank_account', label: 'Bank Account', icon: '🏦', color: '#6366F1' },
  { id: 'credit_card', label: 'Credit Card', icon: '💳', color: '#EF4444' },
  { id: 'debit_card', label: 'Debit Card', icon: '💳', color: '#F59E0B' },
  { id: 'other', label: 'Other', icon: '📦', color: '#8B5CF6' },
];

const Wallets: React.FC = () => {
  const { wallets, transactions, addWallet, updateWallet, deleteWallet } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<any>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [showBalances, setShowBalances] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    type: 'cash' as any,
    bankName: '',
    lastFourDigits: '',
    color: '#10B981',
    icon: '💵',
    initialBalance: 0,
    isActive: true,
  });
  const [errors, setErrors] = useState({
    name: '',
  });

  const totalBalance = wallets.reduce((sum, w) => sum + w.currentBalance, 0);

  const handleDeleteClick = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const walletTransactions = transactions.filter(t => t.walletId === id);
    if (walletTransactions.length > 0) {
      setToastMessage(`Cannot delete wallet "${wallets.find(w => w.id === id)?.name}". It has ${walletTransactions.length} associated transactions. Please reassign or delete them first.`);
      setToastType('error');
      setShowToast(true);
      return;
    }
    setWalletToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (walletToDelete) {
      deleteWallet(walletToDelete);
      setToastMessage('Wallet deleted successfully');
      setToastType('success');
      setShowToast(true);
      setWalletToDelete(null);
      setShowDetailModal(false);
    }
    setShowDeleteConfirm(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'cash',
      bankName: '',
      lastFourDigits: '',
      color: '#10B981',
      icon: '💵',
      initialBalance: 0,
      isActive: true,
    });
    setEditingWallet(null);
    setErrors({ name: '' });
  };

  const handleEdit = (wallet: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingWallet(wallet);
    setFormData({
      name: wallet.name,
      type: wallet.type,
      bankName: wallet.bankName || '',
      lastFourDigits: wallet.lastFourDigits || '',
      color: wallet.color,
      icon: wallet.icon,
      initialBalance: wallet.initialBalance,
      isActive: wallet.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      setErrors({ name: 'Wallet name is required' });
      setToastMessage('Please enter a wallet name');
      setToastType('error');
      setShowToast(true);
      return;
    }

    if (editingWallet) {
      updateWallet(editingWallet.id, {
        name: formData.name,
        type: formData.type,
        bankName: formData.bankName,
        lastFourDigits: formData.lastFourDigits,
        color: formData.color,
        icon: formData.icon,
        isActive: formData.isActive,
      });
      setToastMessage('Wallet updated successfully');
    } else {
      addWallet({
        name: formData.name,
        type: formData.type,
        bankName: formData.bankName,
        lastFourDigits: formData.lastFourDigits,
        color: formData.color,
        icon: formData.icon,
        initialBalance: formData.initialBalance,
        isActive: true,
      });
      setToastMessage('Wallet created successfully');
    }
    setToastType('success');
    setShowToast(true);
    resetForm();
    setShowModal(false);
  };

  const handleWalletClick = (walletId: string) => {
    setSelectedWalletId(walletId);
    setShowDetailModal(true);
  };

  const handleTypeChange = (type: string) => {
    const selectedType = walletTypes.find(t => t.id === type);
    setFormData({
      ...formData,
      type: type as any,
      icon: selectedType?.icon || '💵',
      color: selectedType?.color || '#6366F1',
    });
  };

  const walletTypeOptions = walletTypes.map(wt => ({
    id: wt.id,
    label: wt.label,
    icon: wt.icon,
    color: wt.color,
  }));

  const activeWallets = wallets.filter(w => w.isActive);
  const inactiveWallets = wallets.filter(w => !w.isActive);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-light bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight">
            Wallets
          </h1>
          <p className="text-xs text-white/40 mt-0.5 font-light">Manage your money sources</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowBalances(!showBalances)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm font-light transition-all duration-300 flex items-center gap-2"
          >
            {showBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showBalances ? 'Hide' : 'Show'} Balances
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="group relative px-4 py-2 bg-white/5 hover:bg-white/10 transition-all duration-300 text-white text-sm font-light flex items-center gap-2 overflow-hidden rounded-lg"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
            Add Wallet
          </button>
        </div>
      </div>

      {/* Total Balance Card */}
      <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl p-6 border border-gray-800 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <WalletIcon className="w-6 h-6 text-[#6366F1]" />
          <span className="text-sm text-white/40 uppercase tracking-wider">Total Balance</span>
        </div>
        <p className="text-4xl font-light text-[#6366F1]">
          {showBalances ? formatCurrency(totalBalance) : '••••••'}
        </p>
        <p className="text-[10px] text-white/30 mt-2">Across all active wallets</p>
      </div>

      {/* Active Wallets */}
      <div className="mb-8">
        <h2 className="text-sm font-light text-white/60 mb-4 flex items-center gap-2">
          <WalletIcon className="w-4 h-4" />
          Active Wallets
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeWallets.map(wallet => (
            <div 
              key={wallet.id} 
              onClick={() => handleWalletClick(wallet.id)}
              className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4 transition-all duration-300 hover:bg-white/[0.06] cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${wallet.color}20` }}
                  >
                    {wallet.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-light text-white">{wallet.name}</h3>
                    <p className="text-[10px] text-white/40">
                      {walletTypes.find(t => t.id === wallet.type)?.label || wallet.type}
                      {wallet.lastFourDigits && ` • ****${wallet.lastFourDigits}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button onClick={(e) => handleEdit(wallet, e)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={(e) => handleDeleteClick(wallet.id, e)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/10">
                <span className="text-[10px] text-white/40">Balance</span>
                <span className="text-sm font-light text-white">
                  {showBalances ? formatCurrency(wallet.currentBalance) : '••••••'}
                </span>
              </div>
            </div>
          ))}
          {activeWallets.length === 0 && (
            <div className="col-span-full text-center py-8 text-white/40 text-sm font-light">
              No active wallets. Click "Add Wallet" to create one.
            </div>
          )}
        </div>
      </div>

      {/* Inactive Wallets */}
      {inactiveWallets.length > 0 && (
        <div>
          <h2 className="text-sm font-light text-white/40 mb-4 flex items-center gap-2">
            <WalletIcon className="w-4 h-4" />
            Inactive Wallets
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveWallets.map(wallet => (
              <div key={wallet.id} className="bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-xl p-4 opacity-60">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl opacity-50"
                      style={{ backgroundColor: `${wallet.color}20` }}
                    >
                      {wallet.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-light text-white/60">{wallet.name}</h3>
                      <p className="text-[10px] text-white/30">
                        {walletTypes.find(t => t.id === wallet.type)?.label || wallet.type}
                      </p>
                    </div>
                  </div>
                  <button onClick={(e) => handleDeleteClick(wallet.id, e)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                  <span className="text-[10px] text-white/30">Balance</span>
                  <span className="text-sm font-light text-white/40">
                    {showBalances ? formatCurrency(wallet.currentBalance) : '••••••'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal para agregar/editar wallet */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-white/10 sticky top-0 bg-[#1A1A2E]">
              <h3 className="text-lg font-light text-white">
                {editingWallet ? 'Edit Wallet' : 'New Wallet'}
              </h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-light">
                  Wallet Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50"
                  placeholder="e.g., My Cash, Banco de Bogotá, etc."
                />
                {errors.name && <p className="text-[10px] text-red-500/80 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-light">
                  Wallet Type <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  value={formData.type}
                  onChange={handleTypeChange}
                  options={walletTypeOptions}
                  placeholder="Select wallet type"
                />
              </div>

              {(formData.type === 'bank_account' || formData.type === 'credit_card' || formData.type === 'debit_card') && (
                <>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5 font-light">Bank Name</label>
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50"
                      placeholder="e.g., Bancolombia, Davivienda, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5 font-light">Last 4 Digits</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={formData.lastFourDigits}
                      onChange={(e) => setFormData({ ...formData, lastFourDigits: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50"
                      placeholder="****"
                    />
                  </div>
                </>
              )}

              {!editingWallet && (
                <NumberInput
                  label="Initial Balance"
                  value={formData.initialBalance}
                  onChange={(value) => setFormData({ ...formData, initialBalance: value })}
                  placeholder="0"
                  min={0}
                  showPreview
                  previewLabel="Initial balance"
                />
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded bg-white/[0.03] border border-white/10 checked:bg-[#6366F1]"
                />
                <label htmlFor="isActive" className="text-xs text-white/40">Active</label>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-white/10 sticky bottom-0 bg-[#1A1A2E]">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 px-4 py-2.5 bg-white/[0.03] hover:bg-white/10 rounded-lg text-white/60 text-sm font-light">
                Cancel
              </button>
              <button onClick={handleSubmit} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-lg text-white text-sm font-light hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {editingWallet ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

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