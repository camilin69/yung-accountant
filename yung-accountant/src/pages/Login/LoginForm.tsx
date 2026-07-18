// pages/Login/LoginForm.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useUserStore } from '../../store';
import { loginWithGoogle, authService } from '../../services/auth.service';
import { AlertCircle, CheckCircle, ArrowLeft, Lock, Mail, Eye, EyeOff, LogIn } from 'lucide-react';
import TurnstileWidget from '../../components/common/TurnstileWidget';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login, error, clearError } = useUserStore();

  // Pre-fill email from Google OAuth redirect
  const params = new URLSearchParams(window.location.search);
  const googleEmail = params.get('email') || '';
  const resetSuccess = params.get('resetSuccess') === 'true';

  const [email, setEmail] = useState(googleEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState({
    email: '',
    password: ''
  });
  const [touched, setTouched] = useState({
    email: false,
    password: false
  });
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetIsLoading, setResetIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState(false);

  // Escuchar errores del store
  useEffect(() => {
    if (error) {
      setLocalError(error);
    }
  }, [error]);

  const validateEmail = (value: string) => {
    if (!value) return t('login.emailRequired');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return t('login.invalidEmail');
    return '';
  };

  const validatePassword = (value: string) => {
    if (!value) return t('login.passwordRequired');
    if (value.length < 3) return t('login.passwordMinLength');
    return '';
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (touched.email) {
      setValidationErrors(prev => ({ ...prev, email: validateEmail(value) }));
    }
    if (localError) {
      setLocalError(null);
      clearError();
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (touched.password) {
      setValidationErrors(prev => ({ ...prev, password: validatePassword(value) }));
    }
    if (localError) {
      setLocalError(null);
      clearError();
    }
  };

  const handleBlur = (field: 'email' | 'password') => {
    setTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'email') {
      setValidationErrors(prev => ({ ...prev, email: validateEmail(email) }));
    } else if (field === 'password') {
      setValidationErrors(prev => ({ ...prev, password: validatePassword(password) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({ email: true, password: true });

    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    setValidationErrors({
      email: emailError,
      password: passwordError
    });

    if (emailError || passwordError) {
      return;
    }

    if (!turnstileToken) {
      setTurnstileError(true);
      return;
    }

    setIsLoading(true);
    setLocalError(null);
    clearError();

    try {
      await login(email, password, turnstileToken);
      navigate('/dashboard');
    } catch (err: any) {
      setLocalError(err.message || t('login.error'));
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    loginWithGoogle();
  };

  const handleForgotPassword = async () => {
    setTouched(prev => ({ ...prev, email: true }));

    const emailError = validateEmail(email);
    setValidationErrors(prev => ({ ...prev, email: emailError }));

    if (emailError) return;

    if (!turnstileToken) {
      setTurnstileError(true);
      return;
    }

    setResetIsLoading(true);
    try {
      await authService.forgotPassword(email, turnstileToken);
      setResetEmailSent(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error || t('login.forgotPasswordError');
      setValidationErrors(prev => ({ ...prev, email: msg }));
    } finally {
      setResetIsLoading(false);
    }
  };

  const exitResetMode = () => {
    setIsResetMode(false);
    setResetEmailSent(false);
    setLocalError(null);
    setValidationErrors({ email: '', password: '' });
    setTouched({ email: false, password: false });
  };

  const formStyle = {
    background: 'rgba(255,255,255,0.025)',
    backdropFilter: 'blur(60px) saturate(2)',
    WebkitBackdropFilter: 'blur(60px) saturate(2)',
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: '0 24px 64px -16px rgba(0,0,0,0.4), 0 0 80px -20px var(--theme-primary)',
  } as const;

  // ── Reset password mode ──────────────────────────────────────
  if (isResetMode) {
    return (
      <div className="rounded-[2.5rem] p-8 sm:p-10" style={formStyle}>
        <div className="space-y-5">
          <div className="text-center mb-2">
            <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--theme-text-primary)' }}>
              {t('login.forgotPasswordTitle')}
            </h2>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.6 }}>
              {t('login.forgotPasswordInstructions')}
            </p>
          </div>

          <div>
            <label htmlFor="reset-email" className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
              {t('login.email')}
            </label>
            <div className="relative group">
              <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300 ${
                resetEmailSent ? 'text-green-400'
                : validationErrors.email && touched.email ? 'text-red-500'
                : 'text-[var(--theme-text-tertiary)] opacity-40 group-focus-within:opacity-80'
              }`} />
              <input
                id="reset-email"
                maxLength={50}
                type="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={() => handleBlur('email')}
                disabled={resetEmailSent}
                className={`w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-all duration-500 placeholder:opacity-25 ${
                  resetEmailSent ? 'ring-1 ring-green-500/30 cursor-not-allowed opacity-60'
                  : validationErrors.email && touched.email ? 'ring-1 ring-red-500/30'
                  : ''
                }`}
                style={{
                  background: resetEmailSent ? 'rgba(34,197,94,0.03)' : 'rgba(255,255,255,0.03)',
                  border: resetEmailSent ? '1px solid rgba(34,197,94,0.15)' : '1px solid rgba(255,255,255,0.06)',
                  color: 'var(--theme-text-primary)',
                }}
                placeholder={t('login.emailPlaceholder')}
                autoComplete="email"
              />
            </div>
            {validationErrors.email && touched.email && !resetEmailSent && (
              <div role="alert" className="flex items-center gap-1.5 mt-1.5 animate-fade-in">
                <AlertCircle className="w-3 h-3" style={{ color: 'var(--semantic-expense)', opacity: 0.8 }} />
                <p className="text-[10px] font-medium" style={{ color: 'var(--semantic-expense)', opacity: 0.8 }}>{validationErrors.email}</p>
              </div>
            )}
            {resetEmailSent && (
              <div className="flex items-center gap-1.5 mt-1.5 animate-fade-in">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <p className="text-[10px] font-medium text-green-400">{t('login.resetEmailSent')}</p>
              </div>
            )}
          </div>

          {resetEmailSent && (
            <div className="flex items-start gap-3 p-4 rounded-[1.25rem] animate-fade-in"
              style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-400" />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{t('login.resetEmailSent')}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.6 }}>{t('login.resetEmailSentDesc')}</p>
              </div>
            </div>
          )}

          {resetEmailSent ? (
            <button type="button" onClick={exitResetMode}
              className="w-full py-3.5 rounded-2xl text-sm font-medium flex items-center justify-center gap-2.5 transition-all duration-500 hover:-translate-y-1 active:scale-95"
              style={{ backgroundColor: 'var(--theme-primary)', color: '#FFFFFF',
                boxShadow: '0 8px 32px -8px var(--theme-primary), 0 0 60px -10px var(--theme-primary)' }}>
              <ArrowLeft className="w-4 h-4" strokeWidth={2} />
              {t('login.backToLogin')}
            </button>
          ) : (
            <div className="space-y-3">
              {/* Turnstile Bot Verification */}
              <div className="flex justify-center">
                <TurnstileWidget
                  onVerify={(token) => { setTurnstileToken(token); setTurnstileError(false); }}
                  onError={() => { setTurnstileToken(null); setTurnstileError(true); }}
                  onExpire={() => { setTurnstileToken(null); }}
                />
              </div>
              {turnstileError && (
                <div role="alert" className="flex items-center gap-1.5 animate-fade-in">
                  <AlertCircle className="w-3 h-3" style={{ color: 'var(--semantic-expense)', opacity: 0.8 }} />
                  <p className="text-[10px] font-medium" style={{ color: 'var(--semantic-expense)', opacity: 0.8 }}>
                    {t('login.pleaseCompleteVerification')}
                  </p>
                </div>
              )}
              <button type="button" onClick={handleForgotPassword} disabled={resetIsLoading}
                className="w-full py-3.5 rounded-2xl text-sm font-medium flex items-center justify-center gap-2.5 transition-all duration-500 hover:-translate-y-1 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--theme-primary)', color: '#FFFFFF',
                  boxShadow: '0 8px 32px -8px var(--theme-primary), 0 0 60px -10px var(--theme-primary)' }}>
                {resetIsLoading ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : t('login.sendResetLink')}
              </button>
              <button type="button" onClick={exitResetMode}
                className="w-full py-3 rounded-2xl text-sm font-medium transition-all duration-300 hover:opacity-80"
                style={{ color: 'var(--theme-text-tertiary)' }}>
                <ArrowLeft className="w-4 h-4 inline mr-1.5 -mt-0.5" strokeWidth={2} />
                {t('login.backToLogin')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Normal login form ─────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="rounded-[2.5rem] p-8 sm:p-10" style={formStyle}>
      <div className="space-y-5">
        {/* Password Reset Success */}
        {resetSuccess && (
          <div className="flex items-start gap-3 p-4 rounded-[1.25rem] animate-fade-in"
            style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-400" />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                {t('login.resetEmailSent')}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.6 }}>
                {t('login.resetEmailSentDesc')}
              </p>
            </div>
          </div>
        )}

        {/* Email */}
        <div>
          <label htmlFor="login-email" className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
            {t('login.email')}
          </label>
          <div className="relative group">
            <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300 ${
              validationErrors.email && touched.email
                ? 'text-red-500'
                : 'text-[var(--theme-text-tertiary)] opacity-40 group-focus-within:opacity-80'
            }`} />
            <input
              id="login-email"
              maxLength={50}
              type="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => handleBlur('email')}
              className={`w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-all duration-500 placeholder:opacity-25 ${
                validationErrors.email && touched.email ? 'ring-1 ring-red-500/30' : ''
              }`}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'var(--theme-text-primary)',
              }}
              placeholder={t('login.emailPlaceholder')}
              autoComplete="email"
            />
          </div>
          {validationErrors.email && touched.email && (
            <div role="alert" className="flex items-center gap-1.5 mt-1.5 animate-fade-in">
              <AlertCircle className="w-3 h-3" style={{ color: 'var(--semantic-expense)', opacity: 0.8 }} />
              <p className="text-[10px] font-medium" style={{ color: 'var(--semantic-expense)', opacity: 0.8 }}>{validationErrors.email}</p>
            </div>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="login-password" className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
            {t('login.password')}
          </label>
          <div className="relative group">
            <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300 ${
              validationErrors.password && touched.password
                ? 'text-red-500'
                : 'text-[var(--theme-text-tertiary)] opacity-40 group-focus-within:opacity-80'
            }`} />
            <input
              id="login-password"
              maxLength={20}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={handlePasswordChange}
              onBlur={() => handleBlur('password')}
              className={`w-full pl-11 pr-12 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-all duration-500 placeholder:opacity-25 ${
                validationErrors.password && touched.password ? 'ring-1 ring-red-500/30' : ''
              }`}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'var(--theme-text-primary)',
              }}
              placeholder={t('login.passwordPlaceholder')}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 transition-colors" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.4 }} />
              ) : (
                <Eye className="w-4 h-4 transition-colors" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.4 }} />
              )}
            </button>
          </div>
          {validationErrors.password && touched.password && (
            <div role="alert" className="flex items-center gap-1.5 mt-1.5 animate-fade-in">
              <AlertCircle className="w-3 h-3" style={{ color: 'var(--semantic-expense)', opacity: 0.8 }} />
              <p className="text-[10px] font-medium" style={{ color: 'var(--semantic-expense)', opacity: 0.8 }}>{validationErrors.password}</p>
            </div>
          )}
        </div>

        {/* Turnstile Bot Verification */}
        <div className="flex justify-center">
          <TurnstileWidget
            onVerify={(token) => { setTurnstileToken(token); setTurnstileError(false); }}
            onError={() => { setTurnstileToken(null); setTurnstileError(true); }}
            onExpire={() => { setTurnstileToken(null); }}
          />
        </div>
        {turnstileError && (
          <div role="alert" className="flex items-center gap-1.5 animate-fade-in">
            <AlertCircle className="w-3 h-3" style={{ color: 'var(--semantic-expense)', opacity: 0.8 }} />
            <p className="text-[10px] font-medium" style={{ color: 'var(--semantic-expense)', opacity: 0.8 }}>
              {t('login.pleaseCompleteVerification')}
            </p>
          </div>
        )}

        {/* Forgot Password */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => { setIsResetMode(true); setLocalError(null); clearError(); }}
            className="text-[11px] font-medium transition-colors duration-300 hover:opacity-80"
            style={{ color: 'var(--theme-primary)' }}
          >
            {t('login.forgotPassword')}
          </button>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 rounded-2xl text-sm font-medium flex items-center justify-center gap-2.5 transition-all duration-500 hover:-translate-y-1 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'var(--theme-primary)',
            color: '#FFFFFF',
            boxShadow: '0 8px 32px -8px var(--theme-primary), 0 0 60px -10px var(--theme-primary)'
          }}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-4 h-4" strokeWidth={2} />
              {t('login.signIn')}
            </>
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
          <span className="text-[10px] font-medium tracking-[0.04em] uppercase" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>
            {t('login.orContinueWith')}
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
        </div>

        {/* Google Login */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full py-3.5 rounded-2xl text-sm font-medium flex items-center justify-center gap-2.5 transition-all duration-500 hover:-translate-y-1 active:scale-95"
          style={{
            backgroundColor: '#FFFFFF',
            color: '#1F1F1F',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 4px 16px -4px rgba(0,0,0,0.1)',
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {t('login.googleSignIn')}
        </button>

        {/* Credential Error */}
        {localError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-4 rounded-[1.25rem] animate-fade-in"
            style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--semantic-expense)' }} />
            <div className="flex-1">
              <p className="text-xs font-medium" style={{ color: 'var(--semantic-expense)', opacity: 0.85 }}>{localError}</p>
              <p className="text-[10px] font-medium mt-1" style={{ color: 'var(--semantic-expense)', opacity: 0.6 }}>
                {t('login.errorHelpText')}
              </p>
            </div>
          </div>
        )}
      </div>
    </form>
  );
};