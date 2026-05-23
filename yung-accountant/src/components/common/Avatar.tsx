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
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const sizes = {
  xs: 'w-5 h-5 text-[8px]',
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-11 h-11 text-sm',
  xl: 'w-14 h-14 text-base',
};

const FALLBACK_AVATAR = '/src/assets/no-profile-pic.svg';

export const Avatar: React.FC<AvatarProps> = ({ user, size = 'md', className = '', onClick }) => {
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [user?.avatar, user?.profilePic]);

  const getInitials = () => {
    if (user?.displayName) return user.displayName.substring(0, 2).toUpperCase();
    if (user?.firstName && user?.lastName) return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    if (user?.username) return user.username.substring(0, 2).toUpperCase();
    return 'U';
  };

  const imageUrl = user?.avatar || user?.profilePic;
  const hasValidImage = imageUrl && !imageError;

  if (hasValidImage) {
    return (
      <img
        src={imageUrl}
        alt={getInitials()}
        className={`${sizes[size]} rounded-[1rem] object-cover transition-all duration-500 ${className} ${
          onClick ? 'cursor-pointer hover:scale-110' : ''
        }`}
        style={{ boxShadow: '0 4px 16px -4px rgba(0,0,0,0.2)' }}
        onError={() => setImageError(true)}
        onClick={onClick}
        loading="lazy"
      />
    );
  }

  return (
    <img
      src={FALLBACK_AVATAR}
      alt="Default profile"
      className={`${sizes[size]} rounded-[1rem] object-cover transition-all duration-500 ${className} ${
        onClick ? 'cursor-pointer hover:scale-110' : ''
      }`}
      style={{ boxShadow: '0 4px 16px -4px rgba(0,0,0,0.15)' }}
      onClick={onClick}
    />
  );
};