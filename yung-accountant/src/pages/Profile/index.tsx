// pages/Profile.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPin, Calendar, ChevronLeft, Loader2,
  Heart, MessageCircle, UserPlus, UserMinus, Edit2,
  Link as LinkIcon, Sparkles, Plus
} from 'lucide-react';
import { useUserStore } from '../../store/user.store';
import { useCommunityStore } from '../../store/community.store';
import { formatDate } from '../../utils/formatters';
import { PostCard } from '../Community/PostCard';
import { PostFormModal } from '../Community/PostFormModal';
import { EditProfileModal } from './EditProfileModal';
import ToastNotification from '../../components/common/ToastNotification';
import { GradientText } from '../../components/common/GradientText';
import { Avatar } from '../../components/common/Avatar';
import { communityService } from '../../services/community.service';
import type { UserStats } from '../../services/community.service';

const Profile: React.FC = () => {
  const { username } = useParams<{ username?: string }>();
  const navigate = useNavigate();
  
  const currentUser = useUserStore(state => state.user);
  const loadUserProfile = useUserStore(state => state.loadUserProfile);
  const getUserByUsername = useUserStore(state => state.getUserByUsername);
  
  const followUser = useCommunityStore(state => state.followUser);
  const unfollowUser = useCommunityStore(state => state.unfollowUser);
  const checkIsFollowing = useCommunityStore(state => state.isFollowing);
  const getUserStats = useCommunityStore(state => state.getUserStats);
  const deletePost = useCommunityStore(state => state.deletePost);
  const addPost = useCommunityStore(state => state.addPost);
  const updatePost = useCommunityStore(state => state.updatePost);
  
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
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const loadedUsernameRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isInitialMount = useRef(true);

  const isOwnProfile = !username || username === currentUser?.username;

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    const targetUsername = username || currentUser?.username || null;
    if (loadedUsernameRef.current === targetUsername) return;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    loadedUsernameRef.current = targetUsername;
    
    const loadProfile = async () => {
      setLoading(true);
      setPostsLoading(true);

      try {
        if (abortController.signal.aborted) return;

        if (isOwnProfile && currentUser) {
          setProfileUser(currentUser);
          
          if (currentUser.id) {
            const [userStats, posts] = await Promise.all([
              getUserStats(currentUser.username || ''),
              communityService.getUserPosts(currentUser.id)
            ]);
            
            if (!abortController.signal.aborted) {
              if (userStats) setStats(userStats);
              setUserPosts(posts || []);
              setLikedPosts((posts || []).filter((p: any) => p.likedBy?.includes(currentUser.id)));
            }
          }
        } else if (username) {
          const user = await getUserByUsername(username);
          
          if (!abortController.signal.aborted && user) {
            setProfileUser(user);
            
            const [userStats, followingStatus, posts] = await Promise.all([
              getUserStats(username),
              checkIsFollowing(user.id),
              communityService.getUserPosts(user.id)
            ]);
            
            if (!abortController.signal.aborted) {
              if (userStats) setStats(userStats);
              setIsFollowing(followingStatus);
              setUserPosts(posts || []);
              setLikedPosts((posts || []).filter((p: any) => p.likedBy?.includes(user.id)));
            }
          }
        }
      } catch (error: any) {
        if (error?.name !== 'AbortError' && !abortController.signal.aborted) {}
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
          setPostsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      abortController.abort();
      loadedUsernameRef.current = null;
    };
  }, [username, currentUser?.id]);

  const handleFollowToggle = useCallback(async () => {
    if (!profileUser || followLoading) return;
    setFollowLoading(true);
    
    const wasFollowing = isFollowing;
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
    } catch {
      setIsFollowing(wasFollowing);
      setStats(prev => ({
        ...prev,
        followersCount: wasFollowing ? prev.followersCount + 1 : Math.max(0, prev.followersCount - 1)
      }));
      setToastType('error');
      setShowToast(true);
    } finally {
      setFollowLoading(false);
    }
  }, [profileUser, followLoading, isFollowing, followUser, unfollowUser]);

  const handleLikeUpdate = useCallback((postId: string) => {
    // Actualizar userPosts
    setUserPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const wasLiked = p.likedBy?.includes(currentUser?.id);
        return {
          ...p,
          likesCount: wasLiked ? Math.max(0, (p.likesCount || 1) - 1) : (p.likesCount || 0) + 1,
          likedBy: wasLiked 
            ? (p.likedBy || []).filter((id: string) => id !== currentUser?.id)
            : [...(p.likedBy || []), currentUser?.id],
        };
      }
      return p;
    }));
    
    // Actualizar likedPosts
    setLikedPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const wasLiked = p.likedBy?.includes(currentUser?.id);
        return {
          ...p,
          likesCount: wasLiked ? Math.max(0, (p.likesCount || 1) - 1) : (p.likesCount || 0) + 1,
          likedBy: wasLiked 
            ? (p.likedBy || []).filter((id: string) => id !== currentUser?.id)
            : [...(p.likedBy || []), currentUser?.id],
        };
      }
      return p;
    }));
  }, [currentUser?.id]);


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
    setUserPosts(prev => prev.filter(p => p.id !== id));
    setLikedPosts(prev => prev.filter(p => p.id !== id));
    setToastMessage('Post deleted');
    setToastType('success');
    setShowToast(true);
    setStats(prev => ({ ...prev, postsCount: Math.max(0, prev.postsCount - 1) }));
  }, [deletePost]);

  const handleCreatePost = useCallback(async (data: { title: string; content: string; tags: string[]; imageUrl?: string }) => {
    const result = await addPost(data);
    if (result) {
      setUserPosts(prev => [result, ...prev]);
      setToastMessage('Post created');
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
        setToastMessage('Post updated');
        setToastType('success');
        setShowToast(true);
        setShowPostModal(false);
        if (profileUser?.id) {
          const posts = await communityService.getUserPosts(profileUser.id);
          setUserPosts(posts || []);
        }
      }
    }
  }, [editingPost, updatePost, profileUser?.id]);

  const handleUserClick = useCallback((uname: string) => {
    navigate(`/profile/${uname}`);
  }, [navigate]);

  if (loading) {
    return (
      <div className="max-w-[680px] mx-auto flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin" strokeWidth={1.5} style={{ color: 'var(--theme-text-tertiary)', opacity: 0.35 }} />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="max-w-[680px] mx-auto px-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2.5 py-6 text-[12px] font-medium uppercase tracking-[0.15em] transition-all duration-500 hover:-translate-x-1"
          style={{ color: 'var(--theme-text-tertiary)' }}>
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back
        </button>
        <div className="rounded-[2rem] p-16 text-center glass-aero">
          <div className="w-16 h-16 rounded-[2rem] flex items-center justify-center mx-auto mb-6 glass-sm">
            <Sparkles className="w-8 h-8" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.3 }} strokeWidth={1} />
          </div>
          <p className="text-[15px] font-medium tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)' }}>User not found</p>
          <button onClick={() => navigate('/community')} className="mt-6 px-6 py-3 rounded-2xl text-[13px] font-medium transition-all duration-500 hover:-translate-y-1 glass-sm"
            style={{ color: 'var(--theme-text-secondary)' }}>
            Back to Community
          </button>
        </div>
      </div>
    );
  }

  const displayName = profileUser.displayName || `${profileUser.firstName || ''} ${profileUser.lastName || ''}`.trim() || 'Anonymous';
  const userUsername = profileUser.username || profileUser.email?.split('@')[0] || 'anonymous';

  return (
    <div className="max-w-[680px] mx-auto px-4 pb-24">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2.5 py-6 text-[12px] font-medium uppercase tracking-[0.15em] transition-all duration-500 hover:-translate-x-1"
        style={{ color: 'var(--theme-text-tertiary)' }}>
        <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back
      </button>

      <div className="rounded-[2.5rem] overflow-hidden glass-aero animate-fade-in-up">
        <div className="h-32 relative" style={{ background: 'var(--theme-gradient-accent)', opacity: 0.15 }}>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--theme-background-glass)]/80" />
        </div>
        
        <div className="px-7 pb-7 relative">
          <div className="absolute -top-14 left-7">
            <div className="p-1 rounded-[2rem] glass-aero">
              <Avatar user={profileUser} size="xl" className="w-28 h-28 rounded-[1.75rem]" />
            </div>
          </div>
          
          <div className="flex justify-end pt-5 gap-3">
            {isOwnProfile && (
              <button 
                onClick={() => { setEditingPost(null); setShowPostModal(true); }}
                className="px-5 py-3 rounded-2xl text-[12px] font-medium tracking-[0.04em] uppercase flex items-center gap-2 transition-all duration-500 hover:-translate-y-1 active:scale-95"
                style={{ 
                  backgroundColor: 'var(--theme-primary)', 
                  color: '#FFFFFF',
                  boxShadow: '0 4px 20px -6px var(--theme-primary)'
                }}
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Add Post
              </button>
            )}
            {isOwnProfile ? (
              <button onClick={() => setShowEditModal(true)} className="px-5 py-3 rounded-2xl text-[12px] font-medium tracking-[0.04em] uppercase flex items-center gap-2 transition-all duration-500 hover:-translate-y-1 glass-sm"
                style={{ color: 'var(--theme-text-secondary)' }}>
                <Edit2 className="w-3.5 h-3.5" strokeWidth={1.5} /> Edit Profile
              </button>
            ) : (
              <button 
                onClick={handleFollowToggle} 
                disabled={followLoading}
                className={`px-5 py-3 rounded-2xl text-[12px] font-medium tracking-[0.04em] uppercase flex items-center gap-2 transition-all duration-500 hover:-translate-y-1 active:scale-95 ${
                  followLoading ? 'opacity-25 cursor-not-allowed' : ''
                }`}
                style={{ 
                  backgroundColor: isFollowing ? 'var(--theme-background-glass-hover)' : 'var(--theme-text-primary)',
                  color: isFollowing ? 'var(--theme-text-secondary)' : 'var(--theme-background-primary)',
                  boxShadow: isFollowing ? 'none' : 'var(--shadow-button)'
                }}
              >
                {followLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} /> : isFollowing ? <><UserMinus className="w-3.5 h-3.5" strokeWidth={1.5} /> Following</> : <><UserPlus className="w-3.5 h-3.5" strokeWidth={1.5} /> Follow</>}
              </button>
            )}
          </div>
          
          <div className="mt-16">
            <h1 className="text-[30px] font-light tracking-[-0.03em] leading-tight" style={{ color: 'var(--theme-text-primary)' }}>{displayName}</h1>
            <p className="text-[14px] mt-1.5 tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.6 }}>@{userUsername}</p>
            
            {profileUser.bio && (
              <p className="text-[15px] mt-5 leading-[1.7] tracking-[0.01em]" style={{ color: 'var(--theme-text-secondary)', fontWeight: 350 }}>{profileUser.bio}</p>
            )}
            
            <div className="flex flex-wrap gap-6 mt-6 text-[12px] font-medium tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)' }}>
              {profileUser.location && (
                <div className="flex items-center gap-1.5" style={{ opacity: 0.6 }}><MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />{profileUser.location}</div>
              )}
              {profileUser.website && (
                <a href={profileUser.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 transition-all duration-500 hover:opacity-80" style={{ opacity: 0.6, color: 'var(--theme-primary)' }}>
                  <LinkIcon className="w-3.5 h-3.5" strokeWidth={1.5} />Website
                </a>
              )}
              <div className="flex items-center gap-1.5" style={{ opacity: 0.6 }}><Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />Joined {formatDate(profileUser.createdAt || new Date().toISOString(), 'short')}</div>
            </div>

            <div className="flex gap-10 mt-7 pt-6" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
              <div>
                <span className="text-[22px] font-light tracking-[-0.02em]" style={{ color: 'var(--theme-text-primary)' }}>{stats.postsCount}</span>
                <span className="text-[11px] font-medium ml-2 tracking-[0.12em] uppercase" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>Posts</span>
              </div>
              <div>
                <span className="text-[22px] font-light tracking-[-0.02em]" style={{ color: 'var(--theme-text-primary)' }}>{stats.followersCount}</span>
                <span className="text-[11px] font-medium ml-2 tracking-[0.12em] uppercase" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>Followers</span>
              </div>
              <div>
                <span className="text-[22px] font-light tracking-[-0.02em]" style={{ color: 'var(--theme-text-primary)' }}>{stats.followingCount}</span>
                <span className="text-[11px] font-medium ml-2 tracking-[0.12em] uppercase" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>Following</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-8 mb-8 p-1.5 rounded-[2rem] glass-sm">
        <button 
          onClick={() => setActiveTab('posts')} 
          className="flex-1 px-5 py-3 rounded-[1.75rem] text-[13px] font-medium tracking-[0.04em] uppercase flex items-center justify-center gap-2.5 transition-all duration-500"
          style={{ 
            backgroundColor: activeTab === 'posts' ? 'var(--theme-background-glass-hover)' : 'transparent',
            color: activeTab === 'posts' ? 'var(--theme-text-primary)' : 'var(--theme-text-tertiary)',
            boxShadow: activeTab === 'posts' ? '0 2px 12px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <MessageCircle className="w-4 h-4" strokeWidth={1.5} /> Posts
          <span className="text-[11px] px-2 py-0.5 rounded-2xl" style={{ backgroundColor: activeTab === 'posts' ? 'var(--theme-background-glass)' : 'transparent', opacity: 0.6 }}>
            {userPosts.length}
          </span>
        </button>
        <button 
          onClick={() => setActiveTab('likes')} 
          className="flex-1 px-5 py-3 rounded-[1.75rem] text-[13px] font-medium tracking-[0.04em] uppercase flex items-center justify-center gap-2.5 transition-all duration-500"
          style={{ 
            backgroundColor: activeTab === 'likes' ? 'var(--theme-background-glass-hover)' : 'transparent',
            color: activeTab === 'likes' ? 'var(--theme-text-primary)' : 'var(--theme-text-tertiary)',
            boxShadow: activeTab === 'likes' ? '0 2px 12px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <Heart className="w-4 h-4" strokeWidth={1.5} /> Likes
          <span className="text-[11px] px-2 py-0.5 rounded-2xl" style={{ backgroundColor: activeTab === 'likes' ? 'var(--theme-background-glass)' : 'transparent', opacity: 0.6 }}>
            {likedPosts.length}
          </span>
        </button>
      </div>

      <div className="space-y-6">
        {activeTab === 'posts' ? (
          postsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} style={{ color: 'var(--theme-text-tertiary)', opacity: 0.3 }} />
            </div>
          ) : userPosts.length > 0 ? (
            userPosts.map((post: any) => (
              <PostCard key={post.id} post={post} onEdit={isOwnProfile ? handleEdit : undefined} onDelete={isOwnProfile ? handleDelete : undefined} onUserClick={handleUserClick} onLike={handleLikeUpdate} />
            ))
          ) : (
            <div className="rounded-[2rem] p-16 text-center glass-md">
              <div className="w-16 h-16 rounded-[2rem] flex items-center justify-center mx-auto mb-5 glass-sm">
                <MessageCircle className="w-6 h-6" strokeWidth={1.5} style={{ color: 'var(--theme-text-tertiary)', opacity: 0.25 }} />
              </div>
              <p className="text-[15px] font-medium tracking-[0.03em]" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.35 }}>No posts yet</p>
              {isOwnProfile && (
                <button 
                  onClick={() => { setEditingPost(null); setShowPostModal(true); }}
                  className="mt-5 px-6 py-3 rounded-2xl text-[13px] font-medium tracking-[0.03em] transition-all duration-500 hover:-translate-y-1"
                  style={{ 
                    backgroundColor: 'var(--theme-primary)', 
                    color: '#FFFFFF',
                    boxShadow: '0 4px 20px -6px var(--theme-primary)'
                  }}
                >
                  Write your first post
                </button>
              )}
            </div>
          )
        ) : (
          likedPosts.length > 0 ? (
            likedPosts.map((post: any) => (
              <PostCard key={post.id} post={post} onUserClick={handleUserClick} onLike={handleLikeUpdate}  />
            ))
          ) : (
            <div className="rounded-[2rem] p-16 text-center glass-md">
              <div className="w-16 h-16 rounded-[2rem] flex items-center justify-center mx-auto mb-5 glass-sm">
                <Heart className="w-6 h-6" strokeWidth={1.5} style={{ color: 'var(--theme-text-tertiary)', opacity: 0.25 }} />
              </div>
              <p className="text-[15px] font-medium tracking-[0.03em]" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.35 }}>No likes yet</p>
            </div>
          )
        )}
      </div>

      {isOwnProfile && (
        <>
          <EditProfileModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} onSuccess={handleProfileUpdate} />
          <PostFormModal isOpen={showPostModal} editingPost={editingPost} onClose={() => { setShowPostModal(false); setEditingPost(null); }} onSubmit={editingPost ? handleUpdatePost : handleCreatePost} />
        </>
      )}
      
      <ToastNotification isOpen={showToast} onClose={() => setShowToast(false)} message={toastMessage} type={toastType} />
    </div>
  );
};

export default Profile;