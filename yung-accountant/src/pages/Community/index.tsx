// pages/Community.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Image, Smile, MapPin, Loader2,
  TrendingUp, Users, Sparkles, Send, X, Globe, Lock, Hash
} from 'lucide-react';
import { useCommunityStore, useUserStore } from '../../store';
import { PostCard } from './PostCard';
import { PostList } from './PostList';
import { UsersList } from './UsersList';
import { PostFormModal } from './PostFormModal';
import { EmojiPicker } from './EmojiPicker';
import ToastNotification from '../../components/common/ToastNotification';
import Tooltip from '../../components/common/Tooltip';
import { Avatar } from '../../components/common/Avatar';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import CachedBadge from '../../components/common/CachedBadge';
import { isOffline } from '../../services/offlineHelper';
import { communityService } from '../../services/community.service';
import { useTranslation } from '../../i18n';

// ============================================
// SEPARADOR ELEGANTE
// ============================================
const Separator: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div 
    className={`h-px ${className}`}
    style={{ 
      background: 'linear-gradient(90deg, transparent, var(--theme-border-medium), transparent)',
      opacity: 0.3
    }} 
  />
);

// ============================================
// POST COMPOSER
// ============================================
const PostComposer: React.FC<{
  user: any;
  onPost: (data: { title: string; content: string; tags: string[]; imageBase64?: string }) => void;
}> = ({ user, onPost }) => {
  const { t } = useTranslation();
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
    if (file.size > MAX_SIZE) { setImageError('Image too large'); return; }
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
    <div className={`relative rounded-[2rem] transition-all duration-700 ease-out animate-fade-in-up ${
      isExpanded ? 'glass-aero' : 'glass-md hover:-translate-y-1'
    }`}>
      {!isExpanded ? (
        <button onClick={() => setIsExpanded(true)} className="w-full p-5 flex items-center gap-4 group">
          <div className="relative">
            <Avatar user={user} size="md" />
            <div 
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full animate-pulse-subtle" 
              style={{ background: 'var(--theme-gradient-accent)' }} 
            />
          </div>
          <span 
            className="flex-1 text-left text-[15px] tracking-[0.02em] transition-all duration-500" 
            style={{ color: 'var(--theme-text-tertiary)', opacity: 0.55 }}
          >
            {t('community.contentPlaceholder')}
          </span>
          <div 
            className="p-2.5 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          >
            <Image className="w-[18px] h-[18px]" strokeWidth={1.5} style={{ color: 'var(--theme-text-tertiary)', opacity: 0.6 }} />
          </div>
        </button>
      ) : (
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Avatar user={user} size="sm" />
              <div>
                <span className="text-[15px] tracking-[0.01em] font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                  {user?.displayName || t('common.you')}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <button 
                    onClick={() => setVisibility(v => v === 'public' ? 'followers' : 'public')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[11px] transition-all duration-300 glass-sm"
                  >
                    {visibility === 'public' ? <Globe className="w-3 h-3" strokeWidth={1.5} /> : <Lock className="w-3 h-3" strokeWidth={1.5} />}
                    {visibility === 'public' ? 'Everyone' : t('community.followers')}
                  </button>
                </div>
              </div>
            </div>
            <Tooltip content={t('common.close')} position="bottom">
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm"
              >
                <X className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
              </button>
            </Tooltip>
          </div>

          <div className="space-y-5">
            <input 
              maxLength={100}
              value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={t('community.title_placeholder')}
              className="w-full bg-transparent text-[22px] outline-none tracking-[0.01em] leading-relaxed placeholder:opacity-20"
              style={{ color: 'var(--theme-text-primary)' }}
            />
            <textarea 
              maxLength={500}
              value={content} onChange={(e) => setContent(e.target.value)}
              placeholder={t('community.content')} rows={5}
              className="w-full bg-transparent text-[15px] outline-none resize-none leading-[1.8] tracking-[0.01em] placeholder:opacity-20"
              style={{ color: 'var(--theme-text-secondary)' }}
              autoFocus 
            />
            
            {images.length > 0 && (
              <div className="relative rounded-[1.5rem] overflow-hidden">
                <img src={images[0]} alt="" className="w-full h-64 object-cover" />
                <Tooltip content={t('common.remove')} position="bottom">
                  <button
                    onClick={() => setImages([])}
                    className="absolute top-4 right-4 p-2.5 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm"
                  >
                    <X className="w-4 h-4" style={{ color: 'var(--theme-text-secondary)' }} strokeWidth={1.5} />
                  </button>
                </Tooltip>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Hash className="w-4 h-4" strokeWidth={1.5} style={{ color: 'var(--theme-text-tertiary)', opacity: 0.3 }} />
              <input 
                maxLength={50}
                value={tags} onChange={(e) => setTags(e.target.value)}
                placeholder={t('community.tagsPlaceholder')}
                className="flex-1 bg-transparent text-[13px] outline-none tracking-[0.02em] placeholder:opacity-20"
                style={{ color: 'var(--theme-text-tertiary)' }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-7 pt-5" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
            <div className="flex items-center gap-1">
              <Tooltip content={t('community.imageUrl')} position="top">
                <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-2xl transition-all duration-300 group glass-sm">
                  <Image className="w-[18px] h-[18px] group-hover:scale-110 transition-transform" strokeWidth={1.5} style={{ color: 'var(--theme-text-tertiary)' }} />
                </button>
              </Tooltip>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              <Tooltip content={t('community.emojis')} position="top">
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2.5 rounded-2xl transition-all duration-300 group relative glass-sm">
                  <Smile className="w-[18px] h-[18px] group-hover:scale-110 transition-transform" strokeWidth={1.5} style={{ color: 'var(--theme-text-tertiary)' }} />
                  {showEmojiPicker && <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />}
                </button>
              </Tooltip>
              <Tooltip content={t('profile.location')} position="top">
                <button className="p-2.5 rounded-2xl transition-all duration-300 group glass-sm">
                  <MapPin className="w-[18px] h-[18px] group-hover:scale-110 transition-transform" strokeWidth={1.5} style={{ color: 'var(--theme-text-tertiary)' }} />
                </button>
              </Tooltip>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-[11px] tabular-nums tracking-[0.04em]" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.35 }}>
                {content.length}/500
              </span>
              <button 
                onClick={handleSubmit} 
                disabled={!content.trim() || isSubmitting}
                className="px-7 py-3 rounded-2xl text-[13px] font-medium tracking-[0.02em] disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.98] hover:-translate-y-1"
                style={{ 
                  backgroundColor: 'var(--theme-text-primary)',
                  color: 'var(--theme-background-primary)',
                  boxShadow: 'var(--shadow-button)'
                }}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2"><Send className="w-[15px] h-[15px]" strokeWidth={2} /> {t('community.post')}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// SIDEBAR SECTION
// ============================================
const SidebarSection: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="glass-md overflow-hidden animate-fade-in-up">
    <div className="px-6 py-5">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.15em]" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>
        {title}
      </h3>
    </div>
    <Separator />
    <div className="py-1">
      {children}
    </div>
  </div>
);

// ============================================
// COMMUNITY PAGE
// ============================================
const CommunityPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { 
    posts, isLoading, fetchPosts, addPost, updatePost, deletePost, 
    fetchTrendingPosts, hasMore, followUser, unfollowUser, fetchPersonalizedFeed 
  } = useCommunityStore();
  const { user } = useUserStore();
  const { t } = useTranslation();
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
  const [trendingTopics, setTrendingTopics] = useState<Array<{ id: string; title: string; tag: string }>>([]);
  const [followingMap, setFollowingMap] = useState<Set<string>>(new Set(user?.following || []));
  
  const observerTarget = useRef<HTMLDivElement>(null);
  const initialLoadDone = useRef(false);
  const sidebarLoadedRef = useRef(false);
  const searchRequestIdRef = useRef(0);
  const isSearchActive = searchQuery.trim().length >= 2;

  useDocumentTitle(t('community.title'));

  useEffect(() => { if (user?.following) setFollowingMap(new Set(user.following)); }, [user?.following]);

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      const q = searchParams.get('search');
      if (!q) {
        if (!isOffline() || posts.length === 0) {
          fetchPersonalizedFeed();
        }
        loadSidebarContent();
      }
    }
  }, []);

  useEffect(() => {
    const q = searchParams.get('search');
    const mode = searchParams.get('mode') as 'posts' | 'users' | null;
    
    if (q && q.trim().length >= 2) {
      setSearchQuery(q);
      const searchMode = mode === 'users' ? 'users' : 'posts';
      setSearchMode(searchMode);
      
      // Ejecutar la busqueda
      handleSearch(q, searchMode);
    }
  }, [searchParams]);

  const loadSidebarContent = useCallback(async () => {
    if (sidebarLoadedRef.current) return;
    sidebarLoadedRef.current = true;
    try {
      const users = await communityService.searchUsers('$recommended$');
      setSuggestedUsers(users.slice(0, 5));
      const trendingPosts = await communityService.getTrendingPosts();
      setTrendingTopics(trendingPosts.slice(0, 5).map((p: any) => ({
        id: p.id, title: p.title, tag: p.tags?.[0] || p.title.split(' ')[0],
      })));
    } catch (error) { sidebarLoadedRef.current = false; }
  }, []);

  const handleSearch = async (q: string, m: 'posts' | 'users' = 'posts', abortController?: AbortController) => {
    if (q.trim().length < 2) { setSearchResults({ posts: [], users: [] }); return; }
    setSearchMode(m); setIsSearching(true);
    searchRequestIdRef.current += 1;
    const currentRequestId = searchRequestIdRef.current;
    try {
      if (abortController?.signal.aborted) return;
      if (m === 'posts') {
        const r = await communityService.searchPosts(q);
        if (currentRequestId === searchRequestIdRef.current) {
          setSearchResults({ posts: (r || []).map((post: any) => ({ ...post, user: { username: post.username || t('common.anonymous').toLowerCase(), displayName: post.displayName || post.username || t('common.anonymous'), avatar: post.avatar || '' } })), users: [] });
        }
      } else {
        const r = await communityService.searchUsers(q);
        if (currentRequestId === searchRequestIdRef.current) setSearchResults({ posts: [], users: r || [] });
      }
    } catch (error: any) { if (error?.name !== 'AbortError') console.error('Search error:', error); }
    finally { if (currentRequestId === searchRequestIdRef.current) setIsSearching(false); }
  };

  const handleTabChange = async (t: 'for-you' | 'following' | 'trending') => {
    setActiveTab(t); setSearchQuery(''); setSearchResults({ posts: [], users: [] });
    if (t === 'for-you') await fetchPersonalizedFeed();
    else if (t === 'trending') await fetchTrendingPosts();
    else await fetchPosts(true, true);
  };

  const handleQuickPost = async (d: any) => {
    const p: any = { title: d.title, content: d.content, tags: d.tags };
    if (d.imageBase64) p.imageUrl = d.imageBase64;
    const r = await addPost(p);
    if (r) { setToastMessage(t('community.postCreated')); setToastType('success'); setShowToast(true); loadSidebarContent(); }
  };

  const handleCreatePost = async (d: any) => { 
    const r = await addPost(d); 
    if (r) { setToastMessage(t('community.postCreated')); setToastType('success'); setShowToast(true); setShowModal(false); loadSidebarContent(); }
  };
  const handleUpdatePost = async (d: any) => { 
    if (editingPost) { const ok = await updatePost(editingPost.id, d); if (ok) { setEditingPost(null); setToastMessage(t('community.postUpdated')); setToastType('success'); setShowToast(true); setShowModal(false); } }
  };
  const handleEdit = (p: any) => { setEditingPost(p); setShowModal(true); };
  const handleDelete = async (id: string) => { await deletePost(id); setToastMessage(t('community.postDeleted')); setToastType('success'); setShowToast(true); };
  const handleUserClick = (u: string) => navigate(`/profile/${u}`);

  const handleFollowToggle = async (targetUserId: string, targetUsername: string) => {
    const isFollowing = followingMap.has(targetUserId);
    const newMap = new Set(followingMap);
    isFollowing ? newMap.delete(targetUserId) : newMap.add(targetUserId);
    setFollowingMap(newMap);
    try {
      if (isFollowing) { await unfollowUser(targetUserId); setToastMessage(`${t('community.unfollow')} @${targetUsername}`); }
      else { await followUser(targetUserId); setToastMessage(`${t('community.following')} @${targetUsername}`); }
      setToastType('success'); setShowToast(true);
    } catch (error) { setFollowingMap(followingMap); setToastMessage(t('common.error')); setToastType('error'); setShowToast(true); }
  };

  let fp = [...posts];
  if (activeTab === 'following' && user) fp = fp.filter(p => (user.following || []).includes(p.userId));
  if (activeTab !== 'trending') fp.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const totalResults = searchMode === 'posts' ? searchResults.posts.length : searchResults.users.length;

  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-6 pb-24">
      <div className="flex gap-4 lg:gap-10">
        {/* Main Feed */}
        <div className="flex-1 min-w-0 max-w-[680px]">
          <div className="mb-8 animate-fade-in-down">
            <h1 className="text-[34px] font-light tracking-[-0.03em]" style={{ color: 'var(--theme-text-primary)' }}>
              {t('community.title')} <CachedBadge />
            </h1>
            <p className="text-[14px] mt-1.5 tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)' }}>
              {t('community.contentPlaceholder')}
            </p>
          </div>
          {!isSearchActive && <PostComposer user={user} onPost={handleQuickPost} />}
          <div className="mt-8" />
          
          {!isSearchActive && (
            <div className="flex gap-1 sm:gap-2 mb-8 p-1 sm:p-1.5 rounded-[2rem] glass-sm animate-fade-in-up">
              {[
                { id: 'for-you' as const, icon: Sparkles, label: t('community.feed') },
                { id: 'following' as const, icon: Users, label: t('community.following') },
                { id: 'trending' as const, icon: TrendingUp, label: t('community.trending') },
              ].map(tab => (
                <button
                  key={tab.id} onClick={() => handleTabChange(tab.id)}
                  className="flex-1 px-2 sm:px-5 py-2.5 sm:py-3 rounded-[1.75rem] text-[11px] sm:text-[13px] tracking-[0.02em] flex items-center justify-center gap-1 sm:gap-2 transition-all duration-500"
                  style={{ 
                    backgroundColor: activeTab === tab.id ? 'var(--theme-background-glass-hover)' : 'transparent',
                    color: activeTab === tab.id ? 'var(--theme-text-primary)' : 'var(--theme-text-tertiary)',
                    boxShadow: activeTab === tab.id ? '0 2px 12px rgba(0,0,0,0.15)' : 'none',
                    fontWeight: activeTab === tab.id ? 500 : 300,
                  }}
                >
                  <tab.icon className="w-4 h-4" strokeWidth={1.5} /> {tab.label}
                </button>
              ))}
            </div>
          )}

          {isSearchActive ? (
            <div>
              <div className="mb-8 flex items-center justify-between">
                <p className="text-[15px] tracking-[0.02em]" style={{ color: 'var(--theme-text-secondary)' }}>
                  {t('community.searchResults')} <span style={{ color: 'var(--theme-text-primary)', fontWeight: 500 }}>"{searchQuery}"</span>
                  <span className="text-[13px] ml-3" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.55 }}>({totalResults})</span>
                </p>
                <div className="flex items-center gap-1 p-1 rounded-[2rem] glass-sm">
                  <button onClick={() => handleSearch(searchQuery, 'posts')} className="px-4 py-2 rounded-[1.5rem] text-[11px] tracking-[0.03em] transition-all duration-300" style={{ backgroundColor: searchMode === 'posts' ? 'var(--theme-background-glass-hover)' : 'transparent', color: searchMode === 'posts' ? 'var(--theme-text-primary)' : 'var(--theme-text-tertiary)', fontWeight: searchMode === 'posts' ? 500 : 300 }}>{t('community.posts')}</button>
                  <button onClick={() => handleSearch(searchQuery, 'users')} className="px-4 py-2 rounded-[1.5rem] text-[11px] tracking-[0.03em] transition-all duration-300" style={{ backgroundColor: searchMode === 'users' ? 'var(--theme-background-glass-hover)' : 'transparent', color: searchMode === 'users' ? 'var(--theme-text-primary)' : 'var(--theme-text-tertiary)', fontWeight: searchMode === 'users' ? 500 : 300 }}>{t('community.users')}</button>
                </div>
              </div>
              {searchMode === 'posts' ? (
                <PostList posts={searchResults.posts} isLoading={isSearching} emptyMessage={t('community.noResults')} onUserClick={handleUserClick} />
              ) : (
                <UsersList users={searchResults.users} isLoading={isSearching} emptyMessage={t('community.noResults')} />
              )}
            </div>
          ) : (
            <div className="space-y-6">

              {fp.map(p => (
                <PostCard key={p.id} post={p} onEdit={p.userId === user?.id ? handleEdit : undefined} onDelete={p.userId === user?.id ? handleDelete : undefined} onUserClick={handleUserClick} />
              ))}
              {fp.length === 0 && !isLoading && (
                <div className="text-center py-24 glass-md rounded-[2rem]">
                  <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 glass-sm">
                    <Sparkles className="w-8 h-8" strokeWidth={1} style={{ color: 'var(--theme-text-tertiary)', opacity: 0.25 }} />
                  </div>
                  <p className="text-[15px] tracking-[0.03em]" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.35 }}>{t('community.noPosts')}</p>
                  <p className="text-[13px] mt-2 tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.2 }}>{t('community.createFirst')}</p>
                </div>
              )}
              {isLoading && (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} style={{ color: 'var(--theme-text-tertiary)', opacity: 0.3 }} />
                </div>
              )}
              {hasMore && !isLoading && fp.length > 0 && (
                <div ref={observerTarget} className="flex justify-center py-12">
                  {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} style={{ color: 'var(--theme-text-tertiary)', opacity: 0.2 }} />}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Sidebar */}
        {!isSearchActive && (
          <div className="w-[320px] hidden lg:block flex-shrink-0">
            <div 
              className="sticky top-10 sidebar-scroll-hidden overflow-y-auto space-y-6"
              style={{ maxHeight: 'calc(100vh - 9rem)' }}
            >
              <SidebarSection title={t('community.recommended')}>
                {suggestedUsers.length > 0 ? suggestedUsers.map((u, i) => (
                  <React.Fragment key={u.id}>
                    {i > 0 && <Separator />}
                    <div className="px-6 py-4 flex items-center justify-between transition-all duration-500 hover:bg-[var(--theme-background-glass-hover)]">
                      <div className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0" onClick={() => handleUserClick(u.username)}>
                        <Avatar user={u} size="sm" />
                        <div className="min-w-0">
                          <p className="text-[14px] font-medium truncate tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>{u.displayName || u.username}</p>
                          <p className="text-[12px] truncate mt-0.5 tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.6 }}>@{u.username}</p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleFollowToggle(u.id, u.username); }}
                        className="ml-3 px-4 py-2 rounded-2xl text-[12px] font-medium tracking-[0.02em] transition-all duration-500 active:scale-95 hover:-translate-y-0.5"
                        style={{ 
                          backgroundColor: followingMap.has(u.id) ? 'var(--theme-background-glass-hover)' : 'var(--theme-text-primary)',
                          color: followingMap.has(u.id) ? 'var(--theme-text-secondary)' : 'var(--theme-background-primary)',
                          boxShadow: followingMap.has(u.id) ? 'none' : 'var(--shadow-button)'
                        }}
                      >
                        {followingMap.has(u.id) ? t('community.following') : t('community.follow')}
                      </button>
                    </div>
                  </React.Fragment>
                )) : (
                  <div className="px-6 py-12 text-center text-[13px] tracking-[0.03em]" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.3 }}>{t('common.loading')}</div>
                )}
              </SidebarSection>
              
              <SidebarSection title={t('community.trending')}>
                {trendingTopics.length > 0 ? trendingTopics.map((t, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <Separator />}
                    <button 
                      onClick={() => navigate(`/community/post/${t.id}`)} 
                      className="w-full px-6 py-4 text-left transition-all duration-500 hover:bg-[var(--theme-background-glass-hover)] hover:translate-x-1"
                    >
                      <p className="text-[11px] font-medium mb-1.5 tracking-[0.04em] uppercase" style={{ color: 'var(--theme-primary)', opacity: 0.7 }}>{t.tag}</p>
                      <p className="text-[14px] font-medium truncate tracking-[0.01em]" style={{ color: 'var(--theme-text-secondary)' }}>{t.title}</p>
                    </button>
                  </React.Fragment>
                )) : (
                  <div className="px-6 py-12 text-center text-[13px] tracking-[0.03em]" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.3 }}>{t('community.noResults')}</div>
                )}
              </SidebarSection>
            </div>
          </div>
        )}
      </div>
      
      <PostFormModal isOpen={showModal} editingPost={editingPost} onClose={() => { setShowModal(false); setEditingPost(null); }} onSubmit={editingPost ? handleUpdatePost : handleCreatePost} />
      <ToastNotification isOpen={showToast} onClose={() => setShowToast(false)} message={toastMessage} type={toastType} />
    </div>
  );
};

export default CommunityPage;