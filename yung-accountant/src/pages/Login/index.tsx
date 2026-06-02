// pages/Login/index.tsx
import React from 'react';
import Galaxy from '../../components/common/Galaxy';
import { LoginForm } from './LoginForm';
import { LoginHeader } from './LoginHeader';
import { LoginFooter } from './LoginFooter';
import { LoginNavbar } from './LoginNavbar';

const Login: React.FC = () => {
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--theme-background-primary)' }}>
      {/* Fondo Galáctico */}
      <Galaxy />

      <LoginNavbar />
      <div className="relative z-10 flex items-center justify-center p-4 min-h-screen pt-28 sm:pt-32">
        <div className="max-w-md w-full animate-fade-in-up">
          <LoginHeader />
          <LoginForm />
          <LoginFooter />
        </div>
      </div>
    </div>
  );
};

export default Login;