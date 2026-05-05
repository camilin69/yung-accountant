// pages/Login/LoginForm.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store';
import { AlertCircle, ArrowRight, Lock, Mail, Eye, EyeOff } from 'lucide-react';

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
      console.log('Error from store:', error);
      setLocalError(error.message);
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
      console.log('Submitting login for:', email);
      await login(email, password);
      console.log('Login successful, navigating...');
      navigate('/dashboard');
    } catch (err: any) {
      console.log('Login failed in component:', err);
      setLocalError(err.message || 'Invalid email or password');
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-xl">
      <div className="space-y-5">
        <div>
          <label className="block text-xs text-white/40 mb-1.5 font-light">Email Address</label>
          <div className="relative group">
            <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
              validationErrors.email && touched.email ? 'text-red-500' : 'text-white/30 group-focus-within:text-[#3B82F6]'
            }`} />
            <input
              type="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => handleBlur('email')}
              className={`w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light focus:outline-none focus:bg-white/[0.05] transition-all duration-300 ${
                validationErrors.email && touched.email
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-white/10 focus:border-[#3B82F6]/50'
              }`}
              placeholder="Enter your email"
              autoComplete="email"
            />
          </div>
          {validationErrors.email && touched.email && (
            <div className="flex items-center gap-1 mt-1.5 animate-fade-in">
              <AlertCircle className="w-3 h-3 text-red-500" />
              <p className="text-[10px] text-red-500/80">{validationErrors.email}</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1.5 font-light">Password</label>
          <div className="relative group">
            <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
              validationErrors.password && touched.password ? 'text-red-500' : 'text-white/30 group-focus-within:text-[#3B82F6]'
            }`} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={handlePasswordChange}
              onBlur={() => handleBlur('password')}
              className={`w-full pl-10 pr-10 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light focus:outline-none focus:bg-white/[0.05] transition-all duration-300 ${
                validationErrors.password && touched.password
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-white/10 focus:border-[#3B82F6]/50'
              }`}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 text-white/30 hover:text-white/60 transition-colors" />
              ) : (
                <Eye className="w-4 h-4 text-white/30 hover:text-white/60 transition-colors" />
              )}
            </button>
          </div>
          {validationErrors.password && touched.password && (
            <div className="flex items-center gap-1 mt-1.5 animate-fade-in">
              <AlertCircle className="w-3 h-3 text-red-500" />
              <p className="text-[10px] text-red-500/80">{validationErrors.password}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="text-[10px] text-white/30 hover:text-[#3B82F6] transition-colors"
          >
            Forgot Password?
          </button>
        </div>

        {/* Mostrar error de credenciales */}
        {localError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-red-500/80 font-medium">{localError}</p>
              <p className="text-[10px] text-red-500/60 mt-1">
                Please check your email and password and try again.
              </p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 bg-gradient-to-r from-[#0F172A] to-[#3B82F6] rounded-lg text-white text-sm font-light flex items-center justify-center gap-2 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 shadow-lg"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Sign In
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};