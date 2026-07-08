// components/modals/GoalModal.tsx
import React, { useState, useEffect } from 'react';
import { isValidDate, getLocalDateString } from '../../utils/formatters';
import NumberInput from '../../components/common/NumberInput';
import CustomSelect, { type SelectOption } from '../../components/common/CustomSelect';
import ToastNotification from '../../components/common/ToastNotification';
import { Save, X, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { getIconComponent } from '../../utils/iconHelpers';
import { useCategoryStore, useGoalStore } from '../../store';
import { useTranslation } from '../../i18n';

type Priority = 'low' | 'medium' | 'high';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  editingGoal?: any;
}

const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, onSave, editingGoal }) => {
  const { t } = useTranslation();
  const { goals } = useGoalStore();
  const { categories } = useCategoryStore();
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: 0,
    targetDate: '',
    priority: 'medium' as Priority,
    context: '',
    purchaseCategoryId: '',
  });
  const [nameError, setNameError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('error');

  const isFormValid = () => {
    return (
      formData.name.trim() !== '' &&
      !nameError &&
      formData.targetAmount > 0 &&
      formData.targetDate !== '' &&
      !dateError &&
      formData.purchaseCategoryId !== '' &&
      !categoryError
    );
  };

  const expenseCategories = categories.filter(c => c.type === 'expense');

  const categoryOptions: SelectOption[] = expenseCategories
    .filter(cat => !cat.isSystem)
    .map(cat => {
      const IconComponent = getIconComponent(cat.icon);
      return {
        id: cat.id,
        label: cat.name,
        icon: <IconComponent className="w-4 h-4" style={{ color: cat.color }} />,
        color: cat.color,
      };
    });

  const minDate = getLocalDateString();

  useEffect(() => {
    if (editingGoal) {
      setFormData({
        name: editingGoal.name,
        targetAmount: editingGoal.targetAmount,
        targetDate: editingGoal.targetDate || '',
        priority: editingGoal.priority as Priority,
        context: editingGoal.context || '',
        purchaseCategoryId: editingGoal.purchaseCategoryId || '',
      });
    } else {
      setFormData({
        name: '',
        targetAmount: 0,
        targetDate: '',
        priority: 'medium',
        context: '',
        purchaseCategoryId: '',
      });
    }
    setNameError(null);
    setDateError(null);
    setCategoryError(null);
  }, [editingGoal, isOpen]);

  const validateName = (name: string): boolean => {
    if (!name.trim()) {
      setNameError(t('goals.name') + ' ' + t('common.required'));
      return false;
    }
    const existingGoal = goals.find(g =>
      g.name.toLowerCase() === name.toLowerCase() &&
      (!editingGoal || g.id !== editingGoal.id)
    );
    if (existingGoal) {
      setNameError('A goal with this name already exists');
      return false;
    }
    setNameError(null);
    return true;
  };

  const validateDate = (date: string): boolean => {
    if (!date) {
      setDateError(t('goals.targetDate') + ' ' + t('common.required'));
      return false;
    }
    if (!isValidDate(date)) {
      setDateError('Target date cannot be in the past');
      return false;
    }
    setDateError(null);
    return true;
  };

  const validateCategory = (categoryId: string): boolean => {
    if (!categoryId) {
      setCategoryError('Please select a category for the purchase');
      return false;
    }
    setCategoryError(null);
    return true;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, name: value });
    if (value.trim()) {
      validateName(value);
    } else {
      setNameError(t('goals.name') + ' ' + t('common.required'));
    }
  };

  const handleAmountChange = (value: number) => {
    setFormData({ ...formData, targetAmount: value });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, targetDate: value });
    validateDate(value);
  };

  const handleCategoryChange = (value: string) => {
    setFormData({ ...formData, purchaseCategoryId: value });
    validateCategory(value);
  };

  const handlePriorityChange = (priority: Priority) => {
    setFormData({ ...formData, priority });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setNameError(t('goals.name') + ' ' + t('common.required'));
      setToastMessage('Please enter a goal name');
      setToastType('error');
      setShowToast(true);
      return;
    }

    if (!validateName(formData.name)) {
      setToastMessage('A goal with this name already exists');
      setToastType('error');
      setShowToast(true);
      return;
    }

    if (formData.targetAmount <= 0) {
      setToastMessage('Please enter a valid target amount');
      setToastType('error');
      setShowToast(true);
      return;
    }

    if (!formData.targetDate) {
      setDateError(t('goals.targetDate') + ' ' + t('common.required'));
      setToastMessage('Please select a target date');
      setToastType('error');
      setShowToast(true);
      return;
    }

    if (!validateDate(formData.targetDate)) {
      setToastMessage('Target date cannot be in the past');
      setToastType('error');
      setShowToast(true);
      return;
    }

    if (!formData.purchaseCategoryId) {
      setCategoryError('Please select a category for the purchase');
      setToastMessage('Please select a category for the purchase');
      setToastType('error');
      setShowToast(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        ...formData,
        targetAmount: formData.targetAmount,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const priorities: { value: Priority; label: string; color: 'green' | 'yellow' | 'red' }[] = [
    { value: 'low', label: t('goals.low'), color: 'green' },
    { value: 'medium', label: t('goals.medium'), color: 'yellow' },
    { value: 'high', label: t('goals.high'), color: 'red' },
  ];

  const formatDisplayDate = (dateString: string): string => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const priorityStyles = {
    red: { bg: 'rgba(239,68,68,0.12)', text: 'var(--semantic-expense)', border: 'rgba(239,68,68,0.25)' },
    yellow: { bg: 'rgba(245,158,11,0.12)', text: 'var(--semantic-warning)', border: 'rgba(245,158,11,0.25)' },
    green: { bg: 'rgba(16,185,129,0.12)', text: 'var(--semantic-income)', border: 'rgba(16,185,129,0.25)' },
  };

  return (
    <>
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
                  {editingGoal ? t('goals.editGoal') : t('goals.newGoal')}
                </h3>
                <p className="text-xs tracking-[0.03em] mt-0.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                  {editingGoal ? t('goals.updateModal') : t('goals.createModal')}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="hidden lg:block p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
              <X className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto modal-scroll">
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Goal Name */}
              <div>
                <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                  {t('goals.name')} <span style={{ color: 'var(--semantic-expense)' }}>*</span>
                </label>
                <input
                  maxLength={100}
                  type="text"
                  value={formData.name}
                  onChange={handleNameChange}
                  className={`w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm ${
                    nameError ? 'ring-1 ring-red-500/30' : ''
                  }`}
                  style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }}
                  placeholder={t('goals.namePlaceholder')}
                />
                {nameError && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <AlertCircle className="w-3 h-3" style={{ color: 'var(--semantic-expense)', opacity: 0.8 }} />
                    <p className="text-[10px] font-medium" style={{ color: 'var(--semantic-expense)', opacity: 0.8 }}>{nameError}</p>
                  </div>
                )}
              </div>

              {/* Target Amount */}
              <NumberInput
                label={t('goals.targetAmount')}
                value={formData.targetAmount}
                onChange={handleAmountChange}
                placeholder="0"
                min={1}
                required
                showPreview
                previewLabel={t('goals.goal')}
              />

              {/* Purchase Category */}
              <div>
                <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                  {t('goals.purchaseCategory')} <span style={{ color: 'var(--semantic-expense)' }}>*</span>
                </label>
                <CustomSelect
                  value={formData.purchaseCategoryId}
                  onChange={handleCategoryChange}
                  options={categoryOptions}
                  placeholder={t('goals.purchaseCategoryPlaceholder')}
                  error={categoryError}
                />
                <p className="text-[9px] mt-1 font-medium" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>
                  This category will be used when you complete the purchase
                </p>
              </div>

              {/* Target Date */}
              <div>
                <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                  {t('goals.targetDate')} <span style={{ color: 'var(--semantic-expense)' }}>*</span>
                </label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={handleDateChange}
                  min={minDate}
                  className={`w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 glass-sm ${
                    dateError ? 'ring-1 ring-red-500/30' : ''
                  }`}
                  style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }}
                />
                {dateError && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <AlertCircle className="w-3 h-3" style={{ color: 'var(--semantic-expense)', opacity: 0.8 }} />
                    <p className="text-[10px] font-medium" style={{ color: 'var(--semantic-expense)', opacity: 0.8 }}>{dateError}</p>
                  </div>
                )}
                {!dateError && formData.targetDate && (
                  <p className="text-[10px] font-medium mt-1.5 flex items-center gap-1.5" style={{ color: 'var(--semantic-income)', opacity: 0.8 }}>
                    Target date set to {formatDisplayDate(formData.targetDate)}
                  </p>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>{t('goals.priority')}</label>
                <div className="flex gap-3">
                  {priorities.map(({ value, label, color }) => {
                    const style = priorityStyles[color];
                    const isSelected = formData.priority === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handlePriorityChange(value)}
                        className="flex-1 py-3 rounded-2xl text-sm font-medium transition-all duration-500 hover:-translate-y-0.5"
                        style={{
                          backgroundColor: isSelected ? style.bg : 'var(--theme-background-glass-hover)',
                          color: isSelected ? style.text : 'var(--theme-text-tertiary)',
                          border: isSelected ? `1px solid ${style.border}` : '1px solid var(--theme-border-dark)',
                          boxShadow: isSelected ? `0 4px 12px -4px ${style.bg}` : 'none',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Context */}
              <div>
                <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                  {t('goals.context')} ({t('common.optional')})
                </label>
                <input
                  maxLength={50}
                  type="text"
                  value={formData.context}
                  onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm"
                  style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }}
                  placeholder={t('goals.contextPlaceholder')}
                />
              </div>
            </form>
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
            <div className="flex gap-3 p-5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 glass-sm"
                style={{ color: 'var(--theme-text-tertiary)' }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={!isFormValid() || isSubmitting}
                className="flex-1 px-4 py-2.5 rounded-2xl text-white text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-20 disabled:cursor-not-allowed hover:-translate-y-1"
                style={{
                  backgroundColor: isFormValid() ? 'var(--theme-primary)' : 'var(--theme-background-glass-hover)',
                  boxShadow: isFormValid() ? 'var(--shadow-button)' : 'none'
                }}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><Save className="w-4 h-4" /> {editingGoal ? t('common.save') : t('common.create')}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ToastNotification
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </>
  );
};

export default GoalModal;