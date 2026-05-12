// components/common/Avatar.tsx
import React from 'react';

interface AvatarProps {
  user?: {
    profilePic?: string;
    avatar?: string;
    displayName?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  } | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const sizes = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
  xl: 'w-12 h-12 text-lg',
};

const FALLBACK_AVATAR = '/src/assets/no-profile-pic.svg';

export const Avatar: React.FC<AvatarProps> = ({ user, size = 'md', className = '', onClick }) => {
  const [imageError, setImageError] = React.useState(false);
  
  // Resetear error cuando cambia la imagen
  React.useEffect(() => {
    setImageError(false);
  }, [user?.avatar, user?.profilePic]);

  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName.substring(0, 2).toUpperCase();
    }
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Priorizar avatar (de Cloudinary/backend), luego profilePic
  const imageUrl = user?.avatar || user?.profilePic;
  const hasValidImage = imageUrl && !imageError;

  // Si hay una imagen válida, mostrarla
  if (hasValidImage) {
    return (
      <img
        src={imageUrl}
        alt={getInitials()}
        className={`${sizes[size]} rounded-full object-cover ${className} ${onClick ? 'cursor-pointer' : ''}`}
        onError={() => setImageError(true)}
        onClick={onClick}
        loading="lazy"
      />
    );
  }

  // Si no hay imagen o hubo error, mostrar el SVG por defecto
  return (
    <img
      src={FALLBACK_AVATAR}
      alt="Default profile"
      className={`${sizes[size]} rounded-full object-cover ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    />
  );
};