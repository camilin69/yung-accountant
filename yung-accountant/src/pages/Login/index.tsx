// pages/Login/index.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import Galaxy from '../../components/common/Galaxy';
import { LoginForm } from './LoginForm';
import { LoginHeader } from './LoginHeader';
import { LoginFooter } from './LoginFooter';
import { LoginNavbar } from './LoginNavbar';
import { useUserStore } from '../../store';
import { scheduleProactiveRefresh, authService } from '../../services/auth.service';

const Login: React.FC = () => {
  useDocumentTitle('Login');
  const navigate = useNavigate();
  const { isAuthenticated } = useUserStore();
  const [googleError, setGoogleError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const code = params.get('code');

    // Backend redirects with tokens (Google OAuth via Keycloak brokering)
    if (token) {
      const secure = location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `access_token=${token}; Path=/; SameSite=Lax; Max-Age=1800${secure}`;
      const refreshToken = params.get('refreshToken');
      if (refreshToken) {
        document.cookie = `refresh_token=${refreshToken}; Path=/; SameSite=Lax; Max-Age=5184000${secure}`;
      }
      scheduleProactiveRefresh();
      useUserStore.setState({ isAuthenticated: true });
      window.history.replaceState({}, document.title, '/login');
      navigate('/dashboard', { replace: true });
      return;
    }

    // Keycloak brokering: frontend receives code, backend exchanges it
    if (code) {
      const redirectUri = window.location.origin + '/login';
      authService.loginWithGoogleCode(code, redirectUri)
        .then(() => {
          window.history.replaceState({}, document.title, '/login');
          navigate('/dashboard', { replace: true });
        })
        .catch((err: any) => {
          setGoogleError(err.response?.data?.error || 'Google login failed');
          window.history.replaceState({}, document.title, '/login');
        });
    }
  }, [navigate]);

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--theme-background-primary)' }}>
      <Galaxy />
      <LoginNavbar />
      <div className="relative z-10 flex items-center justify-center p-4 min-h-screen pt-28 sm:pt-32">
        <div className="max-w-md w-full animate-fade-in-up">
          <LoginHeader />
          {googleError && (
            <div className="mb-4 p-3 rounded-2xl text-sm text-center" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
              {googleError}
            </div>
          )}
          <LoginForm />
          <LoginFooter />
        </div>
      </div>
    </div>
  );
};

export default Login;
