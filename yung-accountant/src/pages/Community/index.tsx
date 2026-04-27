// pages/Community/index.tsx
import React, { useState } from 'react';
import { 
  Plus, 
  TrendingUp, 
  Users, 
  MessageCircle, 
  Search, 
  Filter,
  Sparkles,
} from 'lucide-react';
import { usePostStore, useUserStore } from '../../store';
import { PostCard } from './PostCard';
import { CreatePostModal } from './CreatePostModal';
import { TrendingSidebar } from './TrendingSidebar';
import ToastNotification from '../../components/common/ToastNotification';
import { useNavigate } from 'react-router-dom';

const Community: React.FC = () => {
  const navigate = useNavigate();
  const { posts, addPost, updatePost, deletePost } = usePostStore();
  const { user } = useUserStore();
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'for-you' | 'following' | 'trending'>('for-you');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  // Filter posts based on search and tab
  let filteredPosts = posts.filter(post => 
    post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
    post.user?.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (activeTab === 'following' && user) {
    const followingIds = user.following || [];
    filteredPosts = filteredPosts.filter(post => followingIds.includes(post.userId));
  }

  // Sort by date (newest first)
  filteredPosts = filteredPosts.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleCreatePost = async (data: { title: string; content: string; tags: string[] }) => {
    addPost(data);
    setToastMessage('Post created successfully!');
    setToastType('success');
    setShowToast(true);
    setShowModal(false);
  };

  const handleUpdatePost = async (data: { title: string; content: string; tags: string[] }) => {
    if (editingPost) {
      updatePost(editingPost.id, data);
      setEditingPost(null);
      setToastMessage('Post updated successfully!');
      setToastType('success');
      setShowToast(true);
      setShowModal(false);
    }
  };

  const handleEdit = (post: any) => {
    setEditingPost(post);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    deletePost(id);
    setToastMessage('Post deleted successfully');
    setToastType('success');
    setShowToast(true);
  };

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const handleTopicClick = (topic: string) => {
    setSearchQuery(topic);
    setActiveTab('for-you');
  };

  // Calculate community stats
  const totalPosts = posts.length;
  const totalLikes = posts.reduce((sum, post) => sum + (post.likesCount || 0), 0);
  const totalComments = posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0);

  const navItems = [
    { id: 'for-you', label: 'For You', icon: Sparkles },
    { id: 'following', label: 'Following', icon: Users },
    { id: 'trending', label: 'Trending', icon: TrendingUp },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-light bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight">
                Community
              </h1>
              <p className="text-xs text-white/40 mt-0.5 font-light">
                Connect with fellow financial enthusiasts
              </p>
            </div>
            <button
              onClick={() => {
                setEditingPost(null);
                setShowModal(true);
              }}
              className="group relative px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#EC4899] hover:scale-[1.02] transition-all duration-300 text-white text-sm font-light flex items-center gap-2 overflow-hidden rounded-full"
            >
              <Plus className="w-4 h-4" />
              Post
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white/[0.03] rounded-lg p-3 text-center">
              <p className="text-xs text-white/40">Posts</p>
              <p className="text-lg font-light text-white">{totalPosts}</p>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3 text-center">
              <p className="text-xs text-white/40">Likes</p>
              <p className="text-lg font-light text-white">{totalLikes}</p>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3 text-center">
              <p className="text-xs text-white/40">Comments</p>
              <p className="text-lg font-light text-white">{totalComments}</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1 mb-6 border-b border-white/10">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`px-4 py-2 text-sm font-light transition-colors relative flex items-center gap-2 ${
                  activeTab === item.id
                    ? 'text-[#6366F1]'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {activeTab === item.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#6366F1] to-[#EC4899]" />
                )}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts, tags, or users..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 placeholder:text-white/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <Filter className="w-4 h-4 text-white/30 hover:text-white/60" />
                </button>
              )}
            </div>
          </div>

          {/* Feed */}
          <div className="space-y-4">
            {filteredPosts.length > 0 ? (
              filteredPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onEdit={post.userId === user?.id ? handleEdit : undefined}
                  onDelete={post.userId === user?.id ? handleDelete : undefined}
                  onUserClick={handleUserClick}
                />
              ))
            ) : (
              <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
                {activeTab === 'following' ? (
                  <>
                    <Users className="w-16 h-16 mx-auto mb-4 text-white/20" />
                    <p className="text-white/40 text-sm font-light">No posts from people you follow yet</p>
                    <p className="text-xs text-white/30 mt-1">Follow more people to see their posts here</p>
                    <button 
                      onClick={() => setActiveTab('for-you')}
                      className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm font-light"
                    >
                      Explore For You
                    </button>
                  </>
                ) : searchQuery ? (
                  <>
                    <Search className="w-16 h-16 mx-auto mb-4 text-white/20" />
                    <p className="text-white/40 text-sm font-light">No posts found matching "{searchQuery}"</p>
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm font-light"
                    >
                      Clear Search
                    </button>
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 text-white/20" />
                    <p className="text-white/40 text-sm font-light">No posts yet</p>
                    <button 
                      onClick={() => setShowModal(true)} 
                      className="mt-4 px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-full text-white text-sm font-light hover:scale-[1.02] transition-transform"
                    >
                      Create First Post
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 hidden lg:block">
          <div className="sticky top-20">
            <TrendingSidebar 
              onUserClick={handleUserClick}
              onTopicClick={handleTopicClick}
            />
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showModal}
        editingPost={editingPost}
        onClose={() => {
          setShowModal(false);
          setEditingPost(null);
        }}
        onSubmit={editingPost ? handleUpdatePost : handleCreatePost}
      />

      {/* Toast Notification */}
      <ToastNotification
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </div>
  );
};

export default Community;