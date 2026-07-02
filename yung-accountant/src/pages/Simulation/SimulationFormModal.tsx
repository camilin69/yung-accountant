// pages/Simulation/SimulationFormModal.tsx
import React from 'react';
import { X, Save, AlertCircle, ArrowLeft } from 'lucide-react';
import NumberInput from '../../components/common/NumberInput';
import CustomSelect from '../../components/common/CustomSelect';
import { useTranslation } from '../../i18n';
import { formatCurrency } from '../../utils/formatters';
import { periodOptions } from './constants';

interface SimulationFormModalProps {
  isOpen: boolean;
  editingTransaction: any;
  formData: any;
  setFormData: (data: any) => void;
  errors: any;
  isStartDateSelected: boolean;
  weeksDisplayValue: string;
  monthsDisplayValue: string;
  modalTotalPreview: () => number;
  categoryOptions: any[];
  onClose: () => void;
  onSubmit: () => void;
  onAmountChange: (value: number) => void;
  onPeriodChange: (period: 'day' | 'week' | 'month') => void;
  onCategoryChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onDaysChange: (value: number) => void;
  onWeeksChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMonthsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SimulationFormModal: React.FC<SimulationFormModalProps> = ({
  isOpen, editingTransaction, formData, setFormData, errors,
  isStartDateSelected, weeksDisplayValue, monthsDisplayValue,
  modalTotalPreview, categoryOptions, onClose, onSubmit,
  onAmountChange, onPeriodChange, onCategoryChange,
  onStartDateChange, onEndDateChange, onDaysChange,
  onWeeksChange, onMonthsChange,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md flex flex-col max-h-[90vh] rounded-[2rem] overflow-hidden glass-aero animate-scale-in">
        {/* Header */}
        <div className="flex justify-between items-center p-5" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="lg:hidden p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
            </button>
            <div>
              <h3 className="text-lg font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>
                {editingTransaction ? t('simulation.editSimulation') : t('simulation.newSimulation')}
              </h3>
              <p className="text-xs tracking-[0.03em] mt-0.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                {editingTransaction ? t('simulation.updateModal') : t('simulation.createModal')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="hidden lg:block p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
            <X className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto modal-scroll">
          <div className="p-5 space-y-5">
            {/* Amount & Period */}
            <div>
              <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                {t('common.amount')} <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <NumberInput value={formData.amount} onChange={onAmountChange} placeholder="0" min={1} required error={errors.amount} />
                </div>
                <div className="w-36">
                  <CustomSelect value={formData.period} onChange={(value) => onPeriodChange(value as 'day' | 'week' | 'month')} options={periodOptions} placeholder={t('simulation.period')} />
                </div>
              </div>
              {formData.amount > 0 && formData.startDate && formData.endDate && (
                <div className="mt-2 p-3 rounded-[1rem] glass-sm">
                  <p className="text-[10px] font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>
                    {t('simulation.totalForPeriodLabel')} <span style={{ color: 'var(--theme-primary)' }}>{formatCurrency(modalTotalPreview())}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Category */}
            <CustomSelect
              label={t('transactions.category')}
              value={formData.categoryId} 
              onChange={onCategoryChange} 
              options={categoryOptions} 
              placeholder={t('simulation.selectCategory')}
              required 
              error={errors.categoryId} 
            />

            {/* Description */}
            <div>
              <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>{t('transactions.description')} ({t('common.optional')})</label>
              <input 
                maxLength={100}
                type="text" 
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                className="w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm"
                style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }} 
                placeholder={t('simulation.descriptionPlaceholder')}
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                {t('simulation.startDate')} <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input 
                type="date" 
                value={formData.startDate} 
                onChange={(e) => onStartDateChange(e.target.value)} 
                className={`w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 glass-sm ${errors.startDate ? 'ring-1 ring-red-500/30' : ''}`}
                style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }} 
              />
              {errors.startDate && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <AlertCircle className="w-3 h-3" style={{ color: '#EF4444', opacity: 0.8 }} />
                  <p className="text-[10px] font-medium" style={{ color: '#EF4444', opacity: 0.8 }}>{errors.startDate}</p>
                </div>
              )}
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                {t('simulation.endDate')} <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input 
                type="date" 
                value={formData.endDate} 
                onChange={(e) => onEndDateChange(e.target.value)} 
                disabled={!isStartDateSelected} 
                className={`w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 glass-sm disabled:opacity-30 disabled:cursor-not-allowed ${errors.endDate ? 'ring-1 ring-red-500/30' : ''}`}
                style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }} 
                min={formData.startDate || undefined} 
              />
              {errors.endDate && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <AlertCircle className="w-3 h-3" style={{ color: '#EF4444', opacity: 0.8 }} />
                  <p className="text-[10px] font-medium" style={{ color: '#EF4444', opacity: 0.8 }}>{errors.endDate}</p>
                </div>
              )}
              {!isStartDateSelected && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <AlertCircle className="w-3 h-3" style={{ color: 'var(--semantic-warning)', opacity: 0.8 }} />
                  <p className="text-[10px] font-medium" style={{ color: 'var(--semantic-warning)', opacity: 0.75 }}>{t('simulation.selectStartFirst')}</p>
                </div>
              )}
            </div>

            {/* Duration */}
            <div className="pt-2" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
              <p className="text-xs font-medium tracking-[0.04em] uppercase mb-3" style={{ color: 'var(--theme-text-tertiary)' }}>{t('simulation.durationEditable')}</p>
              <div className="grid grid-cols-3 gap-3">
                <NumberInput label={t('simulation.days')} value={formData.days} onChange={onDaysChange} placeholder="0" min={1} disabled={!isStartDateSelected} />
                <div>
                  <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>{t('simulation.weeks')}</label>
                  <input 
                    maxLength={20}
                    type="text" value={weeksDisplayValue} onChange={onWeeksChange} disabled={!isStartDateSelected} placeholder="0" 
                    className="w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>{t('simulation.months')}</label>
                  <input 
                    type="text" value={monthsDisplayValue} onChange={onMonthsChange} disabled={!isStartDateSelected} placeholder="0" 
                    className="w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }} 
                  />
                </div>
              </div>
              {!isStartDateSelected && (
                <div className="flex items-center gap-1.5 mt-2">
                  <AlertCircle className="w-3 h-3" style={{ color: 'var(--semantic-warning)', opacity: 0.8 }} />
                  <p className="text-[10px] font-medium" style={{ color: 'var(--semantic-warning)', opacity: 0.75 }}>{t('simulation.selectStartEnableDuration')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
          <div className="flex gap-3 p-5">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 glass-sm"
              style={{ color: 'var(--theme-text-tertiary)' }}>{t('common.cancel')}</button>
            <button onClick={onSubmit} className="flex-1 px-4 py-2.5 rounded-2xl text-white text-sm font-medium transition-all duration-500 hover:-translate-y-1 flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--theme-primary)', boxShadow: 'var(--shadow-button)' }}>
              <Save className="w-4 h-4" /> {editingTransaction ? t('simulation.update') : t('common.create')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};