// pages/ResetPassword/index.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import Galaxy from '../../components/common/Galaxy';
import { useTranslation } from '../../i18n';
import { authService } from '../../services/auth.service';
import { AlertCircle, CheckCircle, Lock, Eye, EyeOff, ArrowLeft, KeyRound, Languages } from 'lucide-react';

const ResetPassword: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();
  useDocumentTitle('Reset Password');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [verifying, setVerifying] = useState(true);
  const [email, setEmail] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setVerifyError(t('resetPassword.tokenMissing'));
      return;
    }
    let cancelled = false;
    authService.verifyResetToken(token)
      .then((data: any) => {
        if (cancelled) return;
        if (data.valid) {
          setIsValid(true);
          setEmail(data.email || '');
        } else {
          setVerifyError(data.error || t('resetPassword.tokenInvalid'));
        }
      })
      .catch(() => {
        if (!cancelled) setVerifyError(t('resetPassword.verifyFailed'));
      })
      .finally(() => {
        if (!cancelled) setVerifying(false);
      });
    return () => { cancelled = true; };
    // Only run once on mount — language changes shouldn't re-verify
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 6) {
      setError(t('resetPassword.passwordMinLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('resetPassword.passwordsMismatch'));
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login?resetSuccess=true', { replace: true }), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.error || t('resetPassword.resetFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const formStyle = {
    background: 'rgba(255,255,255,0.025)',
    backdropFilter: 'blur(60px) saturate(2)',
    WebkitBackdropFilter: 'blur(60px) saturate(2)',
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: '0 24px 64px -16px rgba(0,0,0,0.4), 0 0 80px -20px var(--theme-primary)',
  } as const;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--theme-background-primary)' }}>
      <Galaxy />

      {/* Navbar — language only */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex justify-end items-center px-6 py-4">
        <button
          onClick={() => setLanguage(language === 'es-CO' ? 'en-US' : 'es-CO')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-300 hover:opacity-80"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--theme-text-secondary)' }}
          title={language === 'es-CO' ? 'Switch to English' : 'Cambiar a Español'}
        >
          <Languages className="w-4 h-4" strokeWidth={1.5} />
          {language === 'es-CO' ? 'EN' : 'ES'}
        </button>
      </nav>

      <div className="relative z-10 flex items-center justify-center p-4 min-h-screen">
        <div className="max-w-md w-full animate-fade-in-up">
          <div className="rounded-[2.5rem] p-8 sm:p-10" style={formStyle}>
            {verifying ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-[var(--theme-text-tertiary)]/20 border-t-[var(--theme-primary)] rounded-full animate-spin" />
              </div>
            ) : !isValid ? (
              <div className="space-y-5 text-center">
                <AlertCircle className="w-12 h-12 mx-auto" style={{ color: '#EF4444', opacity: 0.6 }} />
                <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                  {t('login.forgotPasswordTitle')}
                </h2>
                <p className="text-sm" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.6 }}>
                  {verifyError}
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-3.5 rounded-2xl text-sm font-medium flex items-center justify-center gap-2.5 transition-all duration-500 hover:-translate-y-1 active:scale-95"
                  style={{ backgroundColor: 'var(--theme-primary)', color: '#FFFFFF',
                    boxShadow: '0 8px 32px -8px var(--theme-primary), 0 0 60px -10px var(--theme-primary)' }}
                >
                  <ArrowLeft className="w-4 h-4" strokeWidth={2} />
                  {t('resetPassword.backToLogin')}
                </button>
              </div>
            ) : success ? (
              <div className="space-y-5 text-center py-8">
                <CheckCircle className="w-16 h-16 mx-auto text-green-400" />
                <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                  {t('resetPassword.successTitle')}
                </h2>
                <p className="text-sm" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.6 }}>
                  {t('resetPassword.successMessage')}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="text-center mb-2">
                  <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--theme-text-primary)' }}>
                    {t('resetPassword.title')}
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.6 }}>
                    {email}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                    {t('resetPassword.newPassword')}
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-tertiary)] opacity-40 group-focus-within:opacity-80" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      maxLength={50}
                      className="w-full pl-11 pr-12 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-all duration-500 placeholder:opacity-25"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--theme-text-primary)' }}
                      placeholder={t('resetPassword.enterNewPassword')}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors">
                      {showPassword
                        ? <EyeOff className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.4 }} />
                        : <Eye className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.4 }} />
                      }
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                    {t('resetPassword.confirmPassword')}
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-tertiary)] opacity-40 group-focus-within:opacity-80" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      maxLength={50}
                      className="w-full pl-11 pr-12 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-all duration-500 placeholder:opacity-25"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--theme-text-primary)' }}
                      placeholder={t('resetPassword.confirmNewPassword')}
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors">
                      {showConfirmPassword
                        ? <EyeOff className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.4 }} />
                        : <Eye className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.4 }} />
                      }
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-[1rem]" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#EF4444' }} />
                    <p className="text-xs font-medium" style={{ color: '#EF4444', opacity: 0.85 }}>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-2xl text-sm font-medium flex items-center justify-center gap-2.5 transition-all duration-500 hover:-translate-y-1 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--theme-primary)', color: '#FFFFFF',
                    boxShadow: '0 8px 32px -8px var(--theme-primary), 0 0 60px -10px var(--theme-primary)' }}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" strokeWidth={2} />
                      {t('resetPassword.resetButton')}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
