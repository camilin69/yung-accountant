// pages/Profile.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPin, Calendar, Mail, ChevronLeft, Loader2, AlertCircle,
  Heart, MessageCircle, UserPlus, UserMinus, Edit2
} from 'lucide-react';
import { useUserStore } from '../../store/user.store';
import { useCommunityStore } from '../../store/community.store';
import { formatDate } from '../../utils/formatters';
import { PostCard } from '../Community/PostCard';
import { PostFormModal } from '../Community/PostFormModal';
import { EditProfileModal } from './EditProfileModal';
import ToastNotification from '../../components/common/ToastNotification';
import { ThemeCard } from '../../components/common/ThemeCard';
import { GradientText } from '../../components/common/GradientText';
import { Avatar } from '../../components/common/Avatar';
import type { UserStats } from '../../services/community.service';

const Profile: React.FC = () => {
  const { username } = useParams<{ username?: string }>();
  const navigate = useNavigate();
  
  // Stores
  const { 
    user: currentUser, 
    loadUserProfile,
    getUserByUsername 
  } = useUserStore();
  const { 
    posts, 
    isLoading: postsLoading, 
    fetchPosts, 
    deletePost, 
    addPost, 
    updatePost,
    followUser,
    unfollowUser,
    isFollowing: checkIsFollowing,
    getUserStats
  } = useCommunityStore();
  
  // Estados locales
  const [profileUser, setProfileUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [activeTab, setActiveTab] = useState<'posts' | 'likes'>('posts');
  const [stats, setStats] = useState<UserStats>({ followersCount: 0, followingCount: 0, postsCount: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  // Refs para control estricto
  const loadedUsernameRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const postsLoadedRef = useRef(false);
  const isInitialMount = useRef(true);
  const profileFetchCount = useRef(0);

  const isOwnProfile = !username || username === currentUser?.username;

  // Cargar posts solo una vez
  useEffect(() => {
    if (!postsLoadedRef.current && !postsLoading) {
      postsLoadedRef.current = true;
      fetchPosts(true);
    }
  }, []);

  // Cargar perfil - SOLO cuando cambia el username
  useEffect(() => {
    // En StrictMode, React monta/desmonta el componente 2 veces en desarrollo
    // Saltamos la primera ejecución fantasma
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return; // ← Skip first execution in StrictMode
    }
    
    const targetUsername = username || currentUser?.username || null;
    
    // Si ya cargamos este username, no hacer nada
    if (loadedUsernameRef.current === targetUsername) {
      console.log('⏭️ Skipping duplicate load for:', targetUsername);
      return;
    }
    
    // Cancelar cualquier request anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    loadedUsernameRef.current = targetUsername;
    profileFetchCount.current += 1;
    console.log(`🔄 Loading profile #${profileFetchCount.current} for: ${targetUsername}`);
    
    const loadProfile = async () => {
      setLoading(true);

      try {
        if (abortController.signal.aborted) return;

        if (isOwnProfile && currentUser) {
          setProfileUser(currentUser);
          
          if (currentUser.username) {
            const userStats = await getUserStats(currentUser.username);
            if (!abortController.signal.aborted && userStats) {
              setStats(userStats);
            }
          }
        } else if (username) {
          const user = await getUserByUsername(username);
          
          if (!abortController.signal.aborted && user) {
            setProfileUser(user);
            
            const [userStats, followingStatus] = await Promise.all([
              getUserStats(username),
              checkIsFollowing(user.id)
            ]);
            
            if (!abortController.signal.aborted) {
              if (userStats) setStats(userStats);
              setIsFollowing(followingStatus);
            }
          }
        }
      } catch (error: any) {
        if (error?.name !== 'AbortError' && !abortController.signal.aborted) {
          console.error('Error loading profile:', error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      abortController.abort();
      loadedUsernameRef.current = null; 
    };
  }, []); 

  // Handle follow/unfollow
  const handleFollowToggle = useCallback(async () => {
    if (!profileUser || followLoading) return;
    
    setFollowLoading(true);
    
    const wasFollowing = isFollowing;
    
    // Optimistic update
    setIsFollowing(!wasFollowing);
    setStats(prev => ({
      ...prev,
      followersCount: wasFollowing ? Math.max(0, prev.followersCount - 1) : prev.followersCount + 1
    }));
    
    try {
      if (wasFollowing) {
        await unfollowUser(profileUser.id);
        setToastMessage(`Unfollowed @${profileUser.username}`);
      } else {
        await followUser(profileUser.id);
        setToastMessage(`Following @${profileUser.username}`);
      }
      setToastType('success');
      setShowToast(true);
    } catch (error) {
      // Rollback
      setIsFollowing(wasFollowing);
      setStats(prev => ({
        ...prev,
        followersCount: wasFollowing ? prev.followersCount + 1 : Math.max(0, prev.followersCount - 1)
      }));
      setToastMessage('Error updating follow status');
      setToastType('error');
      setShowToast(true);
    } finally {
      setFollowLoading(false);
    }
  }, [profileUser, followLoading, isFollowing, followUser, unfollowUser]);

  const handleProfileUpdate = useCallback(async () => {
    const updatedUser = await loadUserProfile(true);
    if (updatedUser) {
      setProfileUser(updatedUser);
      if (updatedUser.username) {
        const userStats = await getUserStats(updatedUser.username);
        if (userStats) setStats(userStats);
      }
    }
  }, [loadUserProfile, getUserStats]);

  const handleEdit = useCallback((post: any) => {
    setEditingPost(post);
    setShowPostModal(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await deletePost(id);
    setToastMessage('Post deleted');
    setToastType('success');
    setShowToast(true);
  }, [deletePost]);

  const handleCreatePost = useCallback(async (data: { title: string; content: string; tags: string[]; imageUrl?: string }) => {
    const result = await addPost(data);
    if (result) {
      setToastMessage('Post created!');
      setToastType('success');
      setShowToast(true);
      setShowPostModal(false);
      setStats(prev => ({ ...prev, postsCount: prev.postsCount + 1 }));
    }
  }, [addPost]);

  const handleUpdatePost = useCallback(async (data: { title: string; content: string; tags: string[]; imageUrl?: string }) => {
    if (editingPost) {
      const ok = await updatePost(editingPost.id, data);
      if (ok) {
        setEditingPost(null);
        setToastMessage('Post updated!');
        setToastType('success');
        setShowToast(true);
        setShowPostModal(false);
      }
    }
  }, [editingPost, updatePost]);

  const handleUserClick = useCallback((uname: string) => {
    navigate(`/profile/${uname}`);
  }, [navigate]);

  // Loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-[var(--theme-primary)] animate-spin" />
      </div>
    );
  }

  // Not found state
  if (!profileUser) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-[var(--theme-background-glass)] rounded-xl p-12 text-center border border-[var(--theme-border-light)]">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500/50" />
          <p className="text-sm font-light text-[var(--theme-text-secondary)]">User not found</p>
          <button 
            onClick={() => navigate('/community')} 
            className="mt-4 px-4 py-2 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] rounded-lg text-sm hover:bg-[var(--theme-primary)]/20 transition-colors"
          >
            Go to Community
          </button>
        </div>
      </div>
    );
  }

  const displayName = profileUser.displayName || `${profileUser.firstName || ''} ${profileUser.lastName || ''}`.trim() || 'Anonymous';
  const userUsername = profileUser.username || profileUser.email?.split('@')[0] || 'anonymous';
  const userPosts = posts.filter((post: any) => post.userId === profileUser.id);
  const likedPostsList = posts.filter((post: any) => post.likedBy?.includes(profileUser.id));

  return (
    <div className="max-w-4xl mx-auto pb-8">
      {/* Back button */}
      <button 
        onClick={() => navigate(-1)} 
        className="mb-6 flex items-center gap-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] text-sm font-light transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      {/* Profile Card */}
      <ThemeCard className="overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-[var(--theme-primary)]/20 to-[var(--theme-secondary)]/20" />
        
        <div className="px-6 pb-6 relative">
          <div className="absolute -top-14 left-6">
            <Avatar 
              user={profileUser} 
              size="xl" 
              className="border-4 border-[var(--theme-background-primary)]/20 w-28 h-28" 
            />
          </div>
          
          <div className="flex justify-end pt-4">
            {isOwnProfile ? (
              <button 
                onClick={() => setShowEditModal(true)} 
                className="px-4 py-2 bg-[var(--theme-background-glass)] rounded-lg text-sm font-light flex items-center gap-2 border border-[var(--theme-border-light)] hover:bg-[var(--theme-background-primary)] transition-colors"
              >
                <Edit2 className="w-4 h-4" /> Edit Profile
              </button>
            ) : (
              <button 
                onClick={handleFollowToggle} 
                disabled={followLoading}
                className={`px-4 py-2 rounded-lg text-sm font-light flex items-center gap-2 border transition-all ${
                  isFollowing 
                    ? 'bg-[var(--theme-background-glass)] border-[var(--theme-border-light)] hover:border-red-500/50 hover:text-red-500' 
                    : 'bg-[var(--theme-primary)] text-white border-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/90'
                } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {followLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isFollowing ? (
                  <><UserMinus className="w-4 h-4" /> Following</>
                ) : (
                  <><UserPlus className="w-4 h-4" /> Follow</>
                )}
              </button>
            )}
          </div>
          
          <div className="mt-12">
            <GradientText as="h1" className="text-2xl font-light">{displayName}</GradientText>
            <p className="text-sm text-[var(--theme-text-tertiary)] mt-1">@{userUsername}</p>
            
            {profileUser.bio && (
              <p className="text-sm text-[var(--theme-text-secondary)] mt-3 leading-relaxed">{profileUser.bio}</p>
            )}
            
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-[var(--theme-text-tertiary)]">
              {profileUser.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{profileUser.location}</span>
                </div>
              )}
              {profileUser.email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{profileUser.email}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Joined {formatDate(profileUser.createdAt || new Date().toISOString(), 'short')}</span>
              </div>
            </div>

            <div className="flex gap-6 mt-4 pt-4 border-t border-[var(--theme-border-light)]">
              <div className="flex items-center gap-2">
                <span className="text-sm font-light text-[var(--theme-text-primary)]">{stats.postsCount}</span>
                <span className="text-xs text-[var(--theme-text-tertiary)]">Posts</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-light text-[var(--theme-text-primary)]">{stats.followersCount}</span>
                <span className="text-xs text-[var(--theme-text-tertiary)]">Followers</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-light text-[var(--theme-text-primary)]">{stats.followingCount}</span>
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
          className={`px-4 py-2 text-sm font-light relative transition-colors ${
            activeTab === 'posts' ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)]'
          }`}
        >
          Posts ({userPosts.length})
          {activeTab === 'posts' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)]" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('likes')} 
          className={`px-4 py-2 text-sm font-light relative transition-colors ${
            activeTab === 'likes' ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)]'
          }`}
        >
          Likes ({likedPostsList.length})
          {activeTab === 'likes' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)]" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="mt-6 space-y-4">
        {activeTab === 'posts' && (
          userPosts.length > 0 ? (
            userPosts.map((post: any) => (
              <PostCard 
                key={post.id} 
                post={post}
                onEdit={isOwnProfile ? handleEdit : undefined}
                onDelete={isOwnProfile ? handleDelete : undefined}
                onUserClick={handleUserClick}
              />
            ))
          ) : (
            <div className="bg-[var(--theme-background-glass)] rounded-xl p-12 text-center border border-[var(--theme-border-light)]">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-[var(--theme-text-tertiary)] opacity-30" />
              <p className="text-sm font-light text-[var(--theme-text-tertiary)]">
                {isOwnProfile ? 'You haven\'t posted anything yet' : 'No posts yet'}
              </p>
              {isOwnProfile && (
                <button 
                  onClick={() => { setEditingPost(null); setShowPostModal(true); }} 
                  className="mt-4 px-6 py-2 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] rounded-full text-sm font-light hover:bg-[var(--theme-primary)]/20 transition-colors"
                >
                  Create your first post
                </button>
              )}
            </div>
          )
        )}

        {activeTab === 'likes' && (
          likedPostsList.length > 0 ? (
            likedPostsList.map((post: any) => (
              <PostCard 
                key={post.id} 
                post={post}
                onUserClick={handleUserClick}
              />
            ))
          ) : (
            <div className="bg-[var(--theme-background-glass)] rounded-xl p-12 text-center border border-[var(--theme-border-light)]">
              <Heart className="w-16 h-16 mx-auto mb-4 text-[var(--theme-text-tertiary)] opacity-30" />
              <p className="text-sm font-light text-[var(--theme-text-tertiary)]">
                {isOwnProfile ? 'You haven\'t liked any posts yet' : 'No likes yet'}
              </p>
            </div>
          )
        )}
      </div>

      {/* Modals */}
      {isOwnProfile && (
        <>
          <EditProfileModal 
            isOpen={showEditModal} 
            onClose={() => setShowEditModal(false)} 
            onSuccess={handleProfileUpdate} 
          />
          <PostFormModal
            isOpen={showPostModal}
            editingPost={editingPost}
            onClose={() => { setShowPostModal(false); setEditingPost(null); }}
            onSubmit={editingPost ? handleUpdatePost : handleCreatePost}
          />
        </>
      )}
      
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