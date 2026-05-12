// pages/Community.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Image, Smile, MapPin, Loader2,
  TrendingUp, Users, Sparkles, Send, X, Globe, Lock
} from 'lucide-react';
import { useCommunityStore, useUserStore } from '../../store';
import { PostCard } from './PostCard';
import { PostList } from './PostList';
import { UsersList } from './UsersList';
import { PostFormModal } from './PostFormModal';
import { EmojiPicker } from './EmojiPicker';
import ToastNotification from '../../components/common/ToastNotification';
import { Avatar } from '../../components/common/Avatar';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { communityService } from '../../services/community.service';

const PostComposer: React.FC<{
  user: any;
  onPost: (data: { title: string; content: string; tags: string[]; imageBase64?: string }) => void;
}> = ({ user, onPost }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'followers'>('public');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [_imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_SIZE = 10 * 1024 * 1024;
  const TARGET_SIZE = 500 * 1024;

  const compressImage = (file: File, maxWidth: number = 1280, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
          let result = canvas.toDataURL('image/jpeg', quality);
          let q = quality;
          while (result.length > TARGET_SIZE && q > 0.3) { q -= 0.1; result = canvas.toDataURL('image/jpeg', q); }
          resolve(result);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);
    if (file.size > MAX_SIZE) { setImageError(`Too large`); return; }
    const compressed = await compressImage(file);
    setImages([compressed]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEmojiSelect = (emoji: string) => { setContent(prev => prev + emoji); setShowEmojiPicker(false); };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    await onPost({ title: title || content.slice(0, 60), content, tags: tagList, imageBase64: images[0] });
    setTitle(''); setContent(''); setTags(''); setImages([]); setIsExpanded(false); setIsSubmitting(false);
  };

  return (
    <div className={`bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-2xl overflow-hidden transition-all ${isExpanded ? 'shadow-lg' : 'hover:border-[var(--theme-border-dark)]'}`}>
      {!isExpanded ? (
        <div className="w-full p-4 flex items-center gap-3 cursor-pointer" onClick={() => setIsExpanded(true)}>
          <Avatar user={user} size="md" />
          <span className="flex-1 text-sm text-[var(--theme-text-tertiary)]/60 font-light">Start a conversation about money...</span>
          <div onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="p-2 rounded-full hover:bg-[var(--theme-background-primary)] cursor-pointer">
            <Image className="w-4 h-4 text-[var(--theme-primary)]/50" />
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Avatar user={user} size="sm" /><span className="text-sm font-light text-[var(--theme-text-primary)]">{user?.displayName || 'You'}</span></div>
            <div className="flex items-center gap-1">
              <button onClick={() => setVisibility(v => v === 'public' ? 'followers' : 'public')} className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] text-[var(--theme-primary)] bg-[var(--theme-primary)]/10">{visibility === 'public' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}</button>
              <button onClick={() => setIsExpanded(false)} className="p-1.5 rounded-full hover:bg-[var(--theme-background-primary)]"><X className="w-3.5 h-3.5 text-[var(--theme-text-tertiary)]" /></button>
            </div>
          </div>
          <div className="flex gap-3">
            <Avatar user={user} size="md" className="flex-shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give it a title..." className="w-full bg-transparent border-none outline-none text-base font-light mb-2 placeholder:text-[var(--theme-text-tertiary)]/30" style={{ color: 'var(--theme-text-primary)' }} />
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="What's on your mind?" rows={4} className="w-full bg-transparent border-none outline-none text-sm resize-none placeholder:text-[var(--theme-text-tertiary)]/40" style={{ color: 'var(--theme-text-secondary)' }} autoFocus />
              {images.length > 0 && (
                <div className="mt-3">{images.map((img, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-[var(--theme-border-light)]">
                    <img src={img} alt="" className="w-full h-48 object-cover" />
                    <button onClick={() => setImages([])} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}</div>
              )}
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Add tags..." className="w-full bg-transparent border-none outline-none text-xs mt-3 placeholder:text-[var(--theme-primary)]/25" style={{ color: 'var(--theme-primary)' }} />
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--theme-border-light)]">
                <div className="flex items-center gap-1 relative">
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-[var(--theme-primary)]/10"><Image className="w-4 h-4 text-[var(--theme-primary)]/60" /></button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 rounded-full hover:bg-[var(--theme-primary)]/10"><Smile className="w-4 h-4 text-[var(--theme-primary)]/60" /></button>
                  {showEmojiPicker && <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />}
                  <button className="p-2 rounded-full hover:bg-[var(--theme-primary)]/10"><MapPin className="w-4 h-4 text-[var(--theme-primary)]/60" /></button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--theme-text-tertiary)]/50">{content.length}/500</span>
                  <button onClick={handleSubmit} disabled={!content.trim() || isSubmitting} className="px-4 py-1.5 bg-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/90 disabled:opacity-30 text-white text-xs font-light rounded-full flex items-center gap-1.5">
                    {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Send className="w-3 h-3" /> Post</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
const CommunityPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { 
    posts, isLoading, fetchPosts, addPost, updatePost, deletePost, 
    fetchRecommendedPosts, hasMore, followUser, unfollowUser 
  } = useCommunityStore();
  const { user } = useUserStore();
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'posts' | 'users'>('posts');
  const [activeTab, setActiveTab] = useState<'for-you' | 'following' | 'trending'>('for-you');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [searchResults, setSearchResults] = useState<{ posts: any[]; users: any[] }>({ posts: [], users: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, _setIsLoadingMore] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [followingMap, setFollowingMap] = useState<Set<string>>(new Set(user?.following || []));
  
  const observerTarget = useRef<HTMLDivElement>(null);
  const initialLoadDone = useRef(false);
  const sidebarLoadedRef = useRef(false);
  const searchRequestIdRef = useRef(0);
  const searchHandledRef = useRef<string>('');
  const isMountedRef = useRef(false);
  const isSearchActive = searchQuery.trim().length >= 2;

  // Actualizar followingMap cuando cambia el usuario
  useEffect(() => {
    if (user?.following) {
      setFollowingMap(new Set(user.following));
    }
  }, [user?.following]);

  useEffect(() => {
    const q = searchParams.get('search');
    const m = (searchParams.get('mode') as 'posts' | 'users') || 'posts';
    
    if (q && q.trim().length >= 2) {
      const searchKey = `${q}:${m}`;
      
      // Solo ejecutar si es una búsqueda diferente
      if (searchHandledRef.current !== searchKey) {
        console.log('🔍 Buscando desde URL:', searchKey);
        searchHandledRef.current = searchKey;
        
        setSearchQuery(q);
        setSearchMode(m);
        handleSearch(q, m);
      }
    } else {
      // Resetear searchHandledRef cuando no hay búsqueda
      searchHandledRef.current = '';
    }
  }, [searchParams]); 
  // UN SOLO EFECTO para carga inicial y search params
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      
      const q = searchParams.get('search');
      
      if (!q) {
        if (activeTab === 'trending') {
          fetchRecommendedPosts();
        } else {
          fetchPosts(true);
        }
        loadSidebarContent();
      }
    }
  }, []); 

  const loadSidebarContent = useCallback(async () => {
    if (sidebarLoadedRef.current) return; 
    sidebarLoadedRef.current = true;
    
    try {
      const users = await communityService.searchUsers('$recommended$');
      setSuggestedUsers(users.slice(0, 5));
      
      const allTags = posts.flatMap(p => p.tags || []);
      const uniqueTags = [...new Set(allTags)].slice(0, 5) as string[];
      setTrendingTopics(uniqueTags);
    } catch (error) {
      console.error('Error loading sidebar:', error);
      sidebarLoadedRef.current = false; // Permitir reintentar
    }
  }, [posts]);


  const handleSearch = async (
    q: string, 
    m: 'posts' | 'users' = 'posts', 
    requestId?: number,
    abortController?: AbortController
  ) => {
    if (q.trim().length < 2) { 
      setSearchResults({ posts: [], users: [] }); 
      return; 
    }
    
    setSearchMode(m);
    setIsSearching(true);
    
    try {
      if (abortController?.signal.aborted) return;
      
      if (m === 'posts') {
        const r = await communityService.searchPosts(q);
        if (requestId === undefined || requestId === searchRequestIdRef.current) {
          setSearchResults({ posts: r || [], users: [] });
        }
      } else {
        const r = await communityService.searchUsers(q);
        if (requestId === undefined || requestId === searchRequestIdRef.current) {
          setSearchResults({ posts: [], users: r || [] });
        }
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Search error:', error);
      }
    } finally { 
      if (requestId === undefined || requestId === searchRequestIdRef.current) {
        setIsSearching(false); 
      }
    }
  };

  const handleTabChange = async (t: 'for-you' | 'following' | 'trending') => {
    setActiveTab(t); 
    setSearchQuery(''); 
    setSearchResults({ posts: [], users: [] });
    if (t === 'trending') await fetchRecommendedPosts(); 
    else await fetchPosts(true);
  };

  const handleQuickPost = async (d: any) => {
    const p: any = { title: d.title, content: d.content, tags: d.tags };
    if (d.imageBase64) p.imageUrl = d.imageBase64;
    const r = await addPost(p);
    if (r) { 
      setToastMessage('Posted!'); 
      setToastType('success'); 
      setShowToast(true); 
      // Recargar sidebar para actualizar tags
      loadSidebarContent();
    }
  };

  const handleCreatePost = async (d: any) => { 
    const r = await addPost(d); 
    if (r) { 
      setToastMessage('Created!'); 
      setToastType('success'); 
      setShowToast(true); 
      setShowModal(false); 
      loadSidebarContent();
    } 
  };

  const handleUpdatePost = async (d: any) => { 
    if (editingPost) { 
      const ok = await updatePost(editingPost.id, d); 
      if (ok) { 
        setEditingPost(null); 
        setToastMessage('Updated!'); 
        setToastType('success'); 
        setShowToast(true); 
        setShowModal(false); 
      } 
    } 
  };

  const handleEdit = (p: any) => { setEditingPost(p); setShowModal(true); };
  
  const handleDelete = async (id: string) => { 
    await deletePost(id); 
    setToastMessage('Deleted'); 
    setToastType('success'); 
    setShowToast(true); 
  };

  const handleUserClick = (u: string) => navigate(`/profile/${u}`);

  // 🎯 Manejar follow/unfollow
  const handleFollowToggle = async (targetUserId: string, targetUsername: string) => {
    const isFollowing = followingMap.has(targetUserId);
    
    // Optimistic update
    const newFollowingMap = new Set(followingMap);
    if (isFollowing) {
      newFollowingMap.delete(targetUserId);
    } else {
      newFollowingMap.add(targetUserId);
    }
    setFollowingMap(newFollowingMap);
    
    try {
      if (isFollowing) {
        await unfollowUser(targetUserId);
        setToastMessage(`Unfollowed @${targetUsername}`);
      } else {
        await followUser(targetUserId);
        setToastMessage(`Following @${targetUsername}`);
      }
      setToastType('success');
      setShowToast(true);
    } catch (error) {
      // Rollback
      setFollowingMap(followingMap);
      setToastMessage('Error updating follow status');
      setToastType('error');
      setShowToast(true);
    }
  };

  let fp = [...posts];
  if (activeTab === 'following' && user) fp = fp.filter(p => (user.following || []).includes(p.userId));
  fp.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalResults = searchMode === 'posts' ? searchResults.posts.length : searchResults.users.length;

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="flex gap-6">
        <div className="flex-1 max-w-2xl">
          {!isSearchActive && <PostComposer user={user} onPost={handleQuickPost} />}
          <div className="mt-4" />
          {!isSearchActive && (
            <div className="flex gap-2 mb-4">
              {[{ id: 'for-you', icon: Sparkles, label: 'For You' }, { id: 'following', icon: Users, label: 'Following' }, { id: 'trending', icon: TrendingUp, label: 'Trending' }].map(tab => (
                <button key={tab.id} onClick={() => handleTabChange(tab.id as any)} className={`px-3 py-1.5 rounded-full text-xs font-light flex items-center gap-1.5 ${activeTab === tab.id ? 'bg-[var(--theme-primary)] text-white' : 'bg-[var(--theme-background-glass)] text-[var(--theme-text-tertiary)] border border-[var(--theme-border-light)]'}`}>
                  <tab.icon className="w-3 h-3" /> {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Search Results */}
          {isSearchActive ? (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-[var(--theme-text-secondary)]">
                  Results for <span className="text-[var(--theme-primary)]">"{searchQuery}"</span>
                  <span className="text-xs ml-2 text-[var(--theme-text-tertiary)]">({totalResults} {searchMode})</span>
                </p>
              </div>
              
              {searchMode === 'posts' ? (
                <PostList posts={searchResults.posts} isLoading={isSearching} emptyMessage="No posts found" onUserClick={handleUserClick} />
              ) : (
                <UsersList users={searchResults.users} isLoading={isSearching} emptyMessage="No users found" />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {fp.map(p => <PostCard key={p.id} post={p} onEdit={p.userId === user?.id ? handleEdit : undefined} onDelete={p.userId === user?.id ? handleDelete : undefined} onUserClick={handleUserClick} />)}
              {fp.length === 0 && !isLoading && <div className="text-center py-16"><Sparkles className="w-8 h-8 text-[var(--theme-primary)]/30 mx-auto mb-4" /><p className="text-sm text-[var(--theme-text-tertiary)]">No posts yet</p></div>}
              {isLoading && <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-[var(--theme-primary)] animate-spin" /></div>}
              {hasMore && !isLoading && fp.length > 0 && <div ref={observerTarget} className="flex justify-center py-8">{isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}</div>}
            </div>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="w-80 hidden lg:block flex-shrink-0">
          <div className="sticky top-20 space-y-4">
            {/* Who to follow */}
            <div className="bg-[var(--theme-background-glass)] rounded-2xl border border-[var(--theme-border-light)] overflow-hidden">
              <h3 className="p-4 text-sm font-light text-[var(--theme-text-primary)] border-b">Who to follow</h3>
              <div className="divide-y divide-[var(--theme-border-light)]">
                {suggestedUsers.length > 0 ? suggestedUsers.map(u => (
                  <div key={u.id} className="p-4 flex items-center justify-between">
                    <div 
                      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      onClick={() => handleUserClick(u.username)}
                    >
                      <Avatar user={u} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm truncate">{u.displayName || u.username}</p>
                        <p className="text-xs text-[var(--theme-text-tertiary)] truncate">@{u.username}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFollowToggle(u.id, u.username);
                      }}
                      className={`px-3 py-1 text-xs rounded-full transition-all ${
                        followingMap.has(u.id) 
                          ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] hover:bg-red-500/10 hover:text-red-500'
                          : 'bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary)]/90'
                      }`}
                    >
                      {followingMap.has(u.id) ? 'Following' : 'Follow'}
                    </button>
                  </div>
                )) : (
                  <div className="p-4 text-center text-xs text-[var(--theme-text-tertiary)]">
                    Loading suggestions...
                  </div>
                )}
              </div>
            </div>
            
            {/* Trends */}
            <div className="bg-[var(--theme-background-glass)] rounded-2xl border border-[var(--theme-border-light)] overflow-hidden">
              <h3 className="p-4 text-sm font-light text-[var(--theme-text-primary)] border-b">Trends</h3>
              <div className="divide-y divide-[var(--theme-border-light)]">
                {trendingTopics.length > 0 ? trendingTopics.map((t, i) => (
                  <button 
                    key={i} 
                    onClick={() => { 
                      setSearchQuery(t); 
                      setSearchMode('posts');
                      handleSearch(t, 'posts'); 
                    }} 
                    className="w-full p-4 text-left hover:bg-[var(--theme-background-primary)]/50 transition-colors"
                  >
                    <p className="text-[10px] text-[var(--theme-text-tertiary)]">Trending</p>
                    <p className="text-sm text-[var(--theme-text-primary)]">#{t}</p>
                  </button>
                )) : (
                  <div className="p-4 text-center text-xs text-[var(--theme-text-tertiary)]">
                    No trends yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <PostFormModal 
        isOpen={showModal} 
        editingPost={editingPost} 
        onClose={() => { setShowModal(false); setEditingPost(null); }} 
        onSubmit={editingPost ? handleUpdatePost : handleCreatePost} 
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

export default CommunityPage;