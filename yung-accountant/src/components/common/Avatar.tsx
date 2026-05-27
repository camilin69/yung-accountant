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

const DefaultAvatar: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    width="100"
    height="100"
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect width="100" height="100" rx="16" fill="#1E293B" />
    <circle cx="50" cy="40" r="20" fill="#334155" />
    <path d="M25 75 C25 65, 35 55, 50 55 C65 55, 75 65, 75 75" fill="#334155" />
    <rect x="45" y="35" width="10" height="10" rx="5" fill="#1E293B" />
    <circle cx="40" cy="35" r="2" fill="#64748B" />
    <circle cx="60" cy="35" r="2" fill="#64748B" />
  </svg>
);

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

  const sizeClass = sizes[size];
  const clickableClass = onClick ? 'cursor-pointer hover:scale-110' : '';

  if (hasValidImage) {
    return (
      <img
        src={imageUrl}
        alt={getInitials()}
        className={`${sizeClass} rounded-[1rem] object-cover transition-all duration-500 ${className} ${clickableClass}`}
        style={{ boxShadow: '0 4px 16px -4px rgba(0,0,0,0.2)' }}
        onError={() => setImageError(true)}
        onClick={onClick}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-[1rem] overflow-hidden transition-all duration-500 ${className} ${clickableClass}`}
      style={{ boxShadow: '0 4px 16px -4px rgba(0,0,0,0.15)' }}
      onClick={onClick}
      role="img"
      aria-label="Default avatar"
    >
      <DefaultAvatar className="w-full h-full" />
    </div>
  );
};