// pages/Home/components/FooterSection.tsx
import React from 'react';
import { Logo } from '../../components/common/Logo';
import { useTranslation } from '../../i18n';

export const FooterSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="py-6 sm:py-8 lg:py-12 px-4 sm:px-6 lg:px-8 relative z-10" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
          <Logo size="sm" withText={true} />

          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 lg:gap-8">
            <a href="#" className="text-[10px] sm:text-xs font-medium transition-colors duration-300 hover:opacity-80" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>{t('home.privacyPolicy')}</a>
            <a href="#" className="text-[10px] sm:text-xs font-medium transition-colors duration-300 hover:opacity-80" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>{t('home.termsOfService')}</a>
            <a href="#" className="text-[10px] sm:text-xs font-medium transition-colors duration-300 hover:opacity-80" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>{t('home.contact')}</a>
            <a href="#" className="text-[10px] sm:text-xs font-medium transition-colors duration-300 hover:opacity-80" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>{t('home.about')}</a>
          </div>

          <p className="text-[9px] sm:text-[10px] font-medium" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.35 }}>
            {t('home.copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
};