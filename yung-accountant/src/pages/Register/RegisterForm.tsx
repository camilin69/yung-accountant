// pages/Register/RegisterForm.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store';
import { Lock, Mail, User, Eye, EyeOff, AlertCircle, Building2, Briefcase, Calendar, UserPlus } from 'lucide-react';
import { RegisterNativeSelect } from './RegisterNativeSelect';
import { useMetaInit } from '../../hooks/useMetaInit';
import { useTranslation } from '../../i18n';
import TurnstileWidget from '../../components/common/TurnstileWidget';

export const RegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { register, isLoading: storeLoading } = useUserStore();
  const { clients, roles, isLoaded } = useMetaInit();

  // Pre-fill from Google OAuth redirect
  const params = new URLSearchParams(window.location.search);
  const fromGoogle = params.get('fromGoogle') === 'true';
  const googleEmail = params.get('email') || '';
  const googleFirstName = params.get('firstName') || '';
  const googleLastName = params.get('lastName') || '';
  const googleIdToken = params.get('googleIdToken') || '';
  const keycloakId = params.get('keycloakId') || '';

  const [formData, setFormData] = useState({
    email: googleEmail,
    firstName: googleFirstName,
    lastName: googleLastName,
    age: 18,
    clientId: '',
    role: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({
    email: false,
    firstName: false,
    lastName: false,
    age: false,
    clientId: false,
    role: false,
    password: false,
    confirmPassword: false
  });
  const [errors, setErrors] = useState({
    email: '',
    firstName: '',
    lastName: '',
    age: '',
    clientId: '',
    role: '',
    password: '',
    confirmPassword: '',
    general: ''
  });
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState(false);

  // Opciones para CustomSelect
  const clientOptions = clients.map(client => ({
    id: client.id,
    label: client.name,
    icon: <Building2 className="w-4 h-4" />
  }));

  const roleOptions = roles.map(role => ({
    id: role.id,
    label: role.name.charAt(0).toUpperCase() + role.name.slice(1).replace('-', ' '),
    icon: <Briefcase className="w-4 h-4" />
  }));

  const validateEmail = (value: string) => {
    if (!value) return t('register.emailRequired');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return t('register.emailInvalid');
    return '';
  };

  const validateFirstName = (value: string) => {
    if (!value) return t('register.firstNameRequired');
    if (value.length < 2) return t('register.firstNameMinLength');
    if (!/^[a-zA-ZáéíóúñÑ\s]+$/.test(value)) return t('register.firstNameLetters');
    return '';
  };

  const validateLastName = (value: string) => {
    if (!value) return t('register.lastNameRequired');
    if (value.length < 2) return t('register.lastNameMinLength');
    if (!/^[a-zA-ZáéíóúñÑ\s]+$/.test(value)) return t('register.lastNameLetters');
    return '';
  };

  const validateAge = (value: number) => {
    if (!value) return t('register.ageRequired');
    if (value < 10) return t('register.ageMin');
    if (value > 120) return t('register.ageValid');
    return '';
  };

  const validateClientId = (value: string) => {
    if (!value) return t('register.selectClient');
    return '';
  };

  const validateRole = (value: string) => {
    if (!value) return t('register.selectRole');
    return '';
  };

  const validatePassword = (value: string) => {
    if (!value) return t('register.passwordMinLength6');
    if (value.length < 6) return t('register.passwordMinLength6');
    if (value.length > 50) return t('register.passwordMaxLength');
    return '';
  };

  const validateConfirmPassword = (value: string) => {
    if (!value) return t('register.confirmPasswordRequired');
    if (value !== formData.password) return t('register.passwordsMismatch');
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const parsedValue = name === 'age' ? parseInt(value) || 0 : value;
    setFormData(prev => ({ ...prev, [name]: parsedValue }));
    
    if (touched[name as keyof typeof touched]) {
      let error = '';
      switch (name) {
        case 'email':
          error = validateEmail(value);
          break;
        case 'firstName':
          error = validateFirstName(value);
          break;
        case 'lastName':
          error = validateLastName(value);
          break;
        case 'age':
          error = validateAge(parseInt(value) || 0);
          break;
        case 'password':
          error = validatePassword(value);
          if (touched.confirmPassword && formData.confirmPassword) {
            setErrors(prev => ({ 
              ...prev, 
              confirmPassword: validateConfirmPassword(formData.confirmPassword) 
            }));
          }
          break;
        case 'confirmPassword':
          error = validateConfirmPassword(value);
          break;
      }
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setTouched(prev => ({ ...prev, [name]: true }));
    
    let error = '';
    if (name === 'clientId') {
      error = validateClientId(value);
    } else if (name === 'role') {
      error = validateRole(value);
    }
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    let error = '';
    switch (field) {
      case 'email':
        error = validateEmail(formData.email);
        break;
      case 'firstName':
        error = validateFirstName(formData.firstName);
        break;
      case 'lastName':
        error = validateLastName(formData.lastName);
        break;
      case 'age':
        error = validateAge(formData.age);
        break;
      case 'clientId':
        error = validateClientId(formData.clientId);
        break;
      case 'role':
        error = validateRole(formData.role);
        break;
      case 'password':
        error = validatePassword(formData.password);
        if (touched.confirmPassword && formData.confirmPassword) {
          setErrors(prev => ({ 
            ...prev, 
            confirmPassword: validateConfirmPassword(formData.confirmPassword) 
          }));
        }
        break;
      case 'confirmPassword':
        error = validateConfirmPassword(formData.confirmPassword);
        break;
    }
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setTouched({
      email: true,
      firstName: true,
      lastName: true,
      age: true,
      clientId: true,
      role: true,
      password: true,
      confirmPassword: true
    });
    
    const emailError = validateEmail(formData.email);
    const firstNameError = validateFirstName(formData.firstName);
    const lastNameError = validateLastName(formData.lastName);
    const ageError = validateAge(formData.age);
    const clientIdError = validateClientId(formData.clientId);
    const roleError = validateRole(formData.role);
    const passwordError = validatePassword(formData.password);
    const confirmPasswordError = validateConfirmPassword(formData.confirmPassword);
    
    setErrors({
      email: emailError,
      firstName: firstNameError,
      lastName: lastNameError,
      age: ageError,
      clientId: clientIdError,
      role: roleError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
      general: ''
    });
    
    if (emailError || firstNameError || lastNameError || ageError || clientIdError || roleError || passwordError || confirmPasswordError) {
      return;
    }

    if (!turnstileToken) {
      setTurnstileError(true);
      return;
    }

    setIsLoading(true);
    try {
      await register({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        age: formData.age,
        clientId: formData.clientId,
        role: formData.role,
        password: formData.password,
        googleIdToken: googleIdToken || undefined,
        keycloakId: keycloakId || undefined,
      }, turnstileToken);
      navigate('/dashboard');
    } catch (error) {
      setErrors(prev => ({ 
        ...prev, 
        general: (error as Error).message || t('register.registrationFailed')
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Mostrar loading solo mientras carga y no hay datos
  if (storeLoading && clients.length === 0 && roles.length === 0 && !isLoaded) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-2 border-[var(--theme-text-tertiary)]/20 border-t-[var(--theme-primary)] rounded-full animate-spin" />
      </div>
    );
  }

  // Si hay error o no hay datos después de cargar
  if (!storeLoading && (clients.length === 0 || roles.length === 0)) {
    return (
      <div className="rounded-[2.5rem] p-8" style={{
        background: 'rgba(255,255,255,0.025)',
        backdropFilter: 'blur(60px) saturate(2)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 24px 64px -16px rgba(0,0,0,0.4)',
      }}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#EF4444', opacity: 0.6 }} />
          <p className="text-sm font-medium" style={{ color: '#EF4444' }}>{t('register.loadError')}</p>
          <button
            className="mt-4 px-4 py-2 rounded-2xl text-sm font-medium transition-all duration-300 hover:-translate-y-0.5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--theme-primary)' }}
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  // Renderizar formulario
  return (
    <form onSubmit={handleSubmit} className="rounded-[2.5rem] p-6 sm:p-8" style={{
      background: 'rgba(255,255,255,0.025)',
      backdropFilter: 'blur(60px) saturate(2)',
      WebkitBackdropFilter: 'blur(60px) saturate(2)',
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: '0 24px 64px -16px rgba(0,0,0,0.4), 0 0 80px -20px var(--theme-primary)',
    }}>
      <div className="space-y-4">
        {/* Nombre y Apellido */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
              {t('register.firstName')}
            </label>
            <div className="relative group">
              <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300 ${
                errors.firstName && touched.firstName ? 'text-red-500' : 'text-[var(--theme-text-tertiary)] opacity-40 group-focus-within:opacity-80'
              }`} />
              <input
                maxLength={20}
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                onBlur={() => handleBlur('firstName')}
                className={`w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-all duration-500 placeholder:opacity-25 ${
                  errors.firstName && touched.firstName ? 'ring-1 ring-red-500/30' : ''
                }`}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'var(--theme-text-primary)',
                }}
                placeholder={t('register.firstNamePlaceholder')}
              />
            </div>
            {errors.firstName && touched.firstName && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <AlertCircle className="w-3 h-3" style={{ color: '#EF4444', opacity: 0.8 }} />
                <p className="text-[10px] font-medium" style={{ color: '#EF4444', opacity: 0.8 }}>{errors.firstName}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
              {t('register.lastName')}
            </label>
            <div className="relative group">
              <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300 ${
                errors.lastName && touched.lastName ? 'text-red-500' : 'text-[var(--theme-text-tertiary)] opacity-40 group-focus-within:opacity-80'
              }`} />
              <input
                maxLength={20}
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                onBlur={() => handleBlur('lastName')}
                className={`w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-all duration-500 placeholder:opacity-25 ${
                  errors.lastName && touched.lastName ? 'ring-1 ring-red-500/30' : ''
                }`}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'var(--theme-text-primary)',
                }}
                placeholder={t('register.lastNamePlaceholder')}
              />
            </div>
            {errors.lastName && touched.lastName && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <AlertCircle className="w-3 h-3" style={{ color: '#EF4444', opacity: 0.8 }} />
                <p className="text-[10px] font-medium" style={{ color: '#EF4444', opacity: 0.8 }}>{errors.lastName}</p>
              </div>
            )}
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
            {t('register.emailAddress')}
          </label>
          <div className="relative group">
            <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300 ${
              errors.email && touched.email ? 'text-red-500' : 'text-[var(--theme-text-tertiary)] opacity-40 group-focus-within:opacity-80'
            }`} />
            <input
              maxLength={50}
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={() => handleBlur('email')}
              disabled={fromGoogle}
              className={`w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-all duration-500 placeholder:opacity-25 ${
                errors.email && touched.email ? 'ring-1 ring-red-500/30' : ''
              } ${fromGoogle ? 'opacity-60 cursor-not-allowed' : ''}`}
              style={{
                background: fromGoogle ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'var(--theme-text-primary)',
              }}
              placeholder={t('register.emailPlaceholder')}
            />
            {fromGoogle && (
              <p className="text-[10px] font-medium mt-1" style={{ color: 'var(--theme-primary)', opacity: 0.7 }}>
                {t('register.emailVerifiedByGoogle')}
              </p>
            )}
          </div>
          {errors.email && touched.email && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <AlertCircle className="w-3 h-3" style={{ color: '#EF4444', opacity: 0.8 }} />
              <p className="text-[10px] font-medium" style={{ color: '#EF4444', opacity: 0.8 }}>{errors.email}</p>
            </div>
          )}
        </div>

        {/* Age */}
        <div>
          <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
            {t('register.age')}
          </label>
          <div className="relative group">
            <Calendar className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300 ${
              errors.age && touched.age ? 'text-red-500' : 'text-[var(--theme-text-tertiary)] opacity-40 group-focus-within:opacity-80'
            }`} />
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              onBlur={() => handleBlur('age')}
              className={`w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-all duration-500 placeholder:opacity-25 ${
                errors.age && touched.age ? 'ring-1 ring-red-500/30' : ''
              }`}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'var(--theme-text-primary)',
              }}
              placeholder={t('register.ageYourAge')}
              min={10}
              max={100}
            />
          </div>
          {errors.age && touched.age && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <AlertCircle className="w-3 h-3" style={{ color: '#EF4444', opacity: 0.8 }} />
              <p className="text-[10px] font-medium" style={{ color: '#EF4444', opacity: 0.8 }}>{errors.age}</p>
            </div>
          )}
        </div>

        {/* Client Select */}
        <RegisterNativeSelect
          label={t('register.municipio')}
          value={formData.clientId}
          onChange={(value) => handleSelectChange('clientId', value)}
          options={clientOptions}
          placeholder={t('register.municipioPlaceholder')}
          error={errors.clientId && touched.clientId ? errors.clientId : undefined}
          required
        />

        {/* Role Select */}
        <RegisterNativeSelect
          label={t('register.rol')}
          value={formData.role}
          onChange={(value) => handleSelectChange('role', value)}
          options={roleOptions}
          placeholder={t('register.rolPlaceholder')}
          error={errors.role && touched.role ? errors.role : undefined}
          required
        />

        {/* Password */}
        <div>
          <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
            {t('register.password')}
          </label>
          <div className="relative group">
            <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300 ${
              errors.password && touched.password ? 'text-red-500' : 'text-[var(--theme-text-tertiary)] opacity-40 group-focus-within:opacity-80'
            }`} />
            <input
              maxLength={20}
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={() => handleBlur('password')}
              className={`w-full pl-11 pr-12 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-all duration-500 placeholder:opacity-25 ${
                errors.password && touched.password ? 'ring-1 ring-red-500/30' : ''
              }`}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'var(--theme-text-primary)',
              }}
              placeholder={t('register.passwordPlaceholder')}
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
          {errors.password && touched.password && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <AlertCircle className="w-3 h-3" style={{ color: '#EF4444', opacity: 0.8 }} />
              <p className="text-[10px] font-medium" style={{ color: '#EF4444', opacity: 0.8 }}>{errors.password}</p>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
            {t('register.confirmPassword')}
          </label>
          <div className="relative group">
            <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300 ${
              errors.confirmPassword && touched.confirmPassword ? 'text-red-500' : 'text-[var(--theme-text-tertiary)] opacity-40 group-focus-within:opacity-80'
            }`} />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={() => handleBlur('confirmPassword')}
              className={`w-full pl-11 pr-12 py-3.5 rounded-2xl text-sm font-medium focus:outline-none transition-all duration-500 placeholder:opacity-25 ${
                errors.confirmPassword && touched.confirmPassword ? 'ring-1 ring-red-500/30' : ''
              }`}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'var(--theme-text-primary)',
              }}
              placeholder={t('register.confirmPasswordRegPlaceholder')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4 transition-colors" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.4 }} />
              ) : (
                <Eye className="w-4 h-4 transition-colors" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.4 }} />
              )}
            </button>
          </div>
          {errors.confirmPassword && touched.confirmPassword && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <AlertCircle className="w-3 h-3" style={{ color: '#EF4444', opacity: 0.8 }} />
              <p className="text-[10px] font-medium" style={{ color: '#EF4444', opacity: 0.8 }}>{errors.confirmPassword}</p>
            </div>
          )}
        </div>

        {/* Turnstile Bot Verification */}
        <div className="flex justify-center mt-2">
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
              {t('register.pleaseCompleteVerification')}
            </p>
          </div>
        )}

        {/* General Error */}
        {errors.general && (
          <div
            className="flex items-center gap-2.5 p-4 rounded-[1.25rem]"
            style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#EF4444' }} />
            <p className="text-xs font-medium" style={{ color: '#EF4444', opacity: 0.85 }}>{errors.general}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 rounded-2xl text-sm font-medium flex items-center justify-center gap-2.5 transition-all duration-500 hover:-translate-y-1 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed mt-4"
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
              <UserPlus className="w-4 h-4" strokeWidth={2} />
              {t('register.signUp')}
            </>
          )}
        </button>
      </div>
    </form>
  );
};