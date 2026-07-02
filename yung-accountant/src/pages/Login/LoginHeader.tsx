// pages/Login/LoginHeader.tsx
import React from 'react';
import { Logo } from '../../components/common/Logo';
import { useTranslation } from '../../i18n';

export const LoginHeader: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="text-center mb-8">
      <div className="flex justify-center mb-5">
        <Logo size="lg" withText={false} />
      </div>
      <h1 className="text-[30px] font-light tracking-[-0.03em] mb-2" style={{ color: 'var(--theme-text-primary)' }}>
        {t('login.title')}
      </h1>
      <p className="text-[14px] tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)' }}>
        {t('login.subtitle')}
      </p>
    </div>
  );
};