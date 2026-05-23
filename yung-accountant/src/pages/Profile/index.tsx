// pages/Profile.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPin, Calendar, ChevronLeft, Loader2,
  Heart, MessageCircle, UserPlus, UserMinus, Edit2,
  Link as LinkIcon, Sparkles
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
  
  // Stores
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
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // Refs para control estricto
  const loadedUsernameRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isInitialMount = useRef(true);

  const isOwnProfile = !username || username === currentUser?.username;

  // Cargar perfil
  useEffect(() => {
    // Saltar primera ejecución en StrictMode
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    const targetUsername = username || currentUser?.username || null;
    
    // Si ya cargamos este username, no hacer nada
    if (loadedUsernameRef.current === targetUsername) return;
    
    // Cancelar cualquier request anterior
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
      <div className="max-w-3xl mx-auto flex justify-center py-24">
        <Loader2 className="w-6 h-6 text-[var(--theme-primary)] animate-spin" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-2xl p-16 text-center border border-[var(--theme-border-light)]">
          <div className="w-16 h-16 rounded-full bg-[var(--theme-primary)]/10 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-[var(--theme-primary)]/40" />
          </div>
          <p className="text-base font-light text-[var(--theme-text-secondary)]">User not found</p>
          <button onClick={() => navigate('/community')} className="mt-6 px-6 py-2.5 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] rounded-xl text-sm font-light hover:bg-[var(--theme-primary)]/20 transition-all duration-300">
            Back to Community
          </button>
        </div>
      </div>
    );
  }

  const displayName = profileUser.displayName || `${profileUser.firstName || ''} ${profileUser.lastName || ''}`.trim() || 'Anonymous';
  const userUsername = profileUser.username || profileUser.email?.split('@')[0] || 'anonymous';

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16">
      <button 
        onClick={() => navigate(-1)} 
        className="mb-8 flex items-center gap-2 text-xs text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors uppercase tracking-widest font-light"
      >
        <ChevronLeft className="w-3 h-3" /> Return
      </button>

      <div className="bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-2xl overflow-hidden border border-[var(--theme-border-light)]">
        <div className="h-28 bg-gradient-to-r from-[var(--theme-primary)]/30 via-[var(--theme-secondary)]/20 to-[var(--theme-primary)]/10 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--theme-background-glass)]/80" />
        </div>
        
        <div className="px-8 pb-8 relative">
          <div className="absolute -top-12 left-8">
            <div className="p-1 bg-[var(--theme-background-glass)] rounded-full">
              <Avatar user={profileUser} size="xl" className="w-24 h-24 rounded-full ring-2 ring-[var(--theme-border-light)]" />
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            {isOwnProfile ? (
              <button onClick={() => setShowEditModal(true)} className="px-5 py-2.5 bg-[var(--theme-background-primary)]/50 backdrop-blur-sm rounded-xl text-xs font-light flex items-center gap-2 border border-[var(--theme-border-light)] hover:bg-[var(--theme-background-primary)] transition-all duration-300 tracking-wide">
                <Edit2 className="w-3.5 h-3.5 text-[var(--theme-text-tertiary)]" /> Edit Profile
              </button>
            ) : (
              <button 
                onClick={handleFollowToggle} 
                disabled={followLoading}
                className={`px-5 py-2.5 rounded-xl text-xs font-light flex items-center gap-2 transition-all duration-300 tracking-wide ${
                  isFollowing 
                    ? 'bg-[var(--theme-background-primary)]/50 border border-[var(--theme-border-light)] hover:border-red-500/30 hover:text-red-400' 
                    : 'bg-[var(--theme-primary)] text-white border border-[var(--theme-primary)] hover:opacity-90'
                } ${followLoading ? 'opacity-50' : ''}`}
              >
                {followLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isFollowing ? <><UserMinus className="w-3.5 h-3.5" /> Following</> : <><UserPlus className="w-3.5 h-3.5" /> Follow</>}
              </button>
            )}
          </div>
          
          <div className="mt-14">
            <GradientText as="h1" className="text-2xl font-light tracking-tight">{displayName}</GradientText>
            <p className="text-xs text-[var(--theme-text-tertiary)] mt-1.5 tracking-wide">@{userUsername}</p>
            
            {profileUser.bio && (
              <p className="text-sm text-[var(--theme-text-secondary)] mt-4 leading-relaxed font-light">{profileUser.bio}</p>
            )}
            
            <div className="flex flex-wrap gap-5 mt-5 text-[11px] text-[var(--theme-text-tertiary)] font-light">
              {profileUser.location && (
                <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /><span>{profileUser.location}</span></div>
              )}
              {profileUser.website && (
                <a href={profileUser.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-[var(--theme-primary)] transition-colors">
                  <LinkIcon className="w-3 h-3" /><span>Website</span>
                </a>
              )}
              <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /><span>Joined {formatDate(profileUser.createdAt || new Date().toISOString(), 'short')}</span></div>
            </div>

            <div className="flex gap-8 mt-6 pt-5 border-t border-[var(--theme-border-light)]">
              <div><span className="text-lg font-light text-[var(--theme-text-primary)]">{stats.postsCount}</span><span className="text-[10px] text-[var(--theme-text-tertiary)] ml-2 uppercase tracking-widest">Posts</span></div>
              <div><span className="text-lg font-light text-[var(--theme-text-primary)]">{stats.followersCount}</span><span className="text-[10px] text-[var(--theme-text-tertiary)] ml-2 uppercase tracking-widest">Followers</span></div>
              <div><span className="text-lg font-light text-[var(--theme-text-primary)]">{stats.followingCount}</span><span className="text-[10px] text-[var(--theme-text-tertiary)] ml-2 uppercase tracking-widest">Following</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-0 mt-8 border-b border-[var(--theme-border-light)]">
        <button onClick={() => setActiveTab('posts')} className={`px-6 py-3 text-xs font-light tracking-widest uppercase relative transition-all ${activeTab === 'posts' ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)]'}`}>
          Posts <span className="ml-2 text-[10px] opacity-60">{userPosts.length}</span>
          {activeTab === 'posts' && <div className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)]" />}
        </button>
        <button onClick={() => setActiveTab('likes')} className={`px-6 py-3 text-xs font-light tracking-widest uppercase relative transition-all ${activeTab === 'likes' ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)]'}`}>
          Likes <span className="ml-2 text-[10px] opacity-60">{likedPosts.length}</span>
          {activeTab === 'likes' && <div className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)]" />}
        </button>
      </div>

      <div className="mt-8 space-y-4">
        {activeTab === 'posts' ? (
          postsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-[var(--theme-primary)] animate-spin" /></div>
          ) : userPosts.length > 0 ? (
            userPosts.map((post: any) => (
              <PostCard key={post.id} post={post} onEdit={isOwnProfile ? handleEdit : undefined} onDelete={isOwnProfile ? handleDelete : undefined} onUserClick={handleUserClick} />
            ))
          ) : (
            <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm rounded-2xl p-16 text-center border border-[var(--theme-border-light)]">
              <div className="w-12 h-12 rounded-full bg-[var(--theme-primary)]/5 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
              </div>
              <p className="text-xs text-[var(--theme-text-tertiary)] tracking-wide font-light">{isOwnProfile ? 'No posts yet' : 'No posts yet'}</p>
              {isOwnProfile && (
                <button onClick={() => { setEditingPost(null); setShowPostModal(true); }} className="mt-4 px-5 py-2 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] rounded-full text-xs font-light hover:bg-[var(--theme-primary)]/20 transition-all">
                  Write something
                </button>
              )}
            </div>
          )
        ) : (
          likedPosts.length > 0 ? (
            likedPosts.map((post: any) => (
              <PostCard key={post.id} post={post} onUserClick={handleUserClick} />
            ))
          ) : (
            <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm rounded-2xl p-16 text-center border border-[var(--theme-border-light)]">
              <div className="w-12 h-12 rounded-full bg-[var(--theme-primary)]/5 flex items-center justify-center mx-auto mb-4">
                <Heart className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
              </div>
              <p className="text-xs text-[var(--theme-text-tertiary)] tracking-wide font-light">{isOwnProfile ? 'No likes yet' : 'No likes yet'}</p>
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