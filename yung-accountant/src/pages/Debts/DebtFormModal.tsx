// pages/Debts/DebtFormModal.tsx

import React from 'react';
import { X, Save, TrendingUp, TrendingDown, AlertCircle, PlusCircle } from 'lucide-react';
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
  isOpen,
  editingDebt,
  formData,
  setFormData,
  setInterestRateInput,
  errors,
  realAmountToPay,
  realAmountError,
  balanceError,
  paymentValidationError,
  editAmountError,
  interestRateInput,
  selectedVariableMonth,
  monthOptions,
  walletOptions,
  selectedWallet,
  realAvailableBalance,
  totalPaymentsMade,
  noWalletsMessage,
  onClose,
  onSubmit,
  onInterestTypeChange,
  onMonthlyPaymentChange,
  onTermMonthsChange,
  onRealAmountChange,
  onWalletChange,
  onCreateWallet,
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-md flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/[0.03] backdrop-blur-xl rounded-t-xl">
          <div className="flex justify-between items-center p-5 border-b border-white/10">
            <div>
              <h3 className="text-lg font-light text-white">{editingDebt ? 'Edit Debt' : 'New Debt'}</h3>
              <p className="text-xs text-white/40 mt-0.5 font-light">
                {editingDebt ? 'Update your debt details' : 'Record a new debt or loan'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Debt Type */}
            <div>
              <label className="block text-xs text-white/40 mb-1.5 font-light">Debt Type *</label>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    if (!editingDebt) setFormData({ ...formData, type: 'borrowed' });
                  }} 
                  disabled={!!editingDebt && editingDebt.type !== 'borrowed'}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-light transition-all duration-200 flex items-center justify-center gap-2 ${
                    formData.type === 'borrowed' 
                      ? 'bg-red-500/20 text-red-500 border border-red-500/30' 
                      : editingDebt && editingDebt.type !== 'borrowed'
                        ? 'bg-white/[0.02] text-white/20 cursor-not-allowed border border-white/5'
                        : 'bg-white/[0.03] text-white/40 hover:text-white border border-white/10 hover:border-white/20'
                  }`}
                >
                  <TrendingDown className="w-4 h-4" /> I Owe
                </button>
                <button 
                  onClick={() => {
                    if (!editingDebt) setFormData({ ...formData, type: 'lent' });
                  }} 
                  disabled={!!editingDebt && editingDebt.type !== 'lent'}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-light transition-all duration-200 flex items-center justify-center gap-2 ${
                    formData.type === 'lent' 
                      ? 'bg-green-500/20 text-green-500 border border-green-500/30' 
                      : editingDebt && editingDebt.type !== 'lent'
                        ? 'bg-white/[0.02] text-white/20 cursor-not-allowed border border-white/5'
                        : 'bg-white/[0.03] text-white/40 hover:text-white border border-white/10 hover:border-white/20'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" /> Owed to Me
                </button>
              </div>
              {editingDebt && (
                <p className="text-[9px] text-amber-500/60 font-light mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Debt type cannot be changed while editing
                </p>
              )}
            </div>

            {/* Creditor/Borrower Name */}
            <div>
              <label className="block text-xs text-white/40 mb-1.5 font-light">
                {formData.type === 'borrowed' ? 'Lender Name' : 'Borrower Name'} *
              </label>
              <input
                type="text"
                value={formData.creditorName}
                onChange={(e) => setFormData({ ...formData, creditorName: e.target.value })}
                className={`w-full px-4 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors placeholder:text-white/20 ${
                  errors.creditorName ? 'border-red-500/50' : 'border-white/10'
                }`}
                placeholder={formData.type === 'borrowed' ? 'Bank, Friend, Family...' : 'Person who owes you...'}
              />
              {errors.creditorName && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3 text-red-500/80" />
                  <p className="text-[10px] text-red-500/80">{errors.creditorName}</p>
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
                <div className="mt-2 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <p className="text-xs text-amber-500/80 flex items-center gap-2 flex-wrap">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>You don't have any wallets yet.</span>
                    <button
                      onClick={onCreateWallet}
                      className="inline-flex items-center gap-1 text-amber-500 hover:text-amber-400 transition-colors font-medium underline-offset-2 hover:underline"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Create wallet
                    </button>
                  </p>
                </div>
              )}
              {formData.walletId && selectedWallet && !noWalletsMessage && (
                <p className={`text-[10px] mt-1 font-light ${formData.type === 'lent' && formData.originalAmount > realAvailableBalance ? 'text-red-500/80' : 'text-white/40'}`}>
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
              <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <div className="flex-1">
                  <p className="text-xs text-red-500/80">{editAmountError}</p>
                  {editingDebt && totalPaymentsMade > 0 && (
                    <p className="text-[9px] text-red-500/60 mt-1">
                      You have made {formatCurrency(totalPaymentsMade)} in payments already.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Balance Error */}
            {balanceError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <p className="text-xs text-red-500/80">{balanceError}</p>
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
              <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <p className="text-xs text-red-500/80">{paymentValidationError}</p>
              </div>
            )}

            {/* Interest Rate & Type */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-light">Interest Rate (%)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={interestRateInput}
                    onChange={(e) => {
                        let value = e.target.value;
                        if (value === '') {
                        setInterestRateInput('');
                        setFormData({ ...formData, interestRate: 0 });
                        return;
                        }
                        let normalizedValue = value.replace(',', '.');
                        const regex = /^\d*\.?\d{0,3}$/;
                        if (!regex.test(normalizedValue)) return;
                        const parts = normalizedValue.split('.');
                        const integerPart = parts[0];
                        if (integerPart.length > 2) return;
                        const numValue = parseFloat(normalizedValue);
                        if (isNaN(numValue)) return;
                        if (numValue > 99.999) return;
                        const displayValue = normalizedValue.replace('.', ',');
                        setInterestRateInput(displayValue);
                        if (formData.interestType === 'fixed') {
                        setFormData({ ...formData, interestRate: numValue });
                        }
                    }}
                    min="0"
                    max="99.999"
                    className="flex-1 px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50"
                    placeholder="0"
                  />
                  {formData.interestType === 'variable' && (
                    <div className="w-32">
                      <CustomSelect
                        value={String(selectedVariableMonth)}
                        onChange={() => {}}
                        options={monthOptions}
                        placeholder="Select month"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-light">Interest Type</label>
                <div className="flex gap-2">
                  <button onClick={() => onInterestTypeChange('fixed')} className={`flex-1 py-2.5 rounded-lg text-xs font-light ${
                    formData.interestType === 'fixed' ? 'bg-[#6366F1]/20 text-[#6366F1] border border-[#6366F1]/30' : 'bg-white/[0.03] text-white/40 hover:text-white border border-white/10'
                  }`}>Fixed</button>
                  <button onClick={() => onInterestTypeChange('variable')} className={`flex-1 py-2.5 rounded-lg text-xs font-light ${
                    formData.interestType === 'variable' ? 'bg-[#6366F1]/20 text-[#6366F1] border border-[#6366F1]/30' : 'bg-white/[0.03] text-white/40 hover:text-white border border-white/10'
                  }`}>Variable</button>
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
              <label className="block text-xs text-white/40 mb-1.5 font-light">Start Date *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className={`w-full px-4 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 ${
                  errors.startDate ? 'border-red-500/50' : 'border-white/10'
                }`}
              />
              {errors.startDate && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3 text-red-500/80" />
                  <p className="text-[10px] text-red-500/80">{errors.startDate}</p>
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
              <label className="block text-xs text-white/40 mb-1.5 font-light">Notes (optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light resize-none"
                placeholder="Additional details..."
              />
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="sticky bottom-0 bg-white/[0.03] backdrop-blur-xl rounded-b-xl">
          <div className="flex gap-3 p-5 border-t border-white/10">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-white/[0.03] hover:bg-white/10 rounded-lg text-white/60 text-sm font-light">Cancel</button>
            <button onClick={onSubmit} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-lg text-white text-sm font-light hover:scale-[1.02] flex items-center justify-center gap-2">
              <Save className="w-4 h-4" />
              {editingDebt ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};