// pages/Profile/index.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Link as LinkIcon, Calendar, Users, Heart, MessageCircle, Edit2, Mail, ChevronLeft } from 'lucide-react';
import { useUserStore, usePostStore } from '../../store';
import { useThemeStyles } from '../../hooks/useTheme';
import { formatDate } from '../../utils/formatters';
import { PostCard } from '../Community/PostCard';
import { EditProfileModal } from './EditProfileModal';
import ToastNotification from '../../components/common/ToastNotification';
import { ThemeCard } from '../../components/common/ThemeCard';
import { GradientText } from '../../components/common/GradientText';
import { Avatar } from '../../components/common/Avatar';

const Profile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser, users, followUser } = useUserStore();
  const { posts } = usePostStore();
  const { getBadgeClass, getPrimaryButtonClass } = useThemeStyles();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [activeTab, setActiveTab] = useState<'posts' | 'likes'>('posts');

  const profileUser = users.find(u => u.id === userId);
  const isOwnProfile = currentUser?.id === userId;
  const isFollowing = profileUser?.followers?.includes(currentUser?.id || '') || false;

  const userPosts = posts.filter(post => post.userId === userId);
  const likedPosts = posts.filter(post => post.likedBy?.includes(userId || ''));

  useEffect(() => {
    if (!profileUser && userId) {
      setToastMessage('User not found');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => navigate('/community'), 2000);
    }
  }, [profileUser, userId, navigate]);

  if (!profileUser) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-[var(--theme-text-tertiary)]" />
          <p className="text-[var(--theme-text-tertiary)] text-sm font-light">Loading profile...</p>
        </div>
      </div>
    );
  }

  const handleFollow = () => {
    if (currentUser) {
      followUser(currentUser.id, profileUser.id);
      setToastMessage(isFollowing ? `Unfollowed ${profileUser.displayName}` : `Following ${profileUser.displayName}`);
      setToastType('success');
      setShowToast(true);
    }
  };

  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  const handleProfileUpdate = () => {
    setToastMessage('Profile updated successfully!');
    setToastType('success');
    setShowToast(true);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors text-sm font-light"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      {/* Profile Header */}
      <ThemeCard className="overflow-hidden">
        {/* Cover Image con gradiente del tema */}
        <div className={`h-32 bg-gradient-to-r from-[var(--theme-primary)]/20 to-[var(--theme-secondary)]/20`} />
        
        {/* Profile Info */}
        <div className="px-6 pb-6 relative">
          {/* Avatar - Usando el componente Avatar que maneja no-profile-pic */}
          <div className="absolute -top-12 left-6">
            <Avatar user={profileUser} size="xl" className="border-4 border-[var(--theme-background-primary)]/20 w-30 h-30" />
          </div>

          {/* Edit/Follow Button */}
          <div className="flex justify-end pt-4">
            {isOwnProfile ? (
              <button
                onClick={handleEditProfile}
                className="px-4 py-2 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light flex items-center gap-2 transition-colors border border-[var(--theme-border-light)]"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            ) : (
              <button
                onClick={handleFollow}
                className={`px-4 py-2 rounded-lg text-sm font-light transition-all duration-300 ${
                  isFollowing
                    ? 'bg-[var(--theme-background-glass)] hover:bg-red-500/20 text-[var(--theme-text-primary)] hover:text-red-500 border border-[var(--theme-border-light)]'
                    : getPrimaryButtonClass()
                }`}
              >
                {isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            )}
          </div>

          {/* User Details */}
          <div className="mt-12">
            <GradientText as="h1" className="text-2xl font-light">
              {profileUser.displayName}
            </GradientText>
            <p className="text-sm text-[var(--theme-text-tertiary)] mt-1">@{profileUser.username}</p>
            
            {profileUser.bio && (
              <p className="text-sm text-[var(--theme-text-secondary)] mt-3 max-w-lg">{profileUser.bio}</p>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-[var(--theme-text-tertiary)]">
              {profileUser.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{profileUser.location}</span>
                </div>
              )}
              {profileUser.website && (
                <div className="flex items-center gap-1">
                  <LinkIcon className="w-3.5 h-3.5" />
                  <a href={profileUser.website} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--theme-primary)] transition-colors">
                    {profileUser.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              {profileUser.email && isOwnProfile && (
                <div className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{profileUser.email}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Joined {formatDate(profileUser.joinedAt || profileUser.createdAt || new Date().toISOString(), 'short')}</span>
              </div>
            </div>

            {/* Role Badge */}
            {profileUser.role && (
              <div className="mt-3">
                <span className={`text-xs px-2 py-1 rounded-full ${getBadgeClass('info')}`}>
                  {profileUser.role.charAt(0).toUpperCase() + profileUser.role.slice(1).replace('-', ' ')}
                </span>
              </div>
            )}

            {/* Follow Stats */}
            <div className="flex gap-6 mt-4 pt-4 border-t border-[var(--theme-border-light)]">
              <div className="flex items-center gap-2">
                <span className="text-sm font-light text-[var(--theme-text-primary)]">{profileUser.followers?.length || 0}</span>
                <span className="text-xs text-[var(--theme-text-tertiary)]">Followers</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-light text-[var(--theme-text-primary)]">{profileUser.following?.length || 0}</span>
                <span className="text-xs text-[var(--theme-text-tertiary)]">Following</span>
              </div>
            </div>
          </div>
        </div>
      </ThemeCard>

      {/* Tabs */}
      <div className="flex gap-4 mt-6 border-b border-[var(--theme-border-light)]">
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-2 text-sm font-light transition-colors relative ${
            activeTab === 'posts'
              ? 'text-[var(--theme-primary)]'
              : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)]'
          }`}
        >
          Posts
          {activeTab === 'posts' && (
            <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)]`} />
          )}
        </button>
        <button
          onClick={() => setActiveTab('likes')}
          className={`px-4 py-2 text-sm font-light transition-colors relative ${
            activeTab === 'likes'
              ? 'text-[var(--theme-primary)]'
              : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)]'
          }`}
        >
          Likes
          {activeTab === 'likes' && (
            <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)]`} />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="mt-6 space-y-4">
        {activeTab === 'posts' && userPosts.length > 0 && (
          userPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onEdit={isOwnProfile ? undefined : undefined}
              onDelete={isOwnProfile ? undefined : undefined}
              onUserClick={(id) => navigate(`/profile/${id}`)}
            />
          ))
        )}

        {activeTab === 'likes' && likedPosts.length > 0 && (
          likedPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onUserClick={(id) => navigate(`/profile/${id}`)}
            />
          ))
        )}

        {((activeTab === 'posts' && userPosts.length === 0) || 
          (activeTab === 'likes' && likedPosts.length === 0)) && (
          <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-12 text-center">
            {activeTab === 'posts' ? (
              <>
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-[var(--theme-text-tertiary)]" />
                <p className="text-[var(--theme-text-tertiary)] text-sm font-light">No posts yet</p>
                {isOwnProfile && (
                  <button 
                    onClick={() => navigate('/community')}
                    className="mt-4 px-4 py-2 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light border border-[var(--theme-border-light)]"
                  >
                    Create Your First Post
                  </button>
                )}
              </>
            ) : (
              <>
                <Heart className="w-16 h-16 mx-auto mb-4 text-[var(--theme-text-tertiary)]" />
                <p className="text-[var(--theme-text-tertiary)] text-sm font-light">No liked posts yet</p>
              </>
            )}
          </div>
        )}
      </div>

      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleProfileUpdate}
      />

      <ToastNotification
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </div>
  );
};

export default Profile;