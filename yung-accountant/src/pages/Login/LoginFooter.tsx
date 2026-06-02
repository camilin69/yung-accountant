// pages/Login/LoginFooter.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket } from 'lucide-react';

export const LoginFooter: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="mt-8 text-center">
      <p className="text-sm font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>
        Don't have an account?{' '}
        <button
          type="button"
          onClick={() => navigate('/register')}
          className="inline-flex items-center gap-1.5 transition-all duration-300 hover:opacity-80 font-medium"
          style={{ color: 'var(--theme-primary)' }}
        >
          Create Account
          <Rocket className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </p>
    </div>
  );
};