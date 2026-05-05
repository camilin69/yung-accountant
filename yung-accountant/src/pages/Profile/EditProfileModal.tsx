// pages/Profile/EditProfileModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Mail, Calendar, Building2, Briefcase, Save, AlertCircle, ArrowLeft, Loader2, User, MapPin, Link, FileText } from 'lucide-react';
import { useUserStore } from '../../store/user.store';
import { useMetaStore } from '../../store/meta.store';
import { useTheme } from '../../hooks/useTheme';
import CustomSelect from '../../components/common/CustomSelect';
import ToastNotification from '../../components/common/ToastNotification';
import { Avatar } from '../../components/common/Avatar';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user: cachedUser, updateProfile, loadUserProfile, isLoading: userLoading } = useUserStore();
  const { clients, roles, loadClients, loadRoles, isLoaded: isMetaLoaded, isLoading: metaLoading } = useMetaStore();
  const { setThemeByRole } = useTheme();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    age: 18,
    clientId: '',
    role: '',
    bio: '',
    location: '',
    website: '',
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

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen && cachedUser) {
      setFormData({
        firstName: cachedUser.firstName || '',
        lastName: cachedUser.lastName || '',
        email: cachedUser.email || '',
        age: cachedUser.age || 18,
        clientId: cachedUser.clientId || '',
        role: cachedUser.role || '',
        bio: cachedUser.bio || '',
        location: cachedUser.location || '',
        website: cachedUser.website || '',
      });
      
      // Cargar clients y roles solo si no estan en cache
      if (clients.length === 0 && !metaLoading) {
        loadClients();
      }
      if (roles.length === 0 && !metaLoading) {
        loadRoles();
      }
    }
  }, [isOpen, cachedUser, clients.length, roles.length, metaLoading, loadClients, loadRoles]);

  // Opciones para selects
  const clientOptions = clients.map(client => ({
    id: client.id,
    label: client.name,
    icon: React.createElement(Building2, { className: "w-4 h-4" })
  }));

  const roleOptions = roles.map(role => ({
    id: role.id,
    label: role.name.charAt(0).toUpperCase() + role.name.slice(1).replace('-', ' '),
    icon: React.createElement(Briefcase, { className: "w-4 h-4" })
  }));

  // Validaciones
  const validateFirstName = (value: string) => {
    if (!value) return 'El nombre es requerido';
    if (value.length < 2) return 'Debe tener al menos 2 caracteres';
    return '';
  };

  const validateLastName = (value: string) => {
    if (!value) return 'El apellido es requerido';
    if (value.length < 2) return 'Debe tener al menos 2 caracteres';
    return '';
  };

  const validateEmail = (value: string) => {
    if (!value) return 'El email es requerido';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Formato de email invalido';
    return '';
  };

  const validateAge = (value: number) => {
    if (!value) return 'La edad es requerida';
    if (value < 10) return 'Debes tener al menos 10 anos';
    if (value > 120) return 'Edad invalida';
    return '';
  };

  const validateClientId = (value: string) => {
    if (!value) return 'Por favor selecciona un municipio';
    return '';
  };

  const validateRole = (value: string) => {
    if (!value) return 'Por favor selecciona un rol';
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
    
    // Validar todos los campos
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
      const oldRole = cachedUser?.role;
      const newRole = formData.role;
      const roleChanged = oldRole !== newRole;
      
      // Actualizar perfil
      await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        age: formData.age,
        clientId: formData.clientId,
        role: formData.role,
        bio: formData.bio,
        location: formData.location,
        website: formData.website,
      });
      
      // Recargar usuario para actualizar cache
      await loadUserProfile(true);
      
      // Cambiar tema si el rol cambio
      if (roleChanged) {
        setThemeByRole(formData.role);
      }
      
      setToastMessage(roleChanged 
        ? `Perfil actualizado. El tema cambio a modo ${formData.role.charAt(0).toUpperCase() + formData.role.slice(1).replace('-', ' ')}`
        : 'Perfil actualizado exitosamente');
      setToastType('success');
      setShowToast(true);
      
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
      
    } catch (error: any) {
      setToastMessage(error.message || 'Error al actualizar el perfil');
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Solo mostrar loading si estamos cargando y no hay datos en cache
  const isLoadingData = (!cachedUser && userLoading) || 
                        ((clients.length === 0 && roles.length === 0) && metaLoading && !isMetaLoaded);

  if (isLoadingData) {
    return (
      <div className="fixed inset-0 modal-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-[var(--theme-primary)] animate-spin" />
          <p className="text-[var(--theme-text-tertiary)] text-sm font-light">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 modal-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="modal-container rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-t-xl">
            <div className="flex justify-between items-center p-5 border-b border-[var(--theme-border-light)]">
              <div className="flex items-center gap-3">
                <button 
                  onClick={onClose} 
                  className="p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors lg:hidden"
                >
                  <ArrowLeft className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
                </button>
                <div>
                  <h3 className="text-lg font-light text-[var(--theme-text-primary)]">Editar Perfil</h3>
                  <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 font-light">
                    Actualiza tu informacion personal
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="hidden lg:block p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors"
              >
                <X className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto modal-scroll">
            <div className="p-5 space-y-5">
              <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-5">
                {/* Avatar Preview */}
                <div className="flex items-center gap-4 p-4 bg-[var(--theme-background-glass)] rounded-xl border border-[var(--theme-border-light)]">
                  <Avatar user={cachedUser} size="xl" />
                  <div className="flex-1">
                    <p className="text-sm font-light text-[var(--theme-text-primary)]">
                      {cachedUser?.displayName || `${cachedUser?.firstName} ${cachedUser?.lastName}`}
                    </p>
                    <p className="text-xs text-[var(--theme-text-tertiary)]">@{cachedUser?.username}</p>
                    <p className="text-xs text-[var(--theme-text-tertiary)] mt-1">
                      Email: {cachedUser?.email}
                    </p>
                    <p className="text-xs text-[var(--theme-text-tertiary)]">
                      Miembro desde: {cachedUser?.createdAt ? new Date(cachedUser.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Nombre y Apellido */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">
                      Nombre <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-tertiary)]" />
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        onBlur={() => handleBlur('firstName')}
                        className={`w-full pl-10 pr-4 py-2.5 bg-[var(--theme-background-glass)] border rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:bg-[var(--theme-background-glass-hover)] transition-all duration-300 ${
                          errors.firstName && touched.firstName
                            ? 'border-red-500/50 focus:border-red-500'
                            : 'border-[var(--theme-border-light)] focus:border-[var(--theme-primary)]/50'
                        }`}
                        placeholder="Nombre"
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
                    <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">
                      Apellido <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-tertiary)]" />
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        onBlur={() => handleBlur('lastName')}
                        className={`w-full pl-10 pr-4 py-2.5 bg-[var(--theme-background-glass)] border rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:bg-[var(--theme-background-glass-hover)] transition-all duration-300 ${
                          errors.lastName && touched.lastName
                            ? 'border-red-500/50 focus:border-red-500'
                            : 'border-[var(--theme-border-light)] focus:border-[var(--theme-primary)]/50'
                        }`}
                        placeholder="Apellido"
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

                {/* Email - Solo lectura */}
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
                      disabled
                      className="w-full pl-10 pr-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-tertiary)] text-sm font-light cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[10px] text-[var(--theme-text-tertiary)] mt-1">
                    El email no se puede cambiar. Contacta soporte si necesitas actualizarlo.
                  </p>
                </div>

                {/* Edad */}
                <div>
                  <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">
                    Edad <span className="text-red-500">*</span>
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
                          ? 'border-red-500/50 focus:border-red-500'
                          : 'border-[var(--theme-border-light)] focus:border-[var(--theme-primary)]/50'
                      }`}
                      placeholder="Edad"
                      min={10}
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
                <CustomSelect
                  label="Municipio / Entidad"
                  value={formData.clientId}
                  onChange={(value) => handleSelectChange('clientId', value)}
                  options={clientOptions}
                  placeholder="Selecciona tu municipio"
                  required
                  error={errors.clientId && touched.clientId ? errors.clientId : undefined}
                />

                {/* Role Select */}
                <div className="p-3 bg-[var(--theme-primary)]/10 rounded-lg border border-[var(--theme-primary)]/20">
                  <p className="text-xs text-[var(--theme-primary)] mb-2 flex items-center gap-2">
                    <Briefcase className="w-3 h-3" />
                    Cambiar tu rol cambia el tema completo de la aplicacion
                  </p>
                  <CustomSelect
                    label="Rol / Ocupacion"
                    value={formData.role}
                    onChange={(value) => handleSelectChange('role', value)}
                    options={roleOptions}
                    placeholder="Selecciona tu rol"
                    required
                    error={errors.role && touched.role ? errors.role : undefined}
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">
                    Biografia
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-[var(--theme-text-tertiary)]" />
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      rows={3}
                      className="w-full pl-10 pr-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50 resize-none"
                      placeholder="Cuentanos sobre ti..."
                    />
                  </div>
                </div>

                {/* Ubicacion */}
                <div>
                  <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">
                    Ubicacion
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-tertiary)]" />
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50"
                      placeholder="Ciudad, Pais"
                    />
                  </div>
                </div>

                {/* Sitio web */}
                <div>
                  <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">
                    Sitio web
                  </label>
                  <div className="relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-tertiary)]" />
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-b-xl">
            <div className="flex gap-3 p-5 border-t border-[var(--theme-border-light)]">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-tertiary)] text-sm font-light transition-all duration-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="edit-profile-form"
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-dark)] rounded-lg text-white text-sm font-light flex items-center justify-center gap-2 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar Cambios
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