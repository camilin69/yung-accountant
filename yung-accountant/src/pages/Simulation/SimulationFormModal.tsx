// pages/Simulation/SimulationFormModal.tsx
import React from 'react';
import { X, Save, AlertCircle, ArrowLeft } from 'lucide-react';
import NumberInput from '../../components/common/NumberInput';
import CustomSelect from '../../components/common/CustomSelect';
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
  isOpen,
  editingTransaction,
  formData,
  setFormData,
  errors,
  isStartDateSelected,
  weeksDisplayValue,
  monthsDisplayValue,
  modalTotalPreview,
  categoryOptions,
  onClose,
  onSubmit,
  onAmountChange,
  onPeriodChange,
  onCategoryChange,
  onStartDateChange,
  onEndDateChange,
  onDaysChange,
  onWeeksChange,
  onMonthsChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--theme-background-glass)] backdrop-blur-xl border border-[var(--theme-border-light)] rounded-xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="sticky top-0 z-10">
          <div className="flex justify-between items-center p-5 border-b border-[var(--theme-border-light)] bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-t-xl">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="lg:hidden p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors">
                <ArrowLeft className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
              </button>
              <div>
                <h3 className="text-lg font-light text-[var(--theme-text-primary)]">
                  {editingTransaction ? 'Edit Simulation' : 'New Simulation'}
                </h3>
                <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 font-light">
                  {editingTransaction ? 'Update your simulation' : 'Create a recurring transaction simulation'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="hidden lg:block p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors">
              <X className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto modal-scroll">
          <div className="p-5 space-y-5">
            <div>
              <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <NumberInput value={formData.amount} onChange={onAmountChange} placeholder="0" min={1} required error={errors.amount} />
                </div>
                <div className="w-36">
                  <CustomSelect value={formData.period} onChange={(value) => onPeriodChange(value as 'day' | 'week' | 'month')} options={periodOptions} placeholder="Select period" />
                </div>
              </div>
              {formData.amount > 0 && formData.startDate && formData.endDate && (
                <div className="mt-2 p-2 bg-[var(--theme-background-glass)] rounded-lg border border-[var(--theme-border-dark)]">
                  <p className="text-[9px] text-[var(--theme-text-tertiary)] font-light">
                    Total for period: <span className="text-[var(--theme-primary)]">{formatCurrency(modalTotalPreview())}</span>
                  </p>
                </div>
              )}
            </div>

            <CustomSelect 
              label="Category" 
              value={formData.categoryId} 
              onChange={onCategoryChange} 
              options={categoryOptions} 
              placeholder="Select a category" 
              required 
              error={errors.categoryId} 
            />

            <div>
              <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Description (optional)</label>
              <input 
                type="text" 
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                className="w-full px-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50 transition-colors placeholder:text-[var(--theme-text-tertiary)]/20" 
                placeholder="e.g., Daily coffee, Rent, etc." 
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input 
                type="date" 
                value={formData.startDate} 
                onChange={(e) => onStartDateChange(e.target.value)} 
                className={`w-full px-4 py-2.5 bg-[var(--theme-background-glass)] border rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50 transition-colors ${errors.startDate ? 'border-red-500/50' : 'border-[var(--theme-border-light)]'}`} 
              />
              {errors.startDate && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3 text-red-500/80" />
                  <p className="text-[10px] text-red-500/80">{errors.startDate}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">
                End Date <span className="text-red-500">*</span>
              </label>
              <input 
                type="date" 
                value={formData.endDate} 
                onChange={(e) => onEndDateChange(e.target.value)} 
                disabled={!isStartDateSelected} 
                className={`w-full px-4 py-2.5 bg-[var(--theme-background-glass)] border rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${errors.endDate ? 'border-red-500/50' : 'border-[var(--theme-border-light)]'}`} 
                min={formData.startDate || undefined} 
              />
              {errors.endDate && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3 text-red-500/80" />
                  <p className="text-[10px] text-red-500/80">{errors.endDate}</p>
                </div>
              )}
              {!isStartDateSelected && (
                <p className="text-[10px] text-amber-500/80 font-light mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Select start date first
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-[var(--theme-border-light)]">
              <p className="text-xs text-[var(--theme-text-tertiary)] mb-3 font-light">Duration (editable)</p>
              <div className="grid grid-cols-3 gap-3">
                <NumberInput 
                  label="Days" 
                  value={formData.days} 
                  onChange={onDaysChange} 
                  placeholder="0" 
                  min={1} 
                  disabled={!isStartDateSelected} 
                />
                <div>
                  <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Weeks</label>
                  <input 
                    type="text" 
                    value={weeksDisplayValue} 
                    onChange={onWeeksChange} 
                    disabled={!isStartDateSelected} 
                    placeholder="0" 
                    className="w-full px-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-[var(--theme-text-tertiary)]/20" 
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Months</label>
                  <input 
                    type="text" 
                    value={monthsDisplayValue} 
                    onChange={onMonthsChange} 
                    disabled={!isStartDateSelected} 
                    placeholder="0" 
                    className="w-full px-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-[var(--theme-text-tertiary)]/20" 
                  />
                </div>
              </div>
              {!isStartDateSelected && (
                <p className="text-[10px] text-amber-500/80 font-light mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Select a start date first to enable duration fields
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0">
          <div className="flex gap-3 p-5 border-t border-[var(--theme-border-light)] bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-b-xl">
            <button 
              onClick={onClose} 
              className="flex-1 px-4 py-2.5 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-tertiary)] text-sm font-light transition-all duration-300"
            >
              Cancel
            </button>
            <button 
              onClick={onSubmit} 
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-dark)] rounded-lg text-white text-sm font-light transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editingTransaction ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};