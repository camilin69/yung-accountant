// pages/Profile/index.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Link as LinkIcon, Calendar, Users, Heart, MessageCircle, Edit2, Mail, ChevronLeft } from 'lucide-react';
import { useUserStore, usePostStore } from '../../store';
import { formatDate } from '../../utils/formatters';
import { PostCard } from '../Community/PostCard';
import ToastNotification from '../../components/common/ToastNotification';

const Profile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser, users, followUser } = useUserStore();
  const { posts } = usePostStore();
  const [_showEditModal, setShowEditModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [activeTab, setActiveTab] = useState<'posts' | 'likes'>('posts');

  const profileUser = users.find(u => u.id === userId);
  const isOwnProfile = currentUser?.id === userId;
  const isFollowing = profileUser?.followers?.includes(currentUser?.id || '') || false;

  // Get user's posts
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
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-white/20" />
          <p className="text-white/40 text-sm font-light">Loading profile...</p>
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
    // TODO: Implement edit profile modal
    setShowEditModal(true);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-light"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      {/* Profile Header */}
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
        {/* Cover Image */}
        <div className="h-32 bg-gradient-to-r from-[#6366F1]/20 to-[#EC4899]/20" />
        
        {/* Profile Info */}
        <div className="px-6 pb-6 relative">
          {/* Avatar */}
          <div className="absolute -top-12 left-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#6366F1] to-[#EC4899] flex items-center justify-center border-4 border-black/20">
              <span className="text-white text-3xl font-light">
                {profileUser.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Edit/Follow Button */}
          <div className="flex justify-end pt-4">
            {isOwnProfile ? (
              <button
                onClick={handleEditProfile}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm font-light flex items-center gap-2 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            ) : (
              <button
                onClick={handleFollow}
                className={`px-4 py-2 rounded-lg text-sm font-light transition-all duration-300 ${
                  isFollowing
                    ? 'bg-white/5 hover:bg-red-500/20 text-white/80 hover:text-red-500'
                    : 'bg-gradient-to-r from-[#6366F1] to-[#EC4899] hover:scale-[1.02] text-white'
                }`}
              >
                {isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            )}
          </div>

          {/* User Details */}
          <div className="mt-12">
            <h1 className="text-2xl font-light text-white">{profileUser.displayName}</h1>
            <p className="text-sm text-white/40 mt-1">@{profileUser.username}</p>
            
            {profileUser.bio && (
              <p className="text-sm text-white/60 mt-3 max-w-lg">{profileUser.bio}</p>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-white/40">
              {profileUser.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{profileUser.location}</span>
                </div>
              )}
              {profileUser.website && (
                <div className="flex items-center gap-1">
                  <LinkIcon className="w-3.5 h-3.5" />
                  <a href={profileUser.website} target="_blank" rel="noopener noreferrer" className="hover:text-[#6366F1] transition-colors">
                    {profileUser.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Joined {formatDate(profileUser.joinedAt, 'long')}</span>
              </div>
              {profileUser.email && isOwnProfile && (
                <div className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{profileUser.email}</span>
                </div>
              )}
            </div>

            {/* Follow Stats */}
            <div className="flex gap-6 mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-sm font-light text-white">{profileUser.followers?.length || 0}</span>
                <span className="text-xs text-white/40">Followers</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-light text-white">{profileUser.following?.length || 0}</span>
                <span className="text-xs text-white/40">Following</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mt-6 border-b border-white/10">
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-2 text-sm font-light transition-colors relative ${
            activeTab === 'posts'
              ? 'text-[#6366F1]'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Posts
          {activeTab === 'posts' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#6366F1] to-[#EC4899]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('likes')}
          className={`px-4 py-2 text-sm font-light transition-colors relative ${
            activeTab === 'likes'
              ? 'text-[#6366F1]'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Likes
          {activeTab === 'likes' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#6366F1] to-[#EC4899]" />
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
          <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
            {activeTab === 'posts' ? (
              <>
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <p className="text-white/40 text-sm font-light">No posts yet</p>
                {isOwnProfile && (
                  <button 
                    onClick={() => navigate('/community')}
                    className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm font-light"
                  >
                    Create Your First Post
                  </button>
                )}
              </>
            ) : (
              <>
                <Heart className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <p className="text-white/40 text-sm font-light">No liked posts yet</p>
              </>
            )}
          </div>
        )}
      </div>

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