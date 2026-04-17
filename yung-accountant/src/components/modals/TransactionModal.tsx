// components/modals/TransactionModal.tsx

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface TransactionModalProps {
  onClose: () => void;
  onSave: (data: any) => void;
  defaultDate?: string;
}

const categories = ['Food', 'Transport', 'Weed', 'Entertainment', 'Savings', 'Health', 'Education', 'Income'];

const TransactionModal: React.FC<TransactionModalProps> = ({ onClose, onSave, defaultDate }) => {
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: 'Food',
    isIncome: false,
    date: defaultDate || new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    onSave({
      ...formData,
      amount: parseFloat(formData.amount),
      userId: '1',
      tags: [],
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Amount *</label>
        <input
          type="number"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          className="input"
          placeholder="0"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="input"
          placeholder="What was this for?"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Category</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="input"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Date</label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="input"
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={!formData.isIncome}
            onChange={() => setFormData({ ...formData, isIncome: false })}
            className="w-4 h-4 accent-danger"
          />
          <span>Expense</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={formData.isIncome}
            onChange={() => setFormData({ ...formData, isIncome: true })}
            className="w-4 h-4 accent-success"
          />
          <span>Income</span>
        </label>
      </div>
      <div className="flex gap-3 pt-4">
        <button type="button" onClick={onClose} className="btn btn-outline flex-1">
          Cancel
        </button>
        <button type="submit" className="btn btn-primary flex-1">
          Save Transaction
        </button>
      </div>
    </form>
  );
};

export default TransactionModal;