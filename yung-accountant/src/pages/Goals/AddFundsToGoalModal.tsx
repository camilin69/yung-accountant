// components/modals/AddFundsToGoalModal.tsx
import React, { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';
import NumberInput from '../../components/common/NumberInput';
import { X, PlusCircle, MinusCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from '../../i18n';

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
  const { t } = useTranslation();
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const maxAdd = Math.min(targetAmount - currentAmount, availableBalance);
  const maxRemove = currentAmount;

  const validateAmount = (value: number): boolean => {
    if (value <= 0) {
      setError(t('goals.amountGreaterThanZero'));
      return false;
    }

    if (type === 'add') {
      if (value > targetAmount - currentAmount) {
        setError(t('goals.cannotExceedTarget', { max: formatCurrency(targetAmount - currentAmount) }));
        return false;
      }
      if (value > availableBalance) {
        setError(t('goals.insufficientBalance', { balance: formatCurrency(availableBalance) }));
        return false;
      }
    } else {
      if (value > currentAmount) {
        setError(t('goals.cannotRemoveMore', { max: formatCurrency(currentAmount) }));
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

  const infoRows = type === 'add' ? [
    { label: t('goals.availableBalance'), value: formatCurrency(availableBalance), color: 'var(--theme-primary)' },
    { label: t('goals.currentAmount'), value: formatCurrency(currentAmount), color: 'var(--theme-text-secondary)' },
    { label: t('goals.targetAmount'), value: formatCurrency(targetAmount), color: 'var(--theme-text-secondary)' },
  ] : [
    { label: t('goals.currentAmount'), value: formatCurrency(currentAmount), color: 'var(--theme-text-secondary)' },
  ];

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md rounded-[2rem] overflow-hidden glass-aero animate-scale-in">
        {/* Header */}
        <div className="flex justify-between items-center p-5" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
          <div>
            <h3 className="text-lg font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>
              {type === 'add' ? t('goals.addFunds') : t('goals.removeFunds')}
            </h3>
            <p className="text-xs tracking-[0.03em] mt-0.5" style={{ color: 'var(--theme-text-tertiary)' }}>{goalName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
            <X className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Info Panel */}
          <div className="rounded-[1.25rem] p-4 glass-sm space-y-2.5">
            {infoRows.map((row, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>{row.label}</span>
                <span className="font-medium" style={{ color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Amount Input */}
          <NumberInput
            label={t('common.amount')}
            value={amount}
            onChange={setAmount}
            placeholder="0"
            min={1}
            max={type === 'add' ? maxAdd : maxRemove}
            required
            error={error}
            showPreview
            previewLabel={type === 'add' ? t('goals.youAreAdding') : t('goals.youAreRemoving')}
          />

          {/* Note Input */}
          <div>
            <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>{t('common.note')} ({t('common.optional')})</label>
            <input
              maxLength={50}
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm"
              style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }}
              placeholder="e.g., Monthly savings, Bonus, etc."
            />
          </div>

          {/* Completion Warning */}
          {willComplete && type === 'add' && (
            <div className="flex items-center gap-2.5 p-3 rounded-[1rem]" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--semantic-warning)' }} />
              <p className="text-xs font-medium" style={{ color: 'var(--semantic-warning)', opacity: 0.85 }}>
                {t('goals.willComplete')} {t('goals.willCompleteDesc')}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
          <div className="flex gap-3 p-5">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 glass-sm"
              style={{ color: 'var(--theme-text-tertiary)' }}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2.5 rounded-2xl text-white text-sm font-medium transition-all duration-500 hover:-translate-y-1 flex items-center justify-center gap-2"
              style={{
                backgroundColor: type === 'add' ? 'var(--semantic-income)' : 'var(--semantic-expense)',
                boxShadow: type === 'add' ? '0 4px 20px -6px var(--semantic-income)' : '0 4px 20px -6px var(--semantic-expense)'
              }}
            >
              {type === 'add' ? <PlusCircle className="w-4 h-4" strokeWidth={2} /> : <MinusCircle className="w-4 h-4" strokeWidth={2} />}
              {type === 'add' ? t('goals.addFunds') : t('goals.removeFunds')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddFundsToGoalModal;