// pages/Register/RegisterForm.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store';
import { ArrowRight, Lock, Mail, User, Eye, EyeOff, AlertCircle, Building2, Briefcase, Calendar } from 'lucide-react';
import { RegisterNativeSelect } from './RegisterNativeSelect';
import { useMetaInit } from '../../hooks/useMetaInit';

export const RegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading: storeLoading } = useUserStore();
  const { clients, roles, isLoaded } = useMetaInit();
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
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
    if (!value) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Please enter a valid email address';
    return '';
  };

  const validateFirstName = (value: string) => {
    if (!value) return 'First name is required';
    if (value.length < 2) return 'First name must be at least 2 characters';
    if (!/^[a-zA-ZáéíóúñÑ\s]+$/.test(value)) return 'First name can only contain letters';
    return '';
  };

  const validateLastName = (value: string) => {
    if (!value) return 'Last name is required';
    if (value.length < 2) return 'Last name must be at least 2 characters';
    if (!/^[a-zA-ZáéíóúñÑ\s]+$/.test(value)) return 'Last name can only contain letters';
    return '';
  };

  const validateAge = (value: number) => {
    if (!value) return 'Age is required';
    if (value < 10) return 'You must be at least 10 years old';
    if (value > 120) return 'Please enter a valid age';
    return '';
  };

  const validateClientId = (value: string) => {
    if (!value) return 'Please select a client';
    return '';
  };

  const validateRole = (value: string) => {
    if (!value) return 'Please select a role';
    return '';
  };

  const validatePassword = (value: string) => {
    if (!value) return 'Password is required';
    if (value.length < 6) return 'Password must be at least 6 characters';
    if (value.length > 50) return 'Password must be less than 50 characters';
    return '';
  };

  const validateConfirmPassword = (value: string) => {
    if (!value) return 'Please confirm your password';
    if (value !== formData.password) return 'Passwords do not match';
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
      });
      navigate('/dashboard');
    } catch (error) {
      setErrors(prev => ({ 
        ...prev, 
        general: (error as Error).message || 'Registration failed. Please try again.' 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Mostrar loading solo mientras carga y no hay datos
  if (storeLoading && clients.length === 0 && roles.length === 0 && !isLoaded) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Si hay error o no hay datos después de cargar
  if (!storeLoading && (clients.length === 0 || roles.length === 0)) {
    return (
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 text-sm">Error loading necessary data</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Renderizar formulario
  return (
    <form onSubmit={handleSubmit} className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl">
      <div className="space-y-4">
        {/* Nombre y Apellido */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-white/40 mb-1.5 font-light">First Name</label>
            <div className="relative group">
              <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                errors.firstName && touched.firstName ? 'text-red-500' : 'text-white/30 group-focus-within:text-[#3B82F6]'
              }`} />
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                onBlur={() => handleBlur('firstName')}
                className={`w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light focus:outline-none focus:bg-white/[0.05] transition-all duration-300 ${
                  errors.firstName && touched.firstName
                    ? 'border-red-500/50 focus:border-red-500'
                    : 'border-white/10 focus:border-[#3B82F6]/50'
                }`}
                placeholder="First name"
              />
            </div>
            {errors.firstName && touched.firstName && (
              <div className="flex items-center gap-1 mt-1.5">
                <AlertCircle className="w-3 h-3 text-red-500" />
                <p className="text-[10px] text-red-500/80">{errors.firstName}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-white/40 mb-1.5 font-light">Last Name</label>
            <div className="relative group">
              <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                errors.lastName && touched.lastName ? 'text-red-500' : 'text-white/30 group-focus-within:text-[#3B82F6]'
              }`} />
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                onBlur={() => handleBlur('lastName')}
                className={`w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light focus:outline-none focus:bg-white/[0.05] transition-all duration-300 ${
                  errors.lastName && touched.lastName
                    ? 'border-red-500/50 focus:border-red-500'
                    : 'border-white/10 focus:border-[#3B82F6]/50'
                }`}
                placeholder="Last name"
              />
            </div>
            {errors.lastName && touched.lastName && (
              <div className="flex items-center gap-1 mt-1.5">
                <AlertCircle className="w-3 h-3 text-red-500" />
                <p className="text-[10px] text-red-500/80">{errors.lastName}</p>
              </div>
            )}
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs text-white/40 mb-1.5 font-light">Email Address</label>
          <div className="relative group">
            <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
              errors.email && touched.email ? 'text-red-500' : 'text-white/30 group-focus-within:text-[#3B82F6]'
            }`} />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={() => handleBlur('email')}
              className={`w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light focus:outline-none focus:bg-white/[0.05] transition-all duration-300 ${
                errors.email && touched.email
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-white/10 focus:border-[#3B82F6]/50'
              }`}
              placeholder="Enter your email"
            />
          </div>
          {errors.email && touched.email && (
            <div className="flex items-center gap-1 mt-1.5">
              <AlertCircle className="w-3 h-3 text-red-500" />
              <p className="text-[10px] text-red-500/80">{errors.email}</p>
            </div>
          )}
        </div>

        {/* Age */}
        <div>
          <label className="block text-xs text-white/40 mb-1.5 font-light">Age</label>
          <div className="relative group">
            <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
              errors.age && touched.age ? 'text-red-500' : 'text-white/30 group-focus-within:text-[#3B82F6]'
            }`} />
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              onBlur={() => handleBlur('age')}
              className={`w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light focus:outline-none focus:bg-white/[0.05] transition-all duration-300 ${
                errors.age && touched.age
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-white/10 focus:border-[#3B82F6]/50'
              }`}
              placeholder="Your age"
              min={10}
              max={100}
            />
          </div>
          {errors.age && touched.age && (
            <div className="flex items-center gap-1 mt-1.5">
              <AlertCircle className="w-3 h-3 text-red-500" />
              <p className="text-[10px] text-red-500/80">{errors.age}</p>
            </div>
          )}
        </div>

        {/* Client Select */}
        <RegisterNativeSelect
          label="Municipio / Entidad"
          value={formData.clientId}
          onChange={(value) => handleSelectChange('clientId', value)}
          options={clientOptions}
          placeholder="Select your municipality"
          error={errors.clientId && touched.clientId ? errors.clientId : undefined}
          required
        />

        {/* Role Select */}
        <RegisterNativeSelect
          label="Rol / Ocupación"
          value={formData.role}
          onChange={(value) => handleSelectChange('role', value)}
          options={roleOptions}
          placeholder="Select your role"
          error={errors.role && touched.role ? errors.role : undefined}
          required
        />

        {/* Password */}
        <div>
          <label className="block text-xs text-white/40 mb-1.5 font-light">Password</label>
          <div className="relative group">
            <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
              errors.password && touched.password ? 'text-red-500' : 'text-white/30 group-focus-within:text-[#3B82F6]'
            }`} />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={() => handleBlur('password')}
              className={`w-full pl-10 pr-10 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light focus:outline-none focus:bg-white/[0.05] transition-all duration-300 ${
                errors.password && touched.password
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-white/10 focus:border-[#3B82F6]/50'
              }`}
              placeholder="Create a password"
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
          {errors.password && touched.password && (
            <div className="flex items-center gap-1 mt-1.5">
              <AlertCircle className="w-3 h-3 text-red-500" />
              <p className="text-[10px] text-red-500/80">{errors.password}</p>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-xs text-white/40 mb-1.5 font-light">Confirm Password</label>
          <div className="relative group">
            <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
              errors.confirmPassword && touched.confirmPassword ? 'text-red-500' : 'text-white/30 group-focus-within:text-[#3B82F6]'
            }`} />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={() => handleBlur('confirmPassword')}
              className={`w-full pl-10 pr-10 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light focus:outline-none focus:bg-white/[0.05] transition-all duration-300 ${
                errors.confirmPassword && touched.confirmPassword
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-white/10 focus:border-[#3B82F6]/50'
              }`}
              placeholder="Confirm your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4 text-white/30 hover:text-white/60 transition-colors" />
              ) : (
                <Eye className="w-4 h-4 text-white/30 hover:text-white/60 transition-colors" />
              )}
            </button>
          </div>
          {errors.confirmPassword && touched.confirmPassword && (
            <div className="flex items-center gap-1 mt-1.5">
              <AlertCircle className="w-3 h-3 text-red-500" />
              <p className="text-[10px] text-red-500/80">{errors.confirmPassword}</p>
            </div>
          )}
        </div>

        {/* General Error */}
        {errors.general && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-xs text-red-500/80">{errors.general}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 bg-gradient-to-r from-[#0F172A] to-[#3B82F6] rounded-lg text-white text-sm font-light flex items-center justify-center gap-2 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 shadow-lg mt-4"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Create Account
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};