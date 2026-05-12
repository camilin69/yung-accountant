// pages/Profile/EditProfileModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Calendar, Building2, Briefcase, Save, AlertCircle, ArrowLeft, Loader2, User, MapPin, Link, FileText, Camera } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', age: 18,
    clientId: '', role: '', bio: '', location: '', website: '',
  });

  const [errors, setErrors] = useState({
    firstName: '', lastName: '', email: '', age: '', clientId: '', role: '',
  });
  const [touched, setTouched] = useState({
    firstName: false, lastName: false, email: false, age: false, clientId: false, role: false,
  });

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
      setProfileImagePreview(cachedUser.profilePic || null);
      setImageFile(null);

      if (clients.length === 0 && !metaLoading) loadClients();
      if (roles.length === 0 && !metaLoading) loadRoles();
    }
  }, [isOpen, cachedUser]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setToastMessage('La imagen es demasiado grande. Maximo 5MB');
      setToastType('error');
      setShowToast(true);
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setToastMessage('Solo se permiten formatos JPG, PNG y WebP');
      setToastType('error');
      setShowToast(true);
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setProfileImagePreview(event.target?.result as string);
    reader.readAsDataURL(file);
  };

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

  const validateFirstName = (v: string) => !v ? 'El nombre es requerido' : v.length < 2 ? 'Minimo 2 caracteres' : '';
  const validateLastName = (v: string) => !v ? 'El apellido es requerido' : v.length < 2 ? 'Minimo 2 caracteres' : '';
  const validateEmail = (v: string) => !v ? 'El email es requerido' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Formato invalido' : '';
  const validateAge = (v: number) => !v ? 'La edad es requerida' : v < 10 ? 'Minimo 10 anos' : v > 120 ? 'Edad invalida' : '';
  const validateClientId = (v: string) => !v ? 'Selecciona un municipio' : '';
  const validateRole = (v: string) => !v ? 'Selecciona un rol' : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'age' ? (parseInt(value) || 0) : value }));
    if (touched[name as keyof typeof touched]) {
      let error = '';
      switch (name) {
        case 'firstName': error = validateFirstName(value); break;
        case 'lastName': error = validateLastName(value); break;
        case 'email': error = validateEmail(value); break;
        case 'age': error = validateAge(parseInt(value) || 0); break;
      }
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: name === 'clientId' ? validateClientId(value) : validateRole(value) }));
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    let error = '';
    switch (field) {
      case 'firstName': error = validateFirstName(formData.firstName); break;
      case 'lastName': error = validateLastName(formData.lastName); break;
      case 'email': error = validateEmail(formData.email); break;
      case 'age': error = validateAge(formData.age); break;
      case 'clientId': error = validateClientId(formData.clientId); break;
      case 'role': error = validateRole(formData.role); break;
    }
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fe = validateFirstName(formData.firstName);
    const le = validateLastName(formData.lastName);
    const ee = validateEmail(formData.email);
    const ae = validateAge(formData.age);
    const ce = validateClientId(formData.clientId);
    const re = validateRole(formData.role);

    if (fe || le || ee || ae || ce || re) {
      setErrors({ firstName: fe, lastName: le, email: ee, age: ae, clientId: ce, role: re });
      setTouched({ firstName: true, lastName: true, email: true, age: true, clientId: true, role: true });
      return;
    }

    setIsLoading(true);

    try {
      let profilePicUrl = cachedUser?.profilePic;

      if (imageFile) {
        setUploadingImage(true);
        // Convertir imagen a base64 para enviar al backend
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(imageFile);
        });
        profilePicUrl = base64; // El backend procesa el upload firmado
        setUploadingImage(false);
      }

      const oldRole = cachedUser?.role;

      await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        age: formData.age,
        clientId: formData.clientId,
        role: formData.role,
        bio: formData.bio,
        location: formData.location,
        website: formData.website,
        profilePic: profilePicUrl,
      });

      await loadUserProfile(true);

      if (oldRole !== formData.role) {
        setThemeByRole(formData.role);
      }

      setToastMessage('Perfil actualizado exitosamente');
      setToastType('success');
      setShowToast(true);

      setTimeout(() => { onClose(); if (onSuccess) onSuccess(); }, 1500);
    } catch (error: any) {
      setToastMessage(error.message || 'Error al actualizar el perfil');
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsLoading(false);
      setUploadingImage(false);
    }
  };

  if (!isOpen) return null;

  const isLoadingData = (!cachedUser && userLoading) || ((clients.length === 0 && roles.length === 0) && metaLoading && !isMetaLoaded);
  if (isLoadingData) {
    return (
      <div className="fixed inset-0 modal-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-xl p-12 text-center">
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
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors lg:hidden">
                  <ArrowLeft className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
                </button>
                <div>
                  <h3 className="text-lg font-light text-[var(--theme-text-primary)]">Editar Perfil</h3>
                  <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 font-light">Actualiza tu informacion personal</p>
                </div>
              </div>
              <button onClick={onClose} className="hidden lg:block p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors">
                <X className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto modal-scroll">
            <div className="p-5 space-y-5">
              <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-5">
                {/* Avatar Upload */}
                <div className="flex items-center gap-4 p-4 bg-[var(--theme-background-glass)] rounded-xl border border-[var(--theme-border-light)]">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    {profileImagePreview ? (
                      <img src={profileImagePreview} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-[var(--theme-border-light)]" />
                    ) : (
                      <Avatar user={cachedUser} size="xl" />
                    )}
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                    {uploadingImage && (
                      <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} className="hidden" />
                  <div className="flex-1">
                    <p className="text-sm font-light text-[var(--theme-text-primary)]">
                      {cachedUser?.displayName || `${cachedUser?.firstName} ${cachedUser?.lastName}`}
                    </p>
                    <p className="text-xs text-[var(--theme-text-tertiary)]">@{cachedUser?.username}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-[var(--theme-primary)] hover:underline">
                        {profileImagePreview && profileImagePreview !== cachedUser?.profilePic ? 'Cambiar foto' : 'Agregar foto de perfil'}
                      </button>
                      {imageFile && (
                        <button type="button" onClick={() => { setProfileImagePreview(cachedUser?.profilePic || null); setImageFile(null); }} className="text-xs text-red-500 hover:underline">
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nombre y Apellido */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Nombre <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-tertiary)]" />
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} onBlur={() => handleBlur('firstName')}
                        className={`w-full pl-10 pr-4 py-2.5 bg-[var(--theme-background-glass)] border rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none transition-all ${errors.firstName && touched.firstName ? 'border-red-500/50' : 'border-[var(--theme-border-light)] focus:border-[var(--theme-primary)]/50'}`}
                        placeholder="Nombre" />
                    </div>
                    {errors.firstName && touched.firstName && <div className="flex items-center gap-1 mt-1.5"><AlertCircle className="w-3 h-3 text-red-500" /><p className="text-[10px] text-red-500/80">{errors.firstName}</p></div>}
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Apellido <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-tertiary)]" />
                      <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} onBlur={() => handleBlur('lastName')}
                        className={`w-full pl-10 pr-4 py-2.5 bg-[var(--theme-background-glass)] border rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none transition-all ${errors.lastName && touched.lastName ? 'border-red-500/50' : 'border-[var(--theme-border-light)] focus:border-[var(--theme-primary)]/50'}`}
                        placeholder="Apellido" />
                    </div>
                    {errors.lastName && touched.lastName && <div className="flex items-center gap-1 mt-1.5"><AlertCircle className="w-3 h-3 text-red-500" /><p className="text-[10px] text-red-500/80">{errors.lastName}</p></div>}
                  </div>
                </div>

                {/* Email - Solo lectura */}
                <div>
                  <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Email <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-tertiary)]" />
                    <input type="email" name="email" value={formData.email} disabled
                      className="w-full pl-10 pr-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-tertiary)] text-sm font-light cursor-not-allowed" />
                  </div>
                  <p className="text-[10px] text-[var(--theme-text-tertiary)] mt-1">El email no se puede cambiar.</p>
                </div>

                {/* Edad */}
                <div>
                  <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Edad <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-tertiary)]" />
                    <input type="number" name="age" value={formData.age} onChange={handleChange} onBlur={() => handleBlur('age')} min={10} max={120}
                      className={`w-full pl-10 pr-4 py-2.5 bg-[var(--theme-background-glass)] border rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none transition-all ${errors.age && touched.age ? 'border-red-500/50' : 'border-[var(--theme-border-light)] focus:border-[var(--theme-primary)]/50'}`}
                      placeholder="Edad" />
                  </div>
                  {errors.age && touched.age && <div className="flex items-center gap-1 mt-1.5"><AlertCircle className="w-3 h-3 text-red-500" /><p className="text-[10px] text-red-500/80">{errors.age}</p></div>}
                </div>

                {/* Client Select */}
                <CustomSelect label="Municipio / Entidad" value={formData.clientId} onChange={(value) => handleSelectChange('clientId', value)}
                  options={clientOptions} placeholder="Selecciona tu municipio" required
                  error={errors.clientId && touched.clientId ? errors.clientId : undefined} />

                {/* Role Select */}
                <div className="p-3 bg-[var(--theme-primary)]/10 rounded-lg border border-[var(--theme-primary)]/20">
                  <p className="text-xs text-[var(--theme-primary)] mb-2 flex items-center gap-2">
                    <Briefcase className="w-3 h-3" />
                    Cambiar tu rol cambia el tema completo de la aplicacion
                  </p>
                  <CustomSelect label="Rol / Ocupacion" value={formData.role} onChange={(value) => handleSelectChange('role', value)}
                    options={roleOptions} placeholder="Selecciona tu rol" required
                    error={errors.role && touched.role ? errors.role : undefined} />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Biografia</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-[var(--theme-text-tertiary)]" />
                    <textarea name="bio" value={formData.bio} onChange={handleChange} rows={3}
                      className="w-full pl-10 pr-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50 resize-none"
                      placeholder="Cuentanos sobre ti..." />
                  </div>
                </div>

                {/* Ubicacion */}
                <div>
                  <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Ubicacion</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-tertiary)]" />
                    <input type="text" name="location" value={formData.location} onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50"
                      placeholder="Ciudad, Pais" />
                  </div>
                </div>

                {/* Sitio web */}
                <div>
                  <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Sitio web</label>
                  <div className="relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-tertiary)]" />
                    <input type="url" name="website" value={formData.website} onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50"
                      placeholder="https://..." />
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-b-xl">
            <div className="flex gap-3 p-5 border-t border-[var(--theme-border-light)]">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-tertiary)] text-sm font-light transition-all">
                Cancelar
              </button>
              <button type="submit" form="edit-profile-form" disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-dark)] rounded-lg text-white text-sm font-light flex items-center justify-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-50">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Guardar Cambios</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ToastNotification isOpen={showToast} onClose={() => setShowToast(false)} message={toastMessage} type={toastType} />
    </>
  );
};