// components/modals/AddFundsToGoalModal.tsx
import React, { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';
import NumberInput from '../../components/common/NumberInput';
import { X, PlusCircle, MinusCircle, AlertCircle } from 'lucide-react';

interface AddFundsToGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, note: string) => void;
  goalName: string;
  currentAmount: number;
  targetAmount: number;
  availableBalance: number;
  type: 'add' | 'remove';
}

const AddFundsToGoalModal: React.FC<AddFundsToGoalModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  goalName,
  currentAmount,
  targetAmount,
  availableBalance,
  type,
}) => {
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const maxAdd = Math.min(targetAmount - currentAmount, availableBalance);
  const maxRemove = currentAmount;

  const validateAmount = (value: number): boolean => {
    if (value <= 0) {
      setError('Amount must be greater than 0');
      return false;
    }
    
    if (type === 'add') {
      if (value > targetAmount - currentAmount) {
        setError(`Cannot exceed goal target. Max: ${formatCurrency(targetAmount - currentAmount)}`);
        return false;
      }
      if (value > availableBalance) {
        setError(`Insufficient available balance. You have ${formatCurrency(availableBalance)} available.`);
        return false;
      }
    } else {
      if (value > currentAmount) {
        setError(`Cannot remove more than saved. Max: ${formatCurrency(currentAmount)}`);
        return false;
      }
    }
    
    setError(null);
    return true;
  };

  const handleConfirm = () => {
    if (validateAmount(amount)) {
      onConfirm(amount, note);
      setAmount(0);
      setNote('');
      setError(null);
      onClose();
    }
  };

  const willComplete = type === 'add' && (currentAmount + amount) >= targetAmount;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[var(--theme-background-glass)] backdrop-blur-xl border border-[var(--theme-border-light)] rounded-xl w-full max-w-md">
        <div className="flex justify-between items-center p-5 border-b border-[var(--theme-border-light)]">
          <div>
            <h3 className="text-lg font-light text-[var(--theme-text-primary)]">
              {type === 'add' ? 'Add Funds to Goal' : 'Remove Funds from Goal'}
            </h3>
            <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 font-light">{goalName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors">
            <X className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Available Balance Info */}
          {type === 'add' && (
            <div className="p-3 bg-[var(--theme-background-glass)] rounded-lg border border-[var(--theme-border-dark)]">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--theme-text-tertiary)]">Available Balance</span>
                <span className="text-[var(--theme-primary)] font-light">{formatCurrency(availableBalance)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-[var(--theme-text-tertiary)]">Current Goal Savings</span>
                <span className="text-[var(--theme-text-secondary)]">{formatCurrency(currentAmount)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-[var(--theme-text-tertiary)]">Goal Target</span>
                <span className="text-[var(--theme-text-secondary)]">{formatCurrency(targetAmount)}</span>
              </div>
            </div>
          )}

          {type === 'remove' && (
            <div className="p-3 bg-[var(--theme-background-glass)] rounded-lg border border-[var(--theme-border-dark)]">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--theme-text-tertiary)]">Current Goal Savings</span>
                <span className="text-[var(--theme-text-secondary)]">{formatCurrency(currentAmount)}</span>
              </div>
            </div>
          )}

          {/* Amount Input */}
          <NumberInput
            label="Amount"
            value={amount}
            onChange={setAmount}
            placeholder="0"
            min={1}
            max={type === 'add' ? maxAdd : maxRemove}
            required
            error={error}
            showPreview
            previewLabel={type === 'add' ? 'You are adding' : 'You are removing'}
          />

          {/* Note Input */}
          <div>
            <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50 transition-colors placeholder:text-[var(--theme-text-tertiary)]/20"
              placeholder="e.g., Monthly savings, Bonus, etc."
            />
          </div>

          {/* Warning for completion */}
          {willComplete && type === 'add' && (
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <p className="text-xs text-yellow-500/80">
                This will complete the goal! You will need to mark it as purchased to move it to completed.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-[var(--theme-border-light)]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-tertiary)] text-sm font-light transition-all duration-300"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-light transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 ${
              type === 'add' 
                ? 'bg-gradient-to-r from-green-600 to-emerald-700' 
                : 'bg-gradient-to-r from-red-600 to-rose-700'
            }`}
          >
            {type === 'add' ? <PlusCircle className="w-4 h-4" /> : <MinusCircle className="w-4 h-4" />}
            {type === 'add' ? 'Add Funds' : 'Remove Funds'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddFundsToGoalModal;