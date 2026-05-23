// pages/Profile/EditProfileModal.tsx — Brutalist Glass
import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Building2, Briefcase, Save, AlertCircle, Loader2, User, MapPin, Link, FileText, Camera, ChevronLeft } from 'lucide-react';
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

// ============================================
// AVATAR UPLOAD SECTION
// ============================================
const AvatarUpload: React.FC<{
  profileImagePreview: string | null;
  cachedUser: any;
  uploadingImage: boolean;
  imageFile: File | null;
  onSelect: () => void;
  onCancel: () => void;
}> = ({ profileImagePreview, cachedUser, uploadingImage, imageFile, onSelect, onCancel }) => (
  <div 
    className="flex items-center gap-5 p-5 backdrop-blur-xl rounded-[1.5rem] transition-all duration-500"
    style={{ 
      backgroundColor: 'var(--theme-background-glass)', 
      border: '1px solid var(--theme-border-dark)' 
    }}
  >
    <div className="relative group cursor-pointer" onClick={onSelect}>
      {profileImagePreview ? (
        <img 
          src={profileImagePreview} 
          alt="Preview" 
          className="w-20 h-20 rounded-[1.25rem] object-cover shadow-[0_4px_16px_-4px_rgba(0,0,0,0.2)]" 
        />
      ) : (
        <Avatar user={cachedUser} size="xl" className="w-20 h-20 rounded-[1.25rem]" />
      )}
      <div className="absolute inset-0 rounded-[1.25rem] bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <Camera className="w-5 h-5 text-white/80" strokeWidth={1.5} />
      </div>
      {uploadingImage && (
        <div className="absolute inset-0 rounded-[1.25rem] bg-black/60 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-white/60 animate-spin" strokeWidth={1.5} />
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[14px] font-light tracking-[0.01em] truncate" style={{ color: 'var(--theme-text-primary)' }}>
        {cachedUser?.displayName || `${cachedUser?.firstName || ''} ${cachedUser?.lastName || ''}`.trim() || 'User'}
      </p>
      <p className="text-[11px] font-light mt-0.5 tracking-[0.02em] opacity-80 truncate" style={{ color: 'var(--theme-text-tertiary)' }}>
        @{cachedUser?.username || 'anonymous'}
      </p>
      <div className="flex items-center gap-3 mt-2">
        <button 
          type="button" 
          onClick={onSelect} 
          className="cursor-pointer text-[11px] font-light tracking-[0.02em] transition-opacity duration-500 opacity-70 hover:opacity-100"
          style={{ color: 'var(--theme-primary)' }}
        >
          {profileImagePreview && profileImagePreview !== cachedUser?.profilePic ? 'Change photo' : 'Add photo'}
        </button>
        {imageFile && (
          <button 
            type="button" 
            onClick={onCancel} 
            className="text-[11px] font-light tracking-[0.02em] transition-opacity duration-500 opacity-40 hover:opacity-80"
            style={{ color: 'var(--theme-text-tertiary)' }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  </div>
);

// ============================================
// INPUT FIELD
// ============================================
const InputField: React.FC<{
  label: string;
  name: string;
  value: string | number;
  type?: string;
  placeholder?: string;
  icon: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  touched?: boolean;
  hint?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur: () => void;
  isTextarea?: boolean;
  rows?: number;
}> = ({ label, name, value, type = 'text', placeholder, icon, required, disabled, error, touched, hint, onChange, onBlur, isTextarea, rows = 3 }) => (
  <div>
    <label 
      className="block text-[11px] font-light tracking-[0.15em] uppercase mb-2 opacity-100" 
      style={{ color: 'var(--theme-text-tertiary)' }}
    >
      {label}
      {required && <span className="ml-1 opacity-55" style={{ color: 'var(--theme-primary)' }}>*</span>}
    </label>
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-100" style={{ color: 'var(--theme-text-tertiary)' }}>
        {icon}
      </div>
      {isTextarea ? (
        <textarea 
          name={name} 
          value={value as string} 
          onChange={onChange} 
          rows={rows}
          disabled={disabled}
          className={`w-full pl-11 pr-4 py-3 rounded-2xl text-[14px] font-light resize-none focus:outline-none transition-all duration-500 tracking-[0.01em] leading-relaxed placeholder:opacity-80 ${
            disabled ? 'opacity-100 cursor-not-allowed' : ''
          }`}
          style={{ 
            backgroundColor: 'var(--theme-background-glass)',
            color: disabled ? 'var(--theme-text-tertiary)' : 'var(--theme-text-secondary)',
            border: error && touched ? '1px solid rgba(248, 113, 113, 0.3)' : '1px solid var(--theme-border-dark)',
          }}
          placeholder={placeholder}
        />
      ) : (
        <input 
          type={type} 
          name={name} 
          value={value} 
          onChange={onChange} 
          onBlur={onBlur}
          disabled={disabled}
          min={type === 'number' ? 10 : undefined}
          max={type === 'number' ? 120 : undefined}
          className={`w-full pl-11 pr-4 py-3 rounded-2xl text-[14px] font-light focus:outline-none transition-all duration-500 tracking-[0.01em] placeholder:opacity-80 ${
            disabled ? 'opacity-25 cursor-not-allowed' : ''
          }`}
          style={{ 
            backgroundColor: 'var(--theme-background-glass)',
            color: disabled ? 'var(--theme-text-tertiary)' : 'var(--theme-text-secondary)',
            border: error && touched ? '1px solid rgba(248, 113, 113, 0.3)' : '1px solid var(--theme-border-dark)',
          }}
          placeholder={placeholder}
        />
      )}
    </div>
    {error && touched && (
      <div className="flex items-center gap-1.5 mt-2">
        <AlertCircle className="w-3 h-3" style={{ color: 'var(--theme-primary)', opacity: 0.7 }} strokeWidth={1.5} />
        <p className="text-[11px] font-light tracking-[0.02em] opacity-70" style={{ color: 'var(--theme-primary)' }}>{error}</p>
      </div>
    )}
    {hint && !error && (
      <p className="text-[10px] font-light mt-1.5 tracking-[0.02em] opacity-25" style={{ color: 'var(--theme-text-tertiary)' }}>{hint}</p>
    )}
  </div>
);

// ============================================
// EDIT PROFILE MODAL
// ============================================
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
      setErrors({ firstName: '', lastName: '', email: '', age: '', clientId: '', role: '' });
      setTouched({ firstName: false, lastName: false, email: false, age: false, clientId: false, role: false });

      if (clients.length === 0 && !metaLoading) loadClients();
      if (roles.length === 0 && !metaLoading) loadRoles();
    }
  }, [isOpen, cachedUser]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setToastMessage('Image too large. Maximum 5MB');
      setToastType('error');
      setShowToast(true);
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setToastMessage('Only JPG, PNG and WebP formats allowed');
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

  const validateFirstName = (v: string) => !v ? 'First name is required' : v.length < 2 ? 'Minimum 2 characters' : '';
  const validateLastName = (v: string) => !v ? 'Last name is required' : v.length < 2 ? 'Minimum 2 characters' : '';
  const validateEmail = (v: string) => !v ? 'Email is required' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Invalid format' : '';
  const validateAge = (v: number) => !v ? 'Age is required' : v < 10 ? 'Minimum 10 years' : v > 120 ? 'Invalid age' : '';
  const validateClientId = (v: string) => !v ? 'Select a municipality' : '';
  const validateRole = (v: string) => !v ? 'Select a role' : '';

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
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(imageFile);
        });
        profilePicUrl = base64;
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

      setToastMessage('Profile updated successfully');
      setToastType('success');
      setShowToast(true);

      setTimeout(() => { onClose(); if (onSuccess) onSuccess(); }, 1500);
    } catch (error: any) {
      setToastMessage(error.message || 'Error updating profile');
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
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--modal-overlay)', backdropFilter: 'blur(8px)' }}
      >
        <div 
          className="backdrop-blur-[40px] rounded-[2rem] p-12 text-center shadow-[0_20px_60px_-16px_rgba(0,0,0,0.4)]"
          style={{ backgroundColor: 'var(--theme-background-glass)', border: '1px solid var(--theme-border-dark)' }}
        >
          <Loader2 className="w-6 h-6 mx-auto mb-4 animate-spin opacity-100" strokeWidth={1.5} style={{ color: 'var(--theme-text-tertiary)' }} />
          <p className="text-[13px] font-light tracking-[0.03em] opacity-25" style={{ color: 'var(--theme-text-tertiary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--modal-overlay)', backdropFilter: 'blur(8px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div 
          className="backdrop-blur-[40px] rounded-[2rem] w-full max-w-2xl flex flex-col max-h-[90vh] shadow-[0_20px_60px_-16px_rgba(0,0,0,0.4)] overflow-hidden"
          style={{ backgroundColor: 'var(--theme-background-glass)', border: '1px solid var(--theme-border-dark)' }}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-7 pb-5">
            <div>
              <h3 className="text-[22px] font-light tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>
                Edit Profile
              </h3>
              <p className="text-[12px] font-light mt-1 tracking-[0.02em] opacity-90" style={{ color: 'var(--theme-text-tertiary)' }}>
                Update your personal information
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2.5 rounded-2xl transition-all duration-500 hover:scale-105"
              style={{ backgroundColor: 'var(--theme-background-glass-hover)' }}
            >
              <X className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-7 pb-2 modal-scroll">
            <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-7">
              {/* Avatar Upload */}
              <AvatarUpload
                profileImagePreview={profileImagePreview}
                cachedUser={cachedUser}
                uploadingImage={uploadingImage}
                imageFile={imageFile}
                onSelect={() => fileInputRef.current?.click()}
                onCancel={() => { setProfileImagePreview(cachedUser?.profilePic || null); setImageFile(null); }}
              />
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/jpeg,image/png,image/webp" 
                onChange={handleImageSelect} 
                className="hidden" 
              />

              {/* Name fields */}
              <div className="grid grid-cols-2 gap-5">
                <InputField
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  placeholder="First name"
                  icon={<User className="w-4 h-4" strokeWidth={1.5} />}
                  required
                  error={errors.firstName}
                  touched={touched.firstName}
                  onChange={handleChange}
                  onBlur={() => handleBlur('firstName')}
                />
                <InputField
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  placeholder="Last name"
                  icon={<User className="w-4 h-4" strokeWidth={1.5} />}
                  required
                  error={errors.lastName}
                  touched={touched.lastName}
                  onChange={handleChange}
                  onBlur={() => handleBlur('lastName')}
                />
              </div>

              {/* Email (readonly) */}
              <InputField
                label="Email"
                name="email"
                value={formData.email}
                icon={<Calendar className="w-4 h-4" strokeWidth={1.5} />}
                required
                disabled
                hint="Email cannot be changed"
                onChange={handleChange}
                onBlur={() => {}}
              />

              {/* Age */}
              <InputField
                label="Age"
                name="age"
                value={formData.age}
                type="number"
                placeholder="Age"
                icon={<Calendar className="w-4 h-4" strokeWidth={1.5} />}
                required
                error={errors.age}
                touched={touched.age}
                onChange={handleChange}
                onBlur={() => handleBlur('age')}
              />

              {/* Client Select */}
              <div>
                <CustomSelect 
                  label="Municipality" 
                  value={formData.clientId} 
                  onChange={(value) => handleSelectChange('clientId', value)}
                  options={clientOptions} 
                  placeholder="Select your municipality" 
                  required
                  error={errors.clientId && touched.clientId ? errors.clientId : undefined} 
                />
              </div>

              {/* Role Select */}
              <div 
                className="p-5 rounded-[1.5rem] transition-all duration-500"
                style={{ 
                  backgroundColor: 'var(--theme-background-glass-hover)', 
                  border: '1px solid var(--theme-border-dark)' 
                }}
              >
                <p 
                  className="text-[11px] font-light tracking-[0.04em] uppercase mb-4 opacity-40" 
                  style={{ color: 'var(--theme-text-tertiary)' }}
                >
                  Changing your role updates the entire application theme
                </p>
                <CustomSelect 
                  label="Role / Occupation" 
                  value={formData.role} 
                  onChange={(value) => handleSelectChange('role', value)}
                  options={roleOptions} 
                  placeholder="Select your role" 
                  required
                  error={errors.role && touched.role ? errors.role : undefined} 
                />
              </div>

              {/* Bio */}
              <InputField
                label="Bio"
                name="bio"
                value={formData.bio}
                placeholder="Tell us about yourself..."
                icon={<FileText className="w-4 h-4" strokeWidth={1.5} />}
                isTextarea
                rows={3}
                onChange={handleChange}
                onBlur={() => {}}
              />

              {/* Location */}
              <InputField
                label="Location"
                name="location"
                value={formData.location}
                placeholder="City, Country"
                icon={<MapPin className="w-4 h-4" strokeWidth={1.5} />}
                onChange={handleChange}
                onBlur={() => {}}
              />

              {/* Website */}
              <InputField
                label="Website"
                name="website"
                value={formData.website}
                type="url"
                placeholder="https://..."
                icon={<Link className="w-4 h-4" strokeWidth={1.5} />}
                onChange={handleChange}
                onBlur={() => {}}
              />
            </form>
          </div>

          {/* Footer */}
          <div 
            className="flex gap-4 p-7 pt-5"
            style={{ borderTop: '1px solid var(--theme-border-dark)' }}
          >
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 px-5 py-3.5 rounded-2xl text-[13px] font-light tracking-[0.02em] transition-all duration-500 opacity-55 hover:opacity-80"
              style={{ 
                backgroundColor: 'var(--theme-background-glass-hover)', 
                color: 'var(--theme-text-tertiary)' 
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              form="edit-profile-form" 
              disabled={isLoading}
              className="flex-1 px-5 py-3.5 rounded-2xl text-[13px] font-light tracking-[0.02em] flex items-center justify-center gap-2.5 transition-all duration-500 active:scale-[0.98] disabled:opacity-25 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: 'var(--theme-text-primary)', 
                color: 'var(--theme-background-primary)' 
              }}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
              ) : (
                <><Save className="w-4 h-4" strokeWidth={1.5} /> Save Changes</>
              )}
            </button>
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