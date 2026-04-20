// components/modals/TransactionModal.tsx

import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import NumberInput from '../common/NumberInput';
import CustomSelect from '../common/CustomSelect';
import { X, Save } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingTransaction?: any;
  defaultDate?: string;
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTransaction,
  defaultDate,
}) => {
  const { categories, addTransaction, updateTransaction } = useStore();
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

  // Preparar opciones para el CustomSelect
  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');
  
  const categoryOptions = [
    // Income section header
    ...(incomeCategories.length > 0 
      ? [{ id: 'income-sep', label: '━━━ INCOME ━━━', icon: '💰', disabled: true }] 
      : []),
    // Income categories
    ...incomeCategories.map(cat => ({ 
      id: cat.id, 
      label: cat.name, 
      icon: cat.icon, 
      color: cat.color,
      disabled: false 
    })),
    // Expense section header
    ...(expenseCategories.length > 0 
      ? [{ id: 'expense-sep', label: '━━━ EXPENSES ━━━', icon: '💸', disabled: true }] 
      : []),
    // Expense categories
    ...expenseCategories.map(cat => ({ 
      id: cat.id, 
      label: cat.name, 
      icon: cat.icon, 
      color: cat.color,
      disabled: false 
    })),
  ];

  // Resetear estado
  useEffect(() => {
    if (!isOpen) {
      setAmount(0);
      setDescription('');
      setCategoryId('');
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setError(null);
    } else if (editingTransaction) {
      setAmount(editingTransaction.amount);
      setDescription(editingTransaction.description);
      setCategoryId(editingTransaction.categoryId);
      setDate(editingTransaction.date);
      setError(null);
    } else {
      setAmount(0);
      setDescription('');
      setError(null);
      const defaultCategory = categories.find(c => c.type === 'expense');
      setCategoryId(defaultCategory?.id || '');
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, editingTransaction, categories, defaultDate]);

  const validateAmount = (value: number): boolean => {
    if (value <= 0) {
      setError('Amount must be greater than 0');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = () => {
    if (!validateAmount(amount)) return;
    if (!categoryId) {
      setError('Please select a category');
      return;
    }

    if (editingTransaction) {
      updateTransaction(editingTransaction.id, {
        amount,
        description,
        categoryId,
        date,
      });
    } else {
      addTransaction({
        amount,
        description,
        categoryId,
        date,
        tags: [],
      });
    }

    onSave();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-md">
        <div className="flex justify-between items-center p-5 border-b border-white/10">
          <div>
            <h3 className="text-lg font-light text-white">
              {editingTransaction ? 'Edit Transaction' : 'New Transaction'}
            </h3>
            <p className="text-xs text-white/40 mt-0.5 font-light">
              {editingTransaction ? 'Update your transaction' : 'Record a financial movement'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Amount */}
          <div>
            <label className="block text-xs text-white/40 mb-1.5 font-light">Amount *</label>
            <NumberInput
              value={amount}
              onChange={setAmount}
              placeholder="0"
              min={1}
              showPreview
              previewLabel="Amount"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs text-white/40 mb-1.5 font-light">Category *</label>
            <CustomSelect
              value={categoryId}
              onChange={(value) => {
                setCategoryId(value);
              }}
              options={categoryOptions}
              placeholder="Select a category"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-white/40 mb-1.5 font-light">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors placeholder:text-white/20"
              placeholder="What was this for?"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs text-white/40 mb-1.5 font-light">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500/80 animate-pulse">{error}</p>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-white/10">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white/[0.03] hover:bg-white/10 rounded-lg text-white/60 text-sm font-light transition-all duration-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-lg text-white text-sm font-light transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {editingTransaction ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;