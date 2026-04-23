// pages/Wallets.tsx

import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/formatters';
import { 
  Edit2, 
  Eye, 
  EyeOff, 
  Plus, 
  Save, 
  Trash2, 
  Wallet as WalletIcon, 
  X,
  CreditCard,
  Sparkles,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Building2,
  CreditCard as CreditCardIcon,
  Package
} from 'lucide-react';
import ConfirmModal from '../components/common/ConfirmModal';
import ToastNotification from '../components/common/ToastNotification';
import CustomSelect from '../components/common/CustomSelect';
import WalletDetailModal from '../components/modals/WalletDetailModal';

const walletTypes = [
  { id: 'cash', label: 'Cash', icon: <DollarSign className="w-4 h-4" />, color: '#10B981' },
  { id: 'bank_account', label: 'Bank Account', icon: <Building2 className="w-4 h-4" />, color: '#6366F1' },
  { id: 'credit_card', label: 'Credit Card', icon: <CreditCardIcon className="w-4 h-4" />, color: '#EF4444' },
  { id: 'debit_card', label: 'Debit Card', icon: <CreditCardIcon className="w-4 h-4" />, color: '#F59E0B' },
  { id: 'other', label: 'Other', icon: <Package className="w-4 h-4" />, color: '#8B5CF6' },
];

const Wallets: React.FC = () => {
  const { wallets, transactions, categories, addWallet, updateWallet, deleteWallet } = useStore();
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
    icon: <DollarSign className="w-4 h-4" />,
  });
  const [errors, setErrors] = useState({
    name: '',
  });

  // Calcular el balance total REAL desde las transacciones
  const totalBalance = useMemo(() => {
    return transactions.reduce((total, transaction) => {
      const category = categories.find(c => c.id === transaction.categoryId);
      if (category?.type === 'income') {
        return total + transaction.amount;
      } else if (category?.type === 'expense') {
        return total - transaction.amount;
      }
      return total;
    }, 0);
  }, [transactions, categories]);

  const hasWallets = wallets.length > 0;
  const activeWallets = wallets.filter(w => w.isActive);
  const inactiveWallets = wallets.filter(w => !w.isActive);

  // Estadísticas
  const totalTransactions = transactions.length;

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
      icon: <DollarSign className="w-4 h-4" />,
    });
    setEditingWallet(null);
    setErrors({ name: '' });
  };

  const handleEdit = (wallet: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingWallet(wallet);
    // Convertir el icono de string a componente si es necesario
    const getIconComponent = (_iconName: string) => {
      const type = walletTypes.find(t => t.id === wallet.type);
      return type?.icon || <DollarSign className="w-4 h-4" />;
    };
    setFormData({
      name: wallet.name,
      type: wallet.type,
      bankName: wallet.bankName || '',
      lastFourDigits: wallet.lastFourDigits || '',
      color: wallet.color,
      icon: getIconComponent(wallet.icon),
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

    const selectedType = walletTypes.find(t => t.id === formData.type);
    const iconString = selectedType?.id === 'cash' ? 'DollarSign' : 
                       selectedType?.id === 'bank_account' ? 'Building2' :
                       selectedType?.id === 'credit_card' ? 'CreditCard' :
                       selectedType?.id === 'debit_card' ? 'CreditCard' : 'Package';

    if (editingWallet) {
      updateWallet(editingWallet.id, {
        name: formData.name,
        type: formData.type,
        bankName: formData.bankName,
        lastFourDigits: formData.lastFourDigits,
        color: formData.color,
        icon: iconString,
        isActive: true,
      });
      setToastMessage('Wallet updated successfully');
    } else {
      addWallet({
        name: formData.name,
        type: formData.type,
        bankName: formData.bankName,
        lastFourDigits: formData.lastFourDigits,
        color: formData.color,
        icon: iconString,
        initialBalance: 0,
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
      icon: selectedType?.icon || <DollarSign className="w-4 h-4" />,
      color: selectedType?.color || '#6366F1',
    });
  };

  const walletTypeOptions = walletTypes.map(wt => ({
    id: wt.id,
    label: wt.label,
    icon: wt.icon,
    color: wt.color,
  }));

  // Función para renderizar el icono de la wallet en la tarjeta
  const renderWalletIcon = (wallet: any) => {
    const typeInfo = walletTypes.find(t => t.id === wallet.type);
    if (typeInfo) {
      return typeInfo.icon;
    }
    return <DollarSign className="w-5 h-5" style={{ color: wallet.color }} />;
  };

  return (
    <div className="max-w-7xl mx-auto">
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

      {/* Stats Cards */}
      {hasWallets && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <WalletIcon className="w-4 h-4 text-[#6366F1]" />
              <span className="text-xs text-white/40">Total Balance</span>
            </div>
            <p className="text-2xl font-light text-[#6366F1]">
              {showBalances ? formatCurrency(totalBalance) : '••••••'}
            </p>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-white/40">Active Wallets</span>
            </div>
            <p className="text-2xl font-light text-yellow-500">{activeWallets.length}</p>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs text-white/40">Total Transactions</span>
            </div>
            <p className="text-2xl font-light text-green-500">{totalTransactions}</p>
          </div>
        </div>
      )}

      {/* Conditional: Show "Create First Wallet" or Active Wallets */}
      {!hasWallets ? (
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
              <WalletIcon className="w-8 h-8 text-white/30" />
            </div>
            <div>
              <h3 className="text-lg font-light text-white mb-2">No Wallets Yet</h3>
              <p className="text-sm text-white/40 mb-6">Create your first wallet to start tracking your finances</p>
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm font-light transition-all duration-300 flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Create First Wallet
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Active Wallets */}
          <div className="mb-10">
            <h2 className="text-sm font-light text-white/60 mb-4 flex items-center gap-2">
              <WalletIcon className="w-4 h-4" />
              Active Wallets
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeWallets.map(wallet => {
                const walletTransactions = transactions.filter(t => t.walletId === wallet.id);
                const transactionCount = walletTransactions.length;
                
                return (
                  <div 
                    key={wallet.id} 
                    onClick={() => handleWalletClick(wallet.id)}
                    className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-5 transition-all duration-300 hover:bg-white/[0.06] hover:scale-[1.02] cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${wallet.color}20` }}
                        >
                          {renderWalletIcon(wallet)}
                        </div>
                        <div>
                          <h3 className="text-base font-light text-white">{wallet.name}</h3>
                          <p className="text-[10px] text-white/40">
                            {walletTypes.find(t => t.id === wallet.type)?.label || wallet.type}
                            {wallet.lastFourDigits && ` • ****${wallet.lastFourDigits}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={(e) => handleEdit(wallet, e)} 
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteClick(wallet.id, e)} 
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-white/10">
                      <div>
                        <span className="text-[10px] text-white/40">Balance</span>
                        <p className="text-lg font-light text-white">
                          {showBalances ? formatCurrency(wallet.currentBalance) : '••••••'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-white/40">Transactions</span>
                        <p className="text-sm font-light text-white/60">{transactionCount}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inactive Wallets */}
          {inactiveWallets.length > 0 && (
            <div>
              <h2 className="text-sm font-light text-white/40 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Inactive Wallets
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {inactiveWallets.map(wallet => (
                  <div 
                    key={wallet.id} 
                    className="bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-xl p-5 opacity-60 hover:opacity-80 transition-all duration-300"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center opacity-50"
                          style={{ backgroundColor: `${wallet.color}20` }}
                        >
                          {renderWalletIcon(wallet)}
                        </div>
                        <div>
                          <h3 className="text-base font-light text-white/60">{wallet.name}</h3>
                          <p className="text-[10px] text-white/30">
                            {walletTypes.find(t => t.id === wallet.type)?.label || wallet.type}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteClick(wallet.id, e)} 
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-white/5">
                      <div>
                        <span className="text-[10px] text-white/30">Balance</span>
                        <p className="text-lg font-light text-white/40">
                          {showBalances ? formatCurrency(wallet.currentBalance) : '••••••'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal para agregar/editar wallet */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-md flex flex-col max-h-[85vh]">
            {/* Header - Sticky */}
            <div className="sticky top-0 z-10 bg-white/[0.03] backdrop-blur-xl rounded-t-xl">
              <div className="flex justify-between items-center p-5 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-light text-white">
                    {editingWallet ? 'Edit Wallet' : 'New Wallet'}
                  </h3>
                  <p className="text-xs text-white/40 mt-0.5 font-light">
                    {editingWallet ? 'Update your wallet details' : 'Add a new source of funds'}
                  </p>
                </div>
                <button 
                  onClick={() => { setShowModal(false); resetForm(); }} 
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-5 space-y-5">
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 font-light">
                    Wallet Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (e.target.value.trim()) {
                        setErrors({ name: '' });
                      }
                    }}
                    className={`w-full px-4 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors placeholder:text-white/20 ${
                      errors.name ? 'border-red-500/50' : 'border-white/10'
                    }`}
                    placeholder="e.g., My Cash, Banco de Bogotá, etc."
                    autoFocus
                  />
                  {errors.name && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 text-red-500/80" />
                      <p className="text-[10px] text-red-500/80">{errors.name}</p>
                    </div>
                  )}
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
                      <label className="block text-xs text-white/40 mb-1.5 font-light">Bank Name (Optional)</label>
                      <input
                        type="text"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors placeholder:text-white/20"
                        placeholder="e.g., Bancolombia, Davivienda, etc."
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1.5 font-light">Last 4 Digits (Optional)</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={formData.lastFourDigits}
                        onChange={(e) => setFormData({ ...formData, lastFourDigits: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors placeholder:text-white/20"
                        placeholder="****"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Footer - Sticky */}
            <div className="sticky bottom-0 bg-white/[0.03] backdrop-blur-xl rounded-b-xl">
              <div className="flex gap-3 p-5 border-t border-white/10">
                <button 
                  onClick={() => { setShowModal(false); resetForm(); }} 
                  className="flex-1 px-4 py-2.5 bg-white/[0.03] hover:bg-white/10 rounded-lg text-white/60 text-sm font-light transition-all duration-300"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmit} 
                  disabled={!formData.name.trim()}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-light transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 ${
                    !formData.name.trim()
                      ? 'bg-white/10 text-white/30 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#6366F1] to-[#EC4899]'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {editingWallet ? 'Update' : 'Create'}
                </button>
              </div>
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