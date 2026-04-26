// utils/iconHelpers.tsx - Actualizado

import * as Icons from 'lucide-react';
import React from 'react';

const iconMap: Record<string, React.ComponentType<any>> = {
  // Income icons
  Briefcase: Icons.Briefcase,
  Laptop: Icons.Laptop,
  Gift: Icons.Gift,
  TrendingUp: Icons.TrendingUp,
  Wallet: Icons.Wallet,
  ArrowLeftRight: Icons.ArrowLeftRight,
  
  // Expense icons
  Utensils: Icons.Utensils,
  Car: Icons.Car,
  Gamepad2: Icons.Gamepad2,
  PiggyBank: Icons.PiggyBank,
  Heart: Icons.Heart,
  GraduationCap: Icons.GraduationCap,
  Home: Icons.Home,
  Zap: Icons.Zap,
  ShoppingBag: Icons.ShoppingBag,
  Plane: Icons.Plane,
  HandCoins: Icons.HandCoins,
  CreditCard: Icons.CreditCard,
  DollarSign: Icons.DollarSign,
  Coffee: Icons.Coffee,
  Dumbbell: Icons.Dumbbell,
  Leaf: Icons.Leaf,
  Tag: Icons.Tag,
  
  // Wallet icons
  Building2: Icons.Building2,
  Package: Icons.Package,
  
  MoreHorizontal: Icons.MoreHorizontal,
};

// Función para obtener el componente del icono
export const getIconComponent = (iconName: string): React.ComponentType<any> => {
  if (!iconName) {
    return Icons.MoreHorizontal;
  }
  
  const Icon = iconMap[iconName];
  if (Icon) {
    return Icon;
  }
  
  const lowerName = iconName.toLowerCase();
  const foundKey = Object.keys(iconMap).find(
    key => key.toLowerCase() === lowerName
  );
  
  if (foundKey) {
    return iconMap[foundKey];
  }
  
  return Icons.MoreHorizontal;
};

// Función para obtener icono de wallet por tipo
export const getWalletIcon = (type: string, className: string = "w-4 h-4", color?: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    cash: <Icons.DollarSign className={className} style={{ color }} />,
    bank_account: <Icons.Building2 className={className} style={{ color }} />,
    credit_card: <Icons.CreditCard className={className} style={{ color }} />,
    debit_card: <Icons.CreditCard className={className} style={{ color }} />,
    other: <Icons.Package className={className} style={{ color }} />,
  };
  return iconMap[type] || <Icons.Wallet className={className} style={{ color }} />;
};

export const renderIcon = (iconName: string, className: string = "w-4 h-4", color?: string) => {
  const Icon = getIconComponent(iconName);
  return <Icon className={className} style={{ color }} />;
};