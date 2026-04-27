// components/modals/GoalModal.tsx

import React, { useState, useEffect } from 'react';
import { isValidDate } from '../../utils/formatters';
import NumberInput from '../../components/common/NumberInput';
import CustomSelect, { type SelectOption } from '../../components/common/CustomSelect';
import ToastNotification from '../../components/common/ToastNotification';
import { Save, X, AlertCircle } from 'lucide-react';
import { getIconComponent } from '../../utils/iconHelpers';
import { useCategoryStore, useGoalStore } from '../../store';

type Priority = 'low' | 'medium' | 'high';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  editingGoal?: any;
}

const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, onSave, editingGoal }) => {
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
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('error');

  // Validar si el formulario es válido
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

  // Obtener categorías de tipo expense (excluir system)
  const expenseCategories = categories.filter(c => c.type === 'expense' && !c.isSystem);
  
  const categoryOptions: SelectOption[] = expenseCategories.map(cat => {
    const IconComponent = getIconComponent(cat.icon);
    return {
      id: cat.id,
      label: cat.name,
      icon: <IconComponent className="w-4 h-4" style={{ color: cat.color }} />,
      color: cat.color,
    };
  });

  const minDate = new Date().toISOString().split('T')[0];

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
      setNameError('Goal name is required');
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
      setDateError('Target date is required');
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
      setNameError('Goal name is required');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setNameError('Goal name is required');
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
      setDateError('Target date is required');
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
    
    onSave({
      ...formData,
      targetAmount: formData.targetAmount,
    });
    onClose();
  };

  if (!isOpen) return null;

  const priorities: { value: Priority; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: 'green' },
    { value: 'medium', label: 'Medium', color: 'yellow' },
    { value: 'high', label: 'High', color: 'red' },
  ];

  const formatDisplayDate = (dateString: string): string => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-md flex flex-col max-h-[90vh]">
          {/* Header - Sticky */}
          <div className="sticky top-0 z-10">
            <div className="flex justify-between items-center p-5 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl">
              <div>
                <h3 className="text-lg font-light text-white">
                  {editingGoal ? 'Edit Goal' : 'New Goal'}
                </h3>
                <p className="text-xs text-white/40 mt-0.5 font-light">
                  {editingGoal ? 'Update your financial goal' : 'Set a new financial target'}
                </p>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Nombre */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-light">
                  Goal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={handleNameChange}
                  className={`w-full px-4 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors placeholder:text-white/20 ${
                    nameError ? 'border-red-500/50' : 'border-white/10'
                  }`}
                  placeholder="Buy a motorcycle"
                />
                {nameError && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3 text-red-500/80" />
                    <p className="text-[10px] text-red-500/80">{nameError}</p>
                  </div>
                )}
              </div>

              {/* Monto objetivo */}
              <NumberInput
                label="Target Amount"
                value={formData.targetAmount}
                onChange={handleAmountChange}
                placeholder="0"
                min={1}
                required
                showPreview
                previewLabel="Target"
              />

              {/* Categoría de compra - CustomSelect con iconos */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-light">
                  Purchase Category <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  value={formData.purchaseCategoryId}
                  onChange={handleCategoryChange}
                  options={categoryOptions}
                  placeholder="Select a category for the purchase"
                  error={categoryError}
                />
                <p className="text-[9px] text-white/30 font-light mt-1">
                  This category will be used when you complete the purchase
                </p>
              </div>

              {/* Fecha objetivo */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-light">
                  Target Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={handleDateChange}
                  min={minDate}
                  className={`w-full px-4 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors ${
                    dateError ? 'border-red-500/50' : 'border-white/10'
                  }`}
                />
                {dateError && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3 text-red-500/80" />
                    <p className="text-[10px] text-red-500/80">{dateError}</p>
                  </div>
                )}
                {!dateError && formData.targetDate && (
                  <p className="text-[10px] text-green-500/60 font-light mt-1 flex items-center gap-1">
                    Target date set to {formatDisplayDate(formData.targetDate)}
                  </p>
                )}
              </div>

              {/* Prioridad */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-light">Priority</label>
                <div className="flex gap-3">
                  {priorities.map(({ value, label, color }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handlePriorityChange(value)}
                      className={`flex-1 py-2 rounded-lg text-sm font-light transition-all duration-200 ${
                        formData.priority === value
                          ? color === 'red' 
                            ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                            : color === 'yellow' 
                            ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                            : 'bg-green-500/20 text-green-500 border border-green-500/30'
                          : 'bg-white/[0.03] text-white/40 hover:text-white border border-white/10 hover:border-white/20'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contexto (opcional) */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-light">Context (optional)</label>
                <input
                  type="text"
                  value={formData.context}
                  onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors placeholder:text-white/20"
                  placeholder="e.g., Transportation, Education, etc."
                />
              </div>
            </form>
          </div>

          {/* Footer - Sticky */}
          <div className="sticky bottom-0">
            <div className="flex gap-3 p-5 border-t border-white/10 bg-white/[0.03] backdrop-blur-xl">
              <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 px-4 py-2.5 bg-white/[0.03] hover:bg-white/10 rounded-lg text-white/60 text-sm font-light transition-all duration-300"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                onClick={handleSubmit}
                disabled={!isFormValid()}
                className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-light transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 ${
                  !isFormValid()
                    ? 'bg-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#6366F1] to-[#EC4899]'
                }`}
              >
                <Save className="w-4 h-4" />
                {editingGoal ? 'Update Goal' : 'Create Goal'}
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