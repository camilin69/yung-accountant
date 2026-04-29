// src/components/common/ThemedCard.tsx
import React from 'react';
import { useThemeStyles } from '../../hooks/useTheme';

interface ThemeCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'gradient';
}

export const ThemeCard: React.FC<ThemeCardProps> = ({ 
  children, 
  className = '', 
  variant = 'default' 
}) => {
  const { getCardClassName } = useThemeStyles();
  
  return (
    <div className={`${getCardClassName(variant)} ${className}`}>
      {children}
    </div>
  );
};