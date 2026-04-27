// pages/Wallets/WalletFormModal.tsx

import React from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import CustomSelect from '../../components/common/CustomSelect';
import { walletTypes } from './constants';

interface WalletFormModalProps {
  isOpen: boolean;
  editingWallet: any;
  formData: {
    name: string;
    type: string;
    bankName: string;
    lastFourDigits: string;
    color: string;
  };
  setFormData: (data: any) => void;
  errors: { name: string };
  onClose: () => void;
  onSubmit: () => void;
  onTypeChange: (type: string) => void;
}

export const WalletFormModal: React.FC<WalletFormModalProps> = ({
  isOpen,
  editingWallet,
  formData,
  setFormData,
  errors,
  onClose,
  onSubmit,
  onTypeChange,
}) => {
  if (!isOpen) return null;

  const walletTypeOptions = walletTypes.map(wt => ({
    id: wt.id,
    label: wt.label,
    icon: wt.getIcon(wt.color),
    color: wt.color,
  }));

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-md flex flex-col max-h-[85vh]">
        {/* Header */}
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
              onClick={onClose} 
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">
            <div>
              <label className="block text-xs text-white/40 mb-1.5 font-light">
                Wallet Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                onChange={onTypeChange}
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
        
        {/* Footer */}
        <div className="sticky bottom-0 bg-white/[0.03] backdrop-blur-xl rounded-b-xl">
          <div className="flex gap-3 p-5 border-t border-white/10">
            <button 
              onClick={onClose} 
              className="flex-1 px-4 py-2.5 bg-white/[0.03] hover:bg-white/10 rounded-lg text-white/60 text-sm font-light transition-all duration-300"
            >
              Cancel
            </button>
            <button 
              onClick={onSubmit} 
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
  );
};