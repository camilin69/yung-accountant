// pages/Register/RegisterHeader.tsx
import React from 'react';
import { Logo } from '../../components/common/Logo';

export const RegisterHeader: React.FC = () => {
  return (
    <div className="text-center mb-8">
      <div className="flex justify-center mb-5">
        <Logo size="lg" withText={false} />
      </div>
      <h1 className="text-[30px] font-light tracking-[-0.03em] mb-2" style={{ color: 'var(--theme-text-primary)' }}>
        Create Account
      </h1>
      <p className="text-[14px] tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)' }}>
        Start your financial journey today
      </p>
    </div>
  );
};