// pages/Wallets/constants.tsx

import { DollarSign, Building2, CreditCard, Package } from 'lucide-react';

export interface WalletType {
  id: string;
  label: string;
  getIcon: (color?: string, className?: string) => React.ReactNode;
  color: string;
}

export const walletTypes: WalletType[] = [
  { 
    id: 'cash', 
    label: 'Cash', 
    getIcon: (color, className = "w-4 h-4") => <DollarSign className={className} style={{ color }} />, 
    color: '#10B981' 
  },
  { 
    id: 'bank_account', 
    label: 'Bank Account', 
    getIcon: (color, className = "w-4 h-4") => <Building2 className={className} style={{ color }} />, 
    color: '#6366F1' 
  },
  { 
    id: 'credit_card', 
    label: 'Credit Card', 
    getIcon: (color, className = "w-4 h-4") => <CreditCard className={className} style={{ color }} />, 
    color: '#EF4444' 
  },
  { 
    id: 'debit_card', 
    label: 'Debit Card', 
    getIcon: (color, className = "w-4 h-4") => <CreditCard className={className} style={{ color }} />, 
    color: '#F59E0B' 
  },
  { 
    id: 'other', 
    label: 'Other', 
    getIcon: (color, className = "w-4 h-4") => <Package className={className} style={{ color }} />, 
    color: '#8B5CF6' 
  },
];

export const getWalletIcon = (type: string, color?: string, className: string = "w-5 h-5"): React.ReactNode => {
  const walletType = walletTypes.find(t => t.id === type);
  if (!walletType) {
    return <DollarSign className={className} style={{ color }} />;
  }
  return walletType.getIcon(color || walletType.color, className);
};

export const getWalletIconString = (type: string): string => {
  const iconMap: Record<string, string> = {
    cash: 'DollarSign',
    bank_account: 'Building2',
    credit_card: 'CreditCard',
    debit_card: 'CreditCard',
    other: 'Package',
  };
  return iconMap[type] || 'DollarSign';
};