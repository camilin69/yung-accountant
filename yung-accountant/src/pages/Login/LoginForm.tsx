// pages/Login/LoginForm.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store';
import { AlertCircle, ArrowRight, Lock, Mail, Eye, EyeOff, LogIn } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { login, error, clearError } = useUserStore();
  const [email, setEmail] = useState('');
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

  // Escuchar errores del store
  useEffect(() => {
    if (error) {
      setLocalError(error);
    }
  }, [error]);

  const validateEmail = (value: string) => {
    if (!value) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (value: string) => {
    if (!value) return 'Password is required';
    if (value.length < 3) return 'Password must be at least 3 characters';
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
    
    setIsLoading(true);
    setLocalError(null);
    clearError();
    
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setLocalError(err.message || 'Invalid email or password');
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-[2.5rem] p-8 sm:p-10" style={{
      background: 'rgba(255,255,255,0.025)',
      backdropFilter: 'blur(60px) saturate(2)',
      WebkitBackdropFilter: 'blur(60px) saturate(2)',
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: '0 24px 64px -16px rgba(0,0,0,0.4), 0 0 80px -20px var(--theme-primary)',
    }}>
      <div className="space-y-5">
        {/* Email */}
        <div>
          <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
            Email Address
          </label>
          <div className="relative group">
            <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300 ${
              validationErrors.email && touched.email 
                ? 'text-red-500' 
                : 'text-[var(--theme-text-tertiary)] opacity-40 group-focus-within:opacity-80'
            }`} />
            <input
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
              placeholder="Enter your email"
              autoComplete="email"
            />
          </div>
          {validationErrors.email && touched.email && (
            <div className="flex items-center gap-1.5 mt-1.5 animate-fade-in">
              <AlertCircle className="w-3 h-3" style={{ color: '#EF4444', opacity: 0.8 }} />
              <p className="text-[10px] font-medium" style={{ color: '#EF4444', opacity: 0.8 }}>{validationErrors.email}</p>
            </div>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
            Password
          </label>
          <div className="relative group">
            <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300 ${
              validationErrors.password && touched.password 
                ? 'text-red-500' 
                : 'text-[var(--theme-text-tertiary)] opacity-40 group-focus-within:opacity-80'
            }`} />
            <input
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
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
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
            <div className="flex items-center gap-1.5 mt-1.5 animate-fade-in">
              <AlertCircle className="w-3 h-3" style={{ color: '#EF4444', opacity: 0.8 }} />
              <p className="text-[10px] font-medium" style={{ color: '#EF4444', opacity: 0.8 }}>{validationErrors.password}</p>
            </div>
          )}
        </div>

        {/* Forgot Password */}
        <div className="flex justify-end">
          <button
            type="button"
            className="text-[11px] font-medium transition-colors duration-300 hover:opacity-80"
            style={{ color: 'var(--theme-primary)' }}
          >
            Forgot Password?
          </button>
        </div>

        {/* Credential Error */}
        {localError && (
          <div 
            className="flex items-start gap-2.5 p-4 rounded-[1.25rem] animate-fade-in"
            style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
            <div className="flex-1">
              <p className="text-xs font-medium" style={{ color: '#EF4444', opacity: 0.85 }}>{localError}</p>
              <p className="text-[10px] font-medium mt-1" style={{ color: '#EF4444', opacity: 0.6 }}>
                Please check your email and password and try again.
              </p>
            </div>
          </div>
        )}

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
              Sign In
            </>
          )}
        </button>
      </div>
    </form>
  );
};