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
import { Avatar } from '../../components/common/Avatar';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { communityService } from '../../services/community.service';

// ============================================
// POST COMPOSER - Rediseñado
// ============================================
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
    <div className={`relative backdrop-blur-2xl rounded-3xl transition-all duration-500 ease-out ${
      isExpanded 
        ? 'bg-white/10 shadow-2xl shadow-black/10 border border-white/20 ring-1 ring-white/10' 
        : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
    }`}>
      {!isExpanded ? (
        <button 
          onClick={() => setIsExpanded(true)}
          className="w-full p-5 flex items-center gap-4 group"
        >
          <div className="relative">
            <Avatar user={user} size="md" className="ring-2 ring-white/20 group-hover:ring-white/40 transition-all" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full border-2 border-black" />
          </div>
          <span className="flex-1 text-left text-sm text-white/40 font-light group-hover:text-white/60 transition-colors tracking-wide">
            Share your financial journey...
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 transition-all duration-300 hover:scale-110"
            >
              <Image className="w-4 h-4 text-white/50" />
            </button>
          </div>
        </button>
      ) : (
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar user={user} size="sm" className="ring-1 ring-white/20" />
              <div>
                <span className="text-sm font-medium text-white/90">{user?.displayName || 'You'}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <button 
                    onClick={() => setVisibility(v => v === 'public' ? 'followers' : 'public')}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-all"
                  >
                    {visibility === 'public' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {visibility === 'public' ? 'Everyone' : 'Followers'}
                  </button>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsExpanded(false)} 
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Give it a title..." 
              className="w-full bg-transparent text-lg font-light text-white/90 placeholder:text-white/20 outline-none tracking-wide"
            />
            <textarea 
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              placeholder="What's on your mind?" 
              rows={4} 
              className="w-full bg-transparent text-sm font-light text-white/70 placeholder:text-white/20 outline-none resize-none leading-relaxed"
              autoFocus 
            />
            
            {/* Image preview */}
            {images.length > 0 && (
              <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/10">
                <img src={images[0]} alt="" className="w-full h-56 object-cover" />
                <button 
                  onClick={() => setImages([])} 
                  className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-md rounded-full text-white/80 hover:bg-black/80 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Tags input */}
            <div className="flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-white/30" />
              <input 
                value={tags} 
                onChange={(e) => setTags(e.target.value)} 
                placeholder="Add tags separated by commas..." 
                className="flex-1 bg-transparent text-xs font-light text-white/50 placeholder:text-white/20 outline-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/10">
            <div className="flex items-center gap-1">
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="p-2.5 rounded-full hover:bg-white/10 transition-all duration-200 group"
              >
                <Image className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                className="p-2.5 rounded-full hover:bg-white/10 transition-all duration-200 group relative"
              >
                <Smile className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors" />
                {showEmojiPicker && <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />}
              </button>
              
              <button className="p-2.5 rounded-full hover:bg-white/10 transition-all duration-200 group">
                <MapPin className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors" />
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-white/20 font-light tabular-nums">{content.length}/500</span>
              <button 
                onClick={handleSubmit} 
                disabled={!content.trim() || isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 hover:from-violet-400 hover:via-purple-400 hover:to-fuchsia-400 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-medium rounded-full flex items-center gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 active:scale-95"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <><Send className="w-3.5 h-3.5" /> Post</>
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
// COMMUNITY PAGE - Rediseñado
// ============================================
const CommunityPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { 
    posts, isLoading, fetchPosts, addPost, updatePost, deletePost, 
    fetchTrendingPosts, hasMore, followUser, unfollowUser, fetchPersonalizedFeed 
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
  const [trendingTopics, setTrendingTopics] = useState<Array<{ id: string; title: string; tag: string }>>([]);
  const [followingMap, setFollowingMap] = useState<Set<string>>(new Set(user?.following || []));
  
  const observerTarget = useRef<HTMLDivElement>(null);
  const initialLoadDone = useRef(false);
  const sidebarLoadedRef = useRef(false);
  const searchRequestIdRef = useRef(0);
  const searchHandledRef = useRef<string>('');
  const isSearchActive = searchQuery.trim().length >= 2;

  useEffect(() => {
    if (user?.following) setFollowingMap(new Set(user.following));
  }, [user?.following]);

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      const q = searchParams.get('search');
      if (!q) {
        fetchPersonalizedFeed();
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
      const trendingPosts = await communityService.getTrendingPosts();
      const trends = trendingPosts.slice(0, 5).map((p: any) => ({
        id: p.id, title: p.title,
        tag: p.tags?.[0] || p.title.split(' ')[0],
      }));
      setTrendingTopics(trends);
    } catch (error) {
      sidebarLoadedRef.current = false;
    }
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
          const normalizedPosts = (r || []).map((post: any) => ({
            ...post,
            user: { username: post.username || 'anonymous', displayName: post.displayName || post.username || 'Anonymous', avatar: post.avatar || '' },
          }));
          setSearchResults({ posts: normalizedPosts, users: [] });
        }
      } else {
        const r = await communityService.searchUsers(q);
        if (currentRequestId === searchRequestIdRef.current) setSearchResults({ posts: [], users: r || [] });
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') console.error('Search error:', error);
    } finally {
      if (currentRequestId === searchRequestIdRef.current) setIsSearching(false);
    }
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
    if (r) { setToastMessage('Posted!'); setToastType('success'); setShowToast(true); loadSidebarContent(); }
  };

  const handleCreatePost = async (d: any) => { 
    const r = await addPost(d); 
    if (r) { setToastMessage('Created!'); setToastType('success'); setShowToast(true); setShowModal(false); loadSidebarContent(); } 
  };

  const handleUpdatePost = async (d: any) => { 
    if (editingPost) { 
      const ok = await updatePost(editingPost.id, d); 
      if (ok) { setEditingPost(null); setToastMessage('Updated!'); setToastType('success'); setShowToast(true); setShowModal(false); } 
    } 
  };

  const handleEdit = (p: any) => { setEditingPost(p); setShowModal(true); };
  const handleDelete = async (id: string) => { await deletePost(id); setToastMessage('Deleted'); setToastType('success'); setShowToast(true); };
  const handleUserClick = (u: string) => navigate(`/profile/${u}`);

  const handleFollowToggle = async (targetUserId: string, targetUsername: string) => {
    const isFollowing = followingMap.has(targetUserId);
    const newFollowingMap = new Set(followingMap);
    if (isFollowing) newFollowingMap.delete(targetUserId); else newFollowingMap.add(targetUserId);
    setFollowingMap(newFollowingMap);
    try {
      if (isFollowing) { await unfollowUser(targetUserId); setToastMessage(`Unfollowed @${targetUsername}`); }
      else { await followUser(targetUserId); setToastMessage(`Following @${targetUsername}`); }
      setToastType('success'); setShowToast(true);
    } catch (error) {
      setFollowingMap(followingMap);
      setToastMessage('Error updating follow status'); setToastType('error'); setShowToast(true);
    }
  };

  let fp = [...posts];
  if (activeTab === 'following' && user) fp = fp.filter(p => (user.following || []).includes(p.userId));
  if (activeTab !== 'trending') fp.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const totalResults = searchMode === 'posts' ? searchResults.posts.length : searchResults.users.length;

  const tabs = [
    { id: 'for-you' as const, icon: Sparkles, label: 'For You' },
    { id: 'following' as const, icon: Users, label: 'Following' },
    { id: 'trending' as const, icon: TrendingUp, label: 'Trending' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 pb-16">
      <div className="flex gap-8">
        {/* Main Feed */}
        <div className="flex-1 max-w-2xl">
          {!isSearchActive && <PostComposer user={user} onPost={handleQuickPost} />}
          <div className="mt-6" />
          
          {/* Tabs */}
          {!isSearchActive && (
            <div className="flex gap-1 mb-6 p-1 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
              {tabs.map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => handleTabChange(tab.id)} 
                  className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
                    activeTab === tab.id 
                      ? 'bg-white/15 text-white shadow-lg shadow-black/20' 
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Search Results */}
          {isSearchActive ? (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <p className="text-sm text-white/60">
                  Results for <span className="text-white/90 font-medium">"{searchQuery}"</span>
                  <span className="text-xs ml-2 text-white/30">({totalResults} {searchMode})</span>
                </p>
                <div className="flex items-center gap-1 p-0.5 bg-white/5 rounded-xl border border-white/10">
                  <button onClick={() => handleSearch(searchQuery, 'posts')} className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${searchMode === 'posts' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'}`}>Posts</button>
                  <button onClick={() => handleSearch(searchQuery, 'users')} className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${searchMode === 'users' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'}`}>Users</button>
                </div>
              </div>
              {searchMode === 'posts' ? (
                <PostList posts={searchResults.posts} isLoading={isSearching} emptyMessage="No posts found" onUserClick={handleUserClick} />
              ) : (
                <UsersList users={searchResults.users} isLoading={isSearching} emptyMessage="No users found" />
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {fp.map(p => (
                <PostCard 
                  key={p.id} post={p} 
                  onEdit={p.userId === user?.id ? handleEdit : undefined} 
                  onDelete={p.userId === user?.id ? handleDelete : undefined} 
                  onUserClick={handleUserClick} 
                />
              ))}
              {fp.length === 0 && !isLoading && (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-5 ring-1 ring-white/10">
                    <Sparkles className="w-7 h-7 text-white/20" />
                  </div>
                  <p className="text-sm text-white/30 font-light tracking-wide">No posts yet</p>
                </div>
              )}
              {isLoading && (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
                </div>
              )}
              {hasMore && !isLoading && fp.length > 0 && (
                <div ref={observerTarget} className="flex justify-center py-8">
                  {isLoadingMore && <Loader2 className="w-5 h-5 text-white/30 animate-spin" />}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="w-80 hidden lg:block flex-shrink-0">
          <div className="sticky top-24 space-y-5">
            {/* Who to follow */}
            <div className="backdrop-blur-2xl bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <h3 className="px-5 py-4 text-xs font-semibold text-white/50 uppercase tracking-widest border-b border-white/5">
                Who to follow
              </h3>
              <div className="divide-y divide-white/5">
                {suggestedUsers.length > 0 ? suggestedUsers.map(u => (
                  <div key={u.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={() => handleUserClick(u.username)}>
                      <Avatar user={u} size="sm" className="ring-1 ring-white/20" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white/80 truncate">{u.displayName || u.username}</p>
                        <p className="text-[11px] text-white/30 truncate">@{u.username}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleFollowToggle(u.id, u.username); }}
                      className={`ml-3 px-3.5 py-1.5 text-[11px] font-medium rounded-full transition-all duration-300 ${
                        followingMap.has(u.id) 
                          ? 'bg-white/10 text-white/60 hover:bg-red-500/20 hover:text-red-400' 
                          : 'bg-white text-black hover:bg-white/90'
                      }`}
                    >
                      {followingMap.has(u.id) ? 'Following' : 'Follow'}
                    </button>
                  </div>
                )) : (
                  <div className="px-5 py-8 text-center text-xs text-white/20">Loading suggestions...</div>
                )}
              </div>
            </div>
            
            {/* Trending Posts */}
            <div className="backdrop-blur-2xl bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <h3 className="px-5 py-4 text-xs font-semibold text-white/50 uppercase tracking-widest border-b border-white/5">
                Trending Posts
              </h3>
              <div className="divide-y divide-white/5">
                {trendingTopics.length > 0 ? trendingTopics.map((t, i) => (
                  <button 
                    key={i} 
                    onClick={() => navigate(`/community/post/${t.id}`)} 
                    className="w-full px-5 py-3.5 text-left hover:bg-white/5 transition-colors"
                  >
                    <p className="text-[10px] text-purple-400/70 font-medium mb-1">#{t.tag}</p>
                    <p className="text-sm text-white/70 truncate font-light">{t.title}</p>
                  </button>
                )) : (
                  <div className="px-5 py-8 text-center text-xs text-white/20">No trending posts yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <PostFormModal 
        isOpen={showModal} editingPost={editingPost} 
        onClose={() => { setShowModal(false); setEditingPost(null); }} 
        onSubmit={editingPost ? handleUpdatePost : handleCreatePost} 
      />
      <ToastNotification isOpen={showToast} onClose={() => setShowToast(false)} message={toastMessage} type={toastType} />
    </div>
  );
};

export default CommunityPage;