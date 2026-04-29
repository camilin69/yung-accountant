// components/common/Avatar.tsx
import React from 'react';

interface AvatarProps {
  user?: {
    profilePic?: string;
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

export const Avatar: React.FC<AvatarProps> = ({ user, size = 'md', className = '', onClick }) => {
  const [imageError, setImageError] = React.useState(false);
  
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

  const hasProfilePic = user?.profilePic && !imageError;

  if (hasProfilePic) {
    return (
      <img
        src={user.profilePic}
        alt={getInitials()}
        className={`${sizes[size]} rounded-full object-cover ${className} ${onClick ? 'cursor-pointer' : ''}`}
        onError={() => setImageError(true)}
        onClick={onClick}
      />
    );
  }

  return (
    <img
      src="/src/assets/no-profile-pic.svg"
      alt="Default profile"
      className={`${sizes[size]} rounded-full object-cover ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    />
  );
};