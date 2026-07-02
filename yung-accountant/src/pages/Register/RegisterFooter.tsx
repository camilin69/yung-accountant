// pages/Register/RegisterFooter.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useTranslation } from '../../i18n';

export const RegisterFooter: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <>
      <div className="mt-8 text-center">
        <p className="text-sm font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>
          {t('register.haveAccount')}{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-1.5 transition-all duration-300 hover:opacity-80 font-medium"
            style={{ color: 'var(--theme-primary)' }}
          >
            {t('register.login')}
            <LogIn className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </p>
      </div>

      <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] font-medium text-center" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.45 }}>
          {t('register.termsAgreement')}
        </p>
      </div>
    </>
  );
};