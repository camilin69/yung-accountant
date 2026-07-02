// pages/Debts/useDebtForm.ts
import { useState, useEffect, useMemo, useRef } from 'react';
import { formatCurrency, getLocalDateString } from '../../utils/formatters';
import { useWalletStore } from '../../store';
import { useTranslation } from '../../i18n';

interface UseDebtFormProps {
  editingDebt: any;
  totalPaymentsMade: number;
  onSuccess: () => void;
}

export const useDebtForm = ({
  editingDebt,
  totalPaymentsMade,
}: UseDebtFormProps) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    type: 'borrowed' as 'borrowed' | 'lent',
    creditorName: '',
    walletId: '',
    originalAmount: 0,
    monthlyPayment: 0,
    interestRate: 0,
    interestType: 'fixed' as 'fixed' | 'variable',
    compoundMonths: 0, // 0 = sin compound, > 0 = capitaliza cada N meses
    termMonths: 12,
    startDate: getLocalDateString(),
    notes: '',
  });

  const [errors, setErrors] = useState({
    creditorName: '',
    walletId: '',
    originalAmount: '',
    monthlyPayment: '',
    termMonths: '',
    startDate: '',
    type: '',
  });

  const { wallets } = useWalletStore();
  const [realAmountToPay, setRealAmountToPay] = useState(0);
  const [realInterests, setRealInterests] = useState(0);
  const [realAmountError, setRealAmountError] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [paymentValidationError, setPaymentValidationError] = useState<string | null>(null);
  const [editAmountError, setEditAmountError] = useState<string | null>(null);
  const [interestRateInput, setInterestRateInput] = useState('');
  const [variableInterests, setVariableInterests] = useState<{ month: number; rate: number }[]>([]);
  const [selectedVariableMonth, setSelectedVariableMonth] = useState(1);
  const [showCompleteFromEditConfirm, setShowCompleteFromEditConfirm] = useState(false);
  const [pendingEditData, setPendingEditData] = useState<any>(null);
  const isAutoCalculatingRef = useRef(false);

  const realAmountToPayRef = useRef(realAmountToPay);

  useEffect(() => {
    realAmountToPayRef.current = realAmountToPay;
  }, [realAmountToPay]);
  // ============================================
  // CÁLCULO PRINCIPAL: Simple o Compound Mensual
  // ============================================
  useEffect(() => {
    if (formData.monthlyPayment <= 0 || formData.termMonths <= 0) return;
    
    // Si el usuario está editando, no recalcular
    if ((formData as any)._compoundDirty) return;

    const hasCompound = formData.compoundMonths > 0 && formData.interestRate > 0 && formData.originalAmount > 0;

    if (hasCompound) {
      const monthlyRate = formData.interestRate / 100;
      
      // Calcular cuántas veces capitaliza durante todo el préstamo
      const compoundEvery = formData.compoundMonths; // ej: 1 = cada mes, 3 = cada 3 meses
      const totalPeriods = formData.termMonths / compoundEvery; // ej: 36/1=36, 36/3=12, 36/12=3
      
      // La tasa por período es la tasa mensual multiplicada por los meses entre capitalizaciones
      const ratePerPeriod = monthlyRate * compoundEvery;
      
      // Fórmula: Monto = Principal × (1 + tasa_por_período)^número_de_períodos
      const totalAmount = formData.originalAmount * Math.pow(1 + ratePerPeriod, totalPeriods);
      const rounded = Math.round(totalAmount);
      
      setRealAmountToPay(rounded);
      setRealInterests(rounded - formData.originalAmount);
      setRealAmountError(null);
    } else {
      const calculatedRealAmount = formData.monthlyPayment * formData.termMonths;
      setRealAmountToPay(calculatedRealAmount);
      setRealInterests(calculatedRealAmount - formData.originalAmount);
      setRealAmountError(null);
    }
  }, [formData.monthlyPayment, formData.termMonths, formData.compoundMonths, formData.interestRate, formData.originalAmount]);


  // Validación para edición de monto
  useEffect(() => {
    if (editingDebt && formData.originalAmount > 0) {
      if (formData.originalAmount < totalPaymentsMade) {
        setEditAmountError(
          `Cannot reduce amount below total payments made (${formatCurrency(totalPaymentsMade)}).`
        );
      } else {
        setEditAmountError(null);
      }
    } else {
      setEditAmountError(null);
    }
  }, [formData.originalAmount, editingDebt, totalPaymentsMade]);

  const selectedWallet = wallets.find(w => w.id === formData.walletId);
  const currentWalletBalance = selectedWallet?.currentBalance || 0;

  const realAvailableBalance = useMemo(() => {
    let balance = currentWalletBalance;
    if (editingDebt) {
      if (editingDebt.type === 'borrowed' && editingDebt.walletId === formData.walletId) {
        balance -= editingDebt.originalAmount;
      } else if (editingDebt.type === 'lent' && editingDebt.walletId === formData.walletId) {
        balance += editingDebt.originalAmount;
      }
    }
    return Math.max(0, balance);
  }, [currentWalletBalance, editingDebt, formData.walletId, formData.type]);

  // Validación dinámica para Lent
  useEffect(() => {
    if (formData.type === 'lent' && formData.originalAmount > 0 && formData.walletId) {
      let requiredAmount = formData.originalAmount;
      if (editingDebt) {
        if (editingDebt.type === 'borrowed') {
          requiredAmount = formData.originalAmount;
        } else if (editingDebt.type === 'lent') {
          const increase = formData.originalAmount - editingDebt.originalAmount;
          if (increase > 0) {
            requiredAmount = increase;
          } else {
            setBalanceError(null);
            return;
          }
        }
      }
      if (requiredAmount > realAvailableBalance) {
        setBalanceError(t('goals.insufficientBalance', { balance: formatCurrency(realAvailableBalance) }));
      } else {
        setBalanceError(null);
      }
    } else {
      setBalanceError(null);
    }
  }, [formData.type, formData.originalAmount, formData.walletId, realAvailableBalance, editingDebt]);

  // Validación de pago
  useEffect(() => {
    if (formData.originalAmount > 0 && realAmountToPay > 0) {
      if (realAmountToPay < formData.originalAmount) {
        setPaymentValidationError(
          `Real amount to pay (${formatCurrency(realAmountToPay)}) is less than the original amount.`
        );
      } else {
        setPaymentValidationError(null);
      }
    } else {
      setPaymentValidationError(null);
    }
  }, [formData.originalAmount, realAmountToPay]);

  const monthOptions = useMemo(() => {
    return Array.from({ length: formData.termMonths }, (_, i) => ({
      id: String(i + 1),
      label: `Month ${i + 1}`,
      icon: '',
    }));
  }, [formData.termMonths]);

  const handleRealAmountChange = (value: number) => {
    if (value < formData.originalAmount) {
      setRealAmountError(`Real amount cannot be less than the original amount (${formatCurrency(formData.originalAmount)})`);
      setRealAmountToPay(value);
      return;
    }
    setRealAmountError(null);
    setRealAmountToPay(value);
  };

  const handleInterestTypeChange = (type: 'fixed' | 'variable') => {
    setFormData(prev => ({ ...prev, interestType: type }));
    if (type === 'fixed') {
      setVariableInterests([]);
      const roundedRate = Math.round(formData.interestRate * 1000) / 1000;
      setInterestRateInput(roundedRate.toString().replace('.', ','));
      setFormData(prev => ({ ...prev, interestRate: roundedRate }));
    } else {
      const newVariableInterests = Array.from({ length: formData.termMonths }, (_, i) => ({
        month: i + 1,
        rate: formData.interestRate || 0,
      }));
      setVariableInterests(newVariableInterests);
      const currentRate = newVariableInterests[0]?.rate || 0;
      const roundedRate = Math.round(currentRate * 1000) / 1000;
      setInterestRateInput(roundedRate === 0 ? '' : roundedRate.toString().replace('.', ','));
      setSelectedVariableMonth(1);
    }
  };

  const handleMonthlyPaymentChange = (value: number) => {
    setFormData(prev => ({ ...prev, monthlyPayment: value }));
  };

  const handleTermMonthsChange = (value: number) => {
    setFormData(prev => ({ ...prev, termMonths: value }));
    if (formData.interestType === 'variable') {
      const newVariableInterests = Array.from({ length: value }, (_, i) => {
        if (i < variableInterests.length) return variableInterests[i];
        return { month: i + 1, rate: formData.interestRate || 0 };
      });
      setVariableInterests(newVariableInterests);
      if (selectedVariableMonth > value) setSelectedVariableMonth(1);
    }
  };

  const handleCompoundMonthsChange = (value: number) => {
    // Solo permitir valores positivos o 0
    const cleanValue = Math.max(0, Math.floor(value));
    setFormData(prev => ({ ...prev, compoundMonths: cleanValue }));
  };

  const resetForm = () => {
    setFormData({
      type: 'borrowed',
      creditorName: '',
      walletId: '',
      originalAmount: 0,
      monthlyPayment: 0,
      interestRate: 0,
      interestType: 'fixed',
      compoundMonths: 0,
      termMonths: 12,
      startDate: getLocalDateString(),
      notes: '',
    });
    setInterestRateInput('');
    setRealAmountToPay(0);
    setRealInterests(0);
    setRealAmountError(null);
    setVariableInterests([]);
    setErrors({
      creditorName: '',
      walletId: '',
      originalAmount: '',
      monthlyPayment: '',
      termMonths: '',
      startDate: '',
      type: '',
    });
    setBalanceError(null);
    setEditAmountError(null);
  };

  const isFormValid = () => {
    return !(
      !!balanceError || 
      !!editAmountError ||
      !!realAmountError ||
      !formData.walletId ||
      !formData.creditorName.trim() ||
      formData.originalAmount <= 0 ||
      formData.monthlyPayment <= 0 ||
      formData.termMonths <= 0 ||
      !formData.startDate ||
      realAmountToPay < formData.originalAmount ||
      (editingDebt && formData.originalAmount < totalPaymentsMade)
    );
  };

  return {
    selectedWallet,
    realAvailableBalance,
    formData,
    setFormData,
    errors,
    setErrors,
    realAmountToPay,
    realInterests,
    setRealAmountError,
    realAmountError,
    balanceError,
    paymentValidationError,
    editAmountError,
    interestRateInput,
    setInterestRateInput,
    variableInterests,
    setVariableInterests,
    selectedVariableMonth,
    setSelectedVariableMonth,
    monthOptions,
    handleRealAmountChange,
    handleInterestTypeChange,
    handleMonthlyPaymentChange,
    handleTermMonthsChange,
    handleCompoundMonthsChange,
    resetForm,
    isFormValid,
    setBalanceError,
    setEditAmountError,
    isAutoCalculatingRef,
    showCompleteFromEditConfirm,
    setShowCompleteFromEditConfirm,
    pendingEditData,
    setPendingEditData,
  };
};