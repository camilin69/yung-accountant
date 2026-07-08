// pages/Community/UsersList.tsx
import React from 'react';
import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/common/Avatar';
import { useTranslation } from '../../i18n';

interface UsersListProps {
  users: any[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export const UsersList: React.FC<UsersListProps> = ({ users, isLoading, emptyMessage = "No users found" }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse rounded-xl p-4 glass-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full" style={{ backgroundColor: 'var(--theme-background-glass-hover)' }} />
              <div className="space-y-2">
                <div className="h-3 w-24 rounded" style={{ backgroundColor: 'var(--theme-background-glass-hover)' }} />
                <div className="h-2 w-16 rounded" style={{ backgroundColor: 'var(--theme-background-glass-hover)' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 glass-sm rounded-2xl">
        <Users className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.3 }} />
        <p className="text-sm font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {users.map(user => (
        <div key={user.id} onClick={() => navigate(`/profile/${user.username}`)}
          className="flex items-center gap-4 rounded-xl p-4 transition-all duration-300 cursor-pointer group animate-fade-in-up glass-sm hover:-translate-y-1">
          <Avatar user={user} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium transition-colors" style={{ color: 'var(--theme-text-primary)' }}>{user.displayName || user.username}</p>
            <p className="text-xs" style={{ color: 'var(--theme-text-tertiary)' }}>@{user.username}</p>
            {user.bio && <p className="text-xs mt-1 truncate" style={{ color: 'var(--theme-text-secondary)', fontWeight: 350 }}>{user.bio}</p>}
          </div>
          <div className="text-right">
            <div className="text-xs font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>{user.followersCount || 0} {t('community.followers')}</div>
            <div className="text-xs font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>{user.postsCount || 0} {t('community.posts')}</div>
          </div>
        </div>
      ))}
    </div>
  );
};