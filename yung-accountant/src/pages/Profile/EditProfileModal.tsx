// pages/Profile/EditProfileModal.tsx
import React, { useState } from 'react';
import { X, Mail, Calendar, Building2, Briefcase, Save, AlertCircle, ArrowLeft } from 'lucide-react';
import { useUserStore } from '../../store';
import { useTheme } from '../../hooks/useTheme';
import { RegisterNativeSelect } from '../Register/RegisterNativeSelect';
import ToastNotification from '../../components/common/ToastNotification';
import { Avatar } from '../../components/common/Avatar';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, setUser, clients, roles } = useUserStore();
  const { setThemeByRole } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    age: user?.age || 18,
    clientId: user?.clientId || '',
    role: user?.role || '',
    bio: user?.bio || '',
    location: user?.location || '',
    website: user?.website || '',
  });

  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    age: '',
    clientId: '',
    role: '',
  });

  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    age: false,
    clientId: false,
    role: false,
  });

  // Opciones para selects
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

  const validateFirstName = (value: string) => {
    if (!value) return 'First name is required';
    if (value.length < 2) return 'Must be at least 2 characters';
    return '';
  };

  const validateLastName = (value: string) => {
    if (!value) return 'Last name is required';
    if (value.length < 2) return 'Must be at least 2 characters';
    return '';
  };

  const validateEmail = (value: string) => {
    if (!value) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Invalid email format';
    return '';
  };

  const validateAge = (value: number) => {
    if (!value) return 'Age is required';
    if (value < 18) return 'Must be at least 18 years old';
    if (value > 120) return 'Invalid age';
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const parsedValue = name === 'age' ? parseInt(value) || 0 : value;
    setFormData(prev => ({ ...prev, [name]: parsedValue }));
    
    if (touched[name as keyof typeof touched]) {
      let error = '';
      switch (name) {
        case 'firstName':
          error = validateFirstName(value);
          break;
        case 'lastName':
          error = validateLastName(value);
          break;
        case 'email':
          error = validateEmail(value);
          break;
        case 'age':
          error = validateAge(parseInt(value) || 0);
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
      case 'firstName':
        error = validateFirstName(formData.firstName);
        break;
      case 'lastName':
        error = validateLastName(formData.lastName);
        break;
      case 'email':
        error = validateEmail(formData.email);
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
    }
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const firstNameError = validateFirstName(formData.firstName);
    const lastNameError = validateLastName(formData.lastName);
    const emailError = validateEmail(formData.email);
    const ageError = validateAge(formData.age);
    const clientIdError = validateClientId(formData.clientId);
    const roleError = validateRole(formData.role);
    
    if (firstNameError || lastNameError || emailError || ageError || clientIdError || roleError) {
      setErrors({
        firstName: firstNameError,
        lastName: lastNameError,
        email: emailError,
        age: ageError,
        clientId: clientIdError,
        role: roleError,
      });
      setTouched({
        firstName: true,
        lastName: true,
        email: true,
        age: true,
        clientId: true,
        role: true,
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const oldRole = user?.role;
      const newRole = formData.role;
      const roleChanged = oldRole !== newRole;
      
      if (user) {
        const updatedUser = {
          ...user,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          age: formData.age,
          clientId: formData.clientId,
          role: formData.role,
          bio: formData.bio,
          location: formData.location,
          website: formData.website,
          displayName: `${formData.firstName} ${formData.lastName}`,
        };
        setUser(updatedUser);
      }
      
      if (roleChanged) {
        setThemeByRole(formData.role);
      }
      
      setToastMessage(roleChanged 
        ? `Profile updated! Theme changed to ${formData.role.charAt(0).toUpperCase() + formData.role.slice(1).replace('-', ' ')} mode.`
        : 'Profile updated successfully!');
      setToastType('success');
      setShowToast(true);
      
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (error) {
      setToastMessage('Error updating profile');
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[var(--theme-background-glass)] backdrop-blur-xl border border-[var(--theme-border-light)] rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
          {/* Header - estilo GoalDetailModal */}
          <div className="sticky top-0 z-10">
            <div className="flex justify-between items-center p-5 border-b border-[var(--theme-border-light)] bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-t-xl">
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors">
                  <ArrowLeft className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
                </button>
                <div>
                  <h3 className="text-lg font-light text-[var(--theme-text-primary)]">Edit Profile</h3>
                  <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 font-light">
                    Update your personal information and role
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors"
              >
                <X className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-5">
              <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-5">
                {/* Avatar Preview */}
                <div className="flex items-center gap-4 p-4 bg-[var(--theme-background-glass)] rounded-xl border border-[var(--theme-border-light)]">
                  <Avatar user={user} size="xl" />
                  <div>
                    <p className="text-sm font-light text-[var(--theme-text-primary)]">{user?.displayName || `${user?.firstName} ${user?.lastName}`}</p>
                    <p className="text-xs text-[var(--theme-text-tertiary)]">@{user?.username}</p>
                    <button className="mt-2 text-xs text-[var(--theme-primary)] hover:underline">
                      Change Avatar
                    </button>
                  </div>
                </div>

                {/* Nombre y Apellido */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      onBlur={() => handleBlur('firstName')}
                      className={`w-full px-4 py-2.5 bg-[var(--theme-background-glass)] border rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:bg-[var(--theme-background-glass-hover)] transition-all duration-300 ${
                        errors.firstName && touched.firstName
                          ? 'border-red-500/50'
                          : 'border-[var(--theme-border-light)] focus:border-[var(--theme-primary)]/50'
                      }`}
                      placeholder="First name"
                    />
                    {errors.firstName && touched.firstName && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <AlertCircle className="w-3 h-3 text-red-500" />
                        <p className="text-[10px] text-red-500/80">{errors.firstName}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      onBlur={() => handleBlur('lastName')}
                      className={`w-full px-4 py-2.5 bg-[var(--theme-background-glass)] border rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:bg-[var(--theme-background-glass-hover)] transition-all duration-300 ${
                        errors.lastName && touched.lastName
                          ? 'border-red-500/50'
                          : 'border-[var(--theme-border-light)] focus:border-[var(--theme-primary)]/50'
                      }`}
                      placeholder="Last name"
                    />
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
                  <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-tertiary)]" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={() => handleBlur('email')}
                      className={`w-full pl-10 pr-4 py-2.5 bg-[var(--theme-background-glass)] border rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:bg-[var(--theme-background-glass-hover)] transition-all duration-300 ${
                        errors.email && touched.email
                          ? 'border-red-500/50'
                          : 'border-[var(--theme-border-light)] focus:border-[var(--theme-primary)]/50'
                      }`}
                      placeholder="your@email.com"
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
                  <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">
                    Age <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-tertiary)]" />
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      onBlur={() => handleBlur('age')}
                      className={`w-full pl-10 pr-4 py-2.5 bg-[var(--theme-background-glass)] border rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:bg-[var(--theme-background-glass-hover)] transition-all duration-300 ${
                        errors.age && touched.age
                          ? 'border-red-500/50'
                          : 'border-[var(--theme-border-light)] focus:border-[var(--theme-primary)]/50'
                      }`}
                      placeholder="Age"
                      min={18}
                      max={120}
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
                <div className="p-3 bg-[var(--theme-primary)]/10 rounded-lg border border-[var(--theme-primary)]/20">
                  <p className="text-xs text-[var(--theme-primary)] mb-2 flex items-center gap-2">
                    <Briefcase className="w-3 h-3" />
                    Changing your role changes the entire app theme
                  </p>
                  <RegisterNativeSelect
                    label="Rol / Ocupación"
                    value={formData.role}
                    onChange={(value) => handleSelectChange('role', value)}
                    options={roleOptions}
                    placeholder="Select your role"
                    error={errors.role && touched.role ? errors.role : undefined}
                    required
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Bio</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50 resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50"
                    placeholder="City, Country"
                  />
                </div>

                {/* Website */}
                <div>
                  <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Website</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50"
                    placeholder="https://..."
                  />
                </div>
              </form>
            </div>
          </div>

          {/* Footer - estilo GoalDetailModal */}
          <div className="sticky bottom-0 bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-b-xl">
            <div className="flex gap-3 p-5 border-t border-[var(--theme-border-light)]">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-[var(--theme-background-glass-hover)] hover:bg-[var(--theme-background-glass-hover)]/80 rounded-lg text-[var(--theme-text-tertiary)] text-sm font-light transition-all duration-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-profile-form"
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-dark)] rounded-lg text-white text-sm font-light flex items-center justify-center gap-2 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ToastNotification
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </>
  );
};