// pages/Register/index.tsx
import React from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import Galaxy from '../../components/common/Galaxy';
import { RegisterForm } from './RegisterForm';
import { RegisterHeader } from './RegisterHeader';
import { RegisterFooter } from './RegisterFooter';
import { RegisterNavbar } from './RegisterNavbar';
import { useTranslation } from '../../i18n';

const Register: React.FC = () => {
  const { t } = useTranslation();
  useDocumentTitle(t('pagetitle.register'));

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--theme-background-primary)' }}>
      {/* Fondo Galáctico */}
      <Galaxy />

      <RegisterNavbar />
      <div className="relative z-10 flex items-center justify-center p-4 min-h-screen pt-28 sm:pt-32">
        <div className="max-w-md w-full animate-fade-in-up">
          <RegisterHeader />
          <RegisterForm />
          <RegisterFooter />
        </div>
      </div>
    </div>
  );
};

export default Register;