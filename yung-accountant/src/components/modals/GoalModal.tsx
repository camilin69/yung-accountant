// components/modals/GoalModal.tsx

import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { isValidDate } from '../../utils/formatters';
import NumberInput from '../common/NumberInput';
import CustomSelect, { type SelectOption } from '../common/CustomSelect';
import ToastNotification from '../common/ToastNotification';
import { Save, X } from 'lucide-react';
;

type Priority = 'low' | 'medium' | 'high';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  editingGoal?: any;
}

const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, onSave, editingGoal }) => {
  const { goals, categories } = useStore();
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

  // Obtener categorías de tipo expense
  const expenseCategories = categories.filter(c => c.type === 'expense');
  
  const categoryOptions: SelectOption[] = expenseCategories.map(cat => ({
    id: cat.id,
    label: cat.name,
    icon: cat.icon,
    color: cat.color,
  }));

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
    if (!date) return true;
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

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, targetDate: value });
    if (value) {
      validateDate(value);
    }
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
    
    if (!formData.purchaseCategoryId) {
      setToastMessage('Please select a category for the purchase');
      setToastType('error');
      setShowToast(true);
      return;
    }
    
    if (formData.targetDate && !validateDate(formData.targetDate)) {
      setToastMessage('Target date cannot be in the past');
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
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden">
          <div className="flex justify-between items-center p-5 border-b border-white/10">
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

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
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
                required
              />
              {nameError && <p className="text-[10px] text-red-500/80 mt-1">{nameError}</p>}
            </div>

            {/* Monto objetivo */}
            <div>
              <label className="block text-xs text-white/40 mb-1.5 font-light">
                Target Amount <span className="text-red-500">*</span>
              </label>
              <NumberInput
                value={formData.targetAmount}
                onChange={(value) => setFormData({ ...formData, targetAmount: value })}
                placeholder="0"
                min={1}
                showPreview
                previewLabel="Target"
              />
            </div>

            {/* Categoría de compra */}
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
              <p className="text-[9px] text-white/30 mt-1">
                This category will be used when you complete the purchase
              </p>
            </div>

            {/* Fecha objetivo */}
            <div>
              <label className="block text-xs text-white/40 mb-1.5 font-light">
                Target Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={handleDateChange}
                  min={minDate}
                  className={`w-full px-4 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors ${
                    dateError ? 'border-red-500/50' : 'border-white/10'
                  }`}
                />
              </div>
              {dateError && <p className="text-[10px] text-red-500/80 mt-1">{dateError}</p>}
              {!dateError && formData.targetDate && (
                <p className="text-[10px] text-green-500/60 mt-1">
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
                        ? color === 'red' ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                          : color === 'yellow' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                          : 'bg-green-500/20 text-green-500 border border-green-500/30'
                        : 'bg-white/[0.03] text-white/40 hover:text-white'
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

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-white/[0.03] hover:bg-white/10 rounded-lg text-white/60 text-sm font-light transition-all duration-300">
                Cancel
              </button>
              <button type="submit" className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-lg text-white text-sm font-light transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {editingGoal ? 'Update Goal' : 'Create Goal'}
              </button>
            </div>
          </form>
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