// pages/Wallets/WalletFormModal.tsx
import React from 'react';
import { X, Save, AlertCircle, ArrowLeft } from 'lucide-react';
import CustomSelect from '../../components/common/CustomSelect';
import { walletTypes } from './constants';
import { useTranslation } from '../../i18n';

interface WalletFormModalProps {
  isOpen: boolean;
  editingWallet: any;
  formData: { name: string; type: string; bankName: string; lastFourDigits: string; color: string; };
  setFormData: (data: any) => void;
  errors: { name: string };
  onClose: () => void;
  onSubmit: () => void;
  onTypeChange: (type: string) => void;
}

export const WalletFormModal: React.FC<WalletFormModalProps> = ({
  isOpen, editingWallet, formData, setFormData, errors, onClose, onSubmit, onTypeChange,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const walletTypeOptions = walletTypes.map(wt => ({
    id: wt.id,
    label: wt.label,
    icon: wt.getIcon(wt.color),
    color: wt.color,
  }));

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md flex flex-col max-h-[85vh] rounded-[2rem] overflow-hidden glass-aero animate-scale-in">
        <div className="flex justify-between items-center p-5" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="lg:hidden p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
            </button>
            <h3 className="text-lg font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>
              {editingWallet ? t('wallets.editWallet') : t('wallets.addWallet')}
            </h3>
          </div>
          <button onClick={onClose} className="hidden lg:block p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
            <X className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto modal-scroll p-5 space-y-5">
          <div>
            <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
              {t('wallets.name')} <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              maxLength={20}
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm ${
                errors.name ? 'ring-1 ring-red-500/30' : ''
              }`}
              style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }}
              placeholder={t('wallets.namePlaceholder')}
              autoFocus
            />
            {errors.name && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <AlertCircle className="w-3 h-3" style={{ color: '#EF4444', opacity: 0.8 }} />
                <p className="text-[10px] font-medium" style={{ color: '#EF4444', opacity: 0.8 }}>{errors.name}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
              {t('wallets.type')} <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <CustomSelect
              value={formData.type}
              onChange={onTypeChange}
              options={walletTypeOptions}
              placeholder={t('wallets.type')}
            />
          </div>

          {(formData.type === 'bank_account' || formData.type === 'credit_card' || formData.type === 'debit_card') && (
            <>
              <div>
                <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                  {t('wallets.bankName')} ({t('common.optional')})
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm"
                  style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }}
                  placeholder={t('wallets.namePlaceholderBank')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                  {t('wallets.lastFourDigits')} ({t('common.optional')})
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={formData.lastFourDigits}
                  onChange={(e) => setFormData({ ...formData, lastFourDigits: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm"
                  style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }}
                  placeholder={t('wallets.lastFourPlaceholder')}
                />
              </div>
            </>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
          <div className="flex gap-3 p-5">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 glass-sm"
              style={{ color: 'var(--theme-text-tertiary)' }}>{t('common.cancel')}</button>
            <button onClick={onSubmit} disabled={!formData.name.trim()}
              className="flex-1 px-4 py-2.5 rounded-2xl text-white text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-20 disabled:cursor-not-allowed hover:-translate-y-1"
              style={{
                backgroundColor: formData.name.trim() ? 'var(--theme-primary)' : 'var(--theme-background-glass-hover)',
                boxShadow: formData.name.trim() ? 'var(--shadow-button)' : 'none'
              }}>
              <Save className="w-4 h-4" /> {editingWallet ? t('common.save') : t('common.create')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};