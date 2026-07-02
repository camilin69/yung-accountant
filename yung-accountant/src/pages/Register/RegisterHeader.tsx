// pages/Register/RegisterHeader.tsx
import React from 'react';
import { Logo } from '../../components/common/Logo';
import { useTranslation } from '../../i18n';

export const RegisterHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="text-center mb-8">
      <div className="flex justify-center mb-5">
        <Logo size="lg" withText={false} />
      </div>
      <h1 className="text-[30px] font-light tracking-[-0.03em] mb-2" style={{ color: 'var(--theme-text-primary)' }}>
        {t('register.welcomeTitle')}
      </h1>
      <p className="text-[14px] tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)' }}>
        {t('register.welcomeSubtitle')}
      </p>
    </div>
  );
};