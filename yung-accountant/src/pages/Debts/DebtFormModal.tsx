// pages/Debts/DebtFormModal.tsx
import React from 'react';
import { X, Save, TrendingUp, TrendingDown, AlertCircle, PlusCircle, ArrowLeft, WalletIcon } from 'lucide-react';
import CustomSelect from '../../components/common/CustomSelect';
import NumberInput from '../../components/common/NumberInput';
import { formatCurrency } from '../../utils/formatters';

interface DebtFormModalProps {
  isOpen: boolean;
  editingDebt: any;
  formData: any;
  setFormData: (data: any) => void;
  setInterestRateInput: (value: string) => void;
  errors: any;
  realAmountToPay: number;
  realAmountError: string | null;
  balanceError: string | null;
  paymentValidationError: string | null;
  editAmountError: string | null;
  interestRateInput: string;
  selectedVariableMonth: number;
  monthOptions: any[];
  walletOptions: any[];
  selectedWallet: any;
  realAvailableBalance: number;
  totalPaymentsMade: number;
  noWalletsMessage: boolean;
  hasActiveWallets: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onInterestTypeChange: (type: 'fixed' | 'variable') => void;
  onMonthlyPaymentChange: (value: number) => void;
  onTermMonthsChange: (value: number) => void;
  onRealAmountChange: (value: number) => void;
  onWalletChange: (value: string) => void;
  onCreateWallet: () => void;
}

export const DebtFormModal: React.FC<DebtFormModalProps> = ({
  isOpen, editingDebt, formData, setFormData, setInterestRateInput,
  errors, realAmountToPay, realAmountError, balanceError,
  paymentValidationError, editAmountError, interestRateInput,
  selectedVariableMonth, monthOptions, walletOptions,
  selectedWallet, realAvailableBalance, totalPaymentsMade,
  noWalletsMessage, onClose, onSubmit, onInterestTypeChange,
  onMonthlyPaymentChange, onTermMonthsChange, onRealAmountChange,
  onWalletChange, onCreateWallet,
}) => {
  if (!isOpen) return null;

  const typeStyles = {
    borrowed: { bg: 'rgba(239,68,68,0.12)', text: '#EF4444', border: 'rgba(239,68,68,0.25)' },
    lent: { bg: 'rgba(16,185,129,0.12)', text: '#10B981', border: 'rgba(16,185,129,0.25)' },
  };
  
  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md flex flex-col max-h-[85vh] rounded-[2rem] overflow-hidden glass-aero animate-scale-in">
        {/* Header */}
        <div className="flex justify-between items-center p-5" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="lg:hidden p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
            </button>
            <div>
              <h3 className="text-lg font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>
                {editingDebt ? 'Edit Debt' : 'New Debt'}
              </h3>
              <p className="text-xs tracking-[0.03em] mt-0.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                {editingDebt ? 'Update your debt details' : 'Record a new debt or loan'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="hidden lg:block p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
            <X className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
          </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto modal-scroll">
          <div className="p-5 space-y-5">
            {/* Debt Type */}
            <div>
              <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                Debt Type <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div className="flex gap-3">
                {(['borrowed', 'lent'] as const).map((type) => {
                  const isSelected = formData.type === type;
                  const isDisabled = !!editingDebt && editingDebt.type !== type;
                  const style = typeStyles[type];
                  
                  return (
                    <button 
                      key={type}
                      onClick={() => { if (!editingDebt) setFormData({ ...formData, type }); }} 
                      disabled={isDisabled}
                      className="flex-1 py-3 rounded-2xl text-sm font-medium transition-all duration-500 flex items-center justify-center gap-2 hover:-translate-y-0.5"
                      style={{
                        backgroundColor: isSelected ? style.bg : 'var(--theme-background-glass-hover)',
                        color: isSelected ? style.text : isDisabled ? 'var(--theme-text-tertiary)' : 'var(--theme-text-tertiary)',
                        border: isSelected ? `1px solid ${style.border}` : '1px solid var(--theme-border-dark)',
                        boxShadow: isSelected ? `0 4px 12px -4px ${style.bg}` : 'none',
                        opacity: isDisabled ? 0.3 : 1,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {type === 'borrowed' ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                      {type === 'borrowed' ? 'I Owe' : 'Owed to Me'}
                    </button>
                  );
                })}
              </div>
              {editingDebt && (
                <div className="flex items-center gap-1.5 mt-2">
                  <AlertCircle className="w-3 h-3" style={{ color: '#F59E0B', opacity: 0.8 }} />
                  <p className="text-[10px] font-medium" style={{ color: '#F59E0B', opacity: 0.7 }}>
                    Debt type cannot be changed while editing
                  </p>
                </div>
              )}
            </div>

            {/* Creditor/Borrower Name */}
            <div>
              <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                {formData.type === 'borrowed' ? 'Lender Name' : 'Borrower Name'} <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.creditorName}
                onChange={(e) => setFormData({ ...formData, creditorName: e.target.value })}
                className={`w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm ${
                  errors.creditorName ? 'ring-1 ring-red-500/30' : ''
                }`}
                style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }}
                placeholder={formData.type === 'borrowed' ? 'Bank, Friend, Family...' : 'Person who owes you...'}
              />
              {errors.creditorName && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <AlertCircle className="w-3 h-3" style={{ color: '#EF4444', opacity: 0.8 }} />
                  <p className="text-[10px] font-medium" style={{ color: '#EF4444', opacity: 0.8 }}>{errors.creditorName}</p>
                </div>
              )}
            </div>

            {/* Wallet */}
            <div>
              <CustomSelect
                label="Wallet"
                value={formData.walletId}
                onChange={onWalletChange}
                options={walletOptions}
                placeholder={noWalletsMessage ? "No wallets available" : "Select a wallet"}
                required
                error={errors.walletId}
              />
              {noWalletsMessage && (
                <div className="mt-2 p-3 rounded-[1rem] flex items-center gap-2.5" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#F59E0B' }} />
                  <p className="text-xs font-medium" style={{ color: '#F59E0B', opacity: 0.85 }}>
                    You don't have any wallets yet.{' '}
                    <button onClick={onCreateWallet} className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline" style={{ color: '#F59E0B' }}>
                      <PlusCircle className="w-3.5 h-3.5" /> Create wallet
                    </button>
                  </p>
                </div>
              )}
              {formData.walletId && selectedWallet && !noWalletsMessage && (
                <p className="text-[10px] font-medium mt-1.5 flex items-center gap-1.5" style={{ color: formData.type === 'lent' && formData.originalAmount > realAvailableBalance ? '#EF4444' : 'var(--theme-text-tertiary)' }}>
                  <WalletIcon className="w-3 h-3" />
                  Available balance: {formatCurrency(realAvailableBalance)}
                </p>
              )}
            </div>

            {/* Amount */}
            <NumberInput
              label="Amount"
              value={formData.originalAmount}
              onChange={(value) => setFormData({ ...formData, originalAmount: value })}
              placeholder="0"
              min={editingDebt ? totalPaymentsMade : 1}
              max={editingDebt && formData.type === 'lent' ? realAvailableBalance + totalPaymentsMade : undefined}
              required
              showPreview
              previewLabel="Amount"
              error={errors.originalAmount || editAmountError}
            />

            {editAmountError && (
              <div className="flex items-start gap-2.5 p-3 rounded-[1rem]" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
                <div className="flex-1">
                  <p className="text-xs font-medium" style={{ color: '#EF4444', opacity: 0.85 }}>{editAmountError}</p>
                  {editingDebt && totalPaymentsMade > 0 && (
                    <p className="text-[9px] font-medium mt-1" style={{ color: '#EF4444', opacity: 0.6 }}>
                      You have made {formatCurrency(totalPaymentsMade)} in payments already.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Balance Error */}
            {balanceError && (
              <div className="flex items-center gap-2.5 p-3 rounded-[1rem]" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#EF4444' }} />
                <p className="text-xs font-medium" style={{ color: '#EF4444', opacity: 0.85 }}>{balanceError}</p>
              </div>
            )}

            {/* Monthly Payment */}
            <NumberInput
              label="Monthly Payment"
              value={formData.monthlyPayment}
              onChange={onMonthlyPaymentChange}
              placeholder="0"
              min={1}
              required
              showPreview
              previewLabel="Monthly payment"
              error={errors.monthlyPayment}
            />

            {/* Payment Validation Error */}
            {paymentValidationError && (
              <div className="flex items-center gap-2.5 p-3 rounded-[1rem]" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#EF4444' }} />
                <p className="text-xs font-medium" style={{ color: '#EF4444', opacity: 0.85 }}>{paymentValidationError}</p>
              </div>
            )}

            {/* Interest Rate & Type */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>Interest Rate (%)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={interestRateInput}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (value === '') { setInterestRateInput(''); setFormData({ ...formData, interestRate: 0 }); return; }
                      let normalizedValue = value.replace(',', '.');
                      const regex = /^\d*\.?\d{0,3}$/;
                      if (!regex.test(normalizedValue)) return;
                      const parts = normalizedValue.split('.');
                      if (parts[0] && parts[0].length > 2) return;
                      const numValue = parseFloat(normalizedValue);
                      if (isNaN(numValue)) return;
                      if (numValue > 99.999) return;
                      const displayValue = normalizedValue.replace('.', ',');
                      setInterestRateInput(displayValue);
                      if (formData.interestType === 'fixed') { setFormData({ ...formData, interestRate: numValue }); }
                    }}
                    min="0"
                    max="99.999"
                    className="flex-1 px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm"
                    style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }}
                    placeholder="0"
                  />
                  {formData.interestType === 'variable' && (
                    <div className="w-32">
                      <CustomSelect
                        value={String(selectedVariableMonth)}
                        onChange={() => {}}
                        options={monthOptions}
                        placeholder="Month"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>Interest Type</label>
                <div className="flex gap-2">
                  {(['fixed', 'variable'] as const).map((type) => {
                    const isSelected = formData.interestType === type;
                    return (
                      <button 
                        key={type}
                        onClick={() => onInterestTypeChange(type)} 
                        className="flex-1 py-3 rounded-2xl text-xs font-medium transition-all duration-500 hover:-translate-y-0.5"
                        style={{
                          backgroundColor: isSelected ? 'var(--theme-background-glass-hover)' : 'var(--theme-background-glass)',
                          color: isSelected ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)',
                          border: isSelected ? '1px solid var(--theme-border-medium)' : '1px solid var(--theme-border-dark)',
                          boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                        }}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Term */}
            <NumberInput
              label="Term (months)"
              value={formData.termMonths}
              onChange={onTermMonthsChange}
              placeholder="12"
              min={1}
              required
              error={errors.termMonths}
            />

            {/* Start Date */}
            <div>
              <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                Start Date <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className={`w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 glass-sm ${
                  errors.startDate ? 'ring-1 ring-red-500/30' : ''
                }`}
                style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }}
              />
              {errors.startDate && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <AlertCircle className="w-3 h-3" style={{ color: '#EF4444', opacity: 0.8 }} />
                  <p className="text-[10px] font-medium" style={{ color: '#EF4444', opacity: 0.8 }}>{errors.startDate}</p>
                </div>
              )}
            </div>

            {/* Real Amount to Pay */}
            {(formData.monthlyPayment > 0 && formData.termMonths > 0) && (
              <NumberInput
                label="Real Amount to Pay *"
                value={realAmountToPay}
                onChange={onRealAmountChange}
                placeholder="0"
                min={formData.originalAmount}
                required
                showPreview
                previewLabel="Total to pay"
                error={realAmountError}
              />
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>Notes (optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 rounded-2xl text-sm resize-none focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm"
                style={{ color: 'var(--theme-text-primary)', fontWeight: 350 }}
                placeholder="Additional details..."
              />
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
          <div className="flex gap-3 p-5">
            <button 
              onClick={onClose} 
              className="flex-1 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 glass-sm"
              style={{ color: 'var(--theme-text-tertiary)' }}
            >
              Cancel
            </button>
            <button 
              onClick={onSubmit} 
              className="flex-1 px-4 py-2.5 rounded-2xl text-white text-sm font-medium transition-all duration-500 hover:-translate-y-1 flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--theme-primary)', boxShadow: 'var(--shadow-button)' }}
            >
              <Save className="w-4 h-4" />
              {editingDebt ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebtFormModal;