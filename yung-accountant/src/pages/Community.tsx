// pages/Community.tsx

import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatDate } from '../utils/formatters';
import { Users, Heart, MessageCircle, Plus, Send } from 'lucide-react';

const Community: React.FC = () => {
  const { user, posts, addPost, likePost, deletePost } = useStore();
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTitle, setNewPostTitle] = useState('');

  const handleAddPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;
    addPost({
      title: newPostTitle,
      content: newPostContent,
    });
    setNewPostContent('');
    setNewPostTitle('');
  };

  const handleLike = (id: string) => {
    likePost(id);
  };

  const handleDeletePost = (id: string) => {
    if (confirm('Delete this post?')) {
      deletePost(id);
    }
  };

  const getUserInitial = (userId: string) => {
    if (userId === user?.id) return user?.username?.substring(0, 2).toUpperCase() || 'ME';
    return 'YG';
  };

  const getUserName = (userId: string) => {
    if (userId === user?.id) return user?.username || 'You';
    return 'Yung Nigga';
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          <Users className="inline mr-2 mb-1 w-7 h-7" />
          Yung Community
        </h1>
      </div>

      {/* Create Post Card */}
      <div className="card mb-6">
        <form onSubmit={handleAddPost}>
          <input
            type="text"
            value={newPostTitle}
            onChange={(e) => setNewPostTitle(e.target.value)}
            className="input mb-3"
            placeholder="Title (optional)"
          />
          <textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            className="input resize-none"
            rows={3}
            placeholder="Share your financial journey... 💰"
          />
          <div className="flex justify-end mt-3">
            <button type="submit" className="btn btn-primary">
              <Send className="w-4 h-4" /> Share
            </button>
          </div>
        </form>
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {posts.map(post => (
          <div key={post.id} className="card">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center font-semibold text-lg">
                {getUserInitial(post.userId)}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{getUserName(post.userId)}</div>
                <div className="text-xs text-gray-500">{formatDate(post.createdAt, 'long')}</div>
              </div>
              {post.userId === user?.id && (
                <button
                  onClick={() => handleDeletePost(post.id)}
                  className="text-gray-500 hover:text-red-500 transition-colors"
                >
                  ×
                </button>
              )}
            </div>
            {post.title && (
              <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
            )}
            <p className="text-gray-300 mb-4 leading-relaxed">{post.content}</p>
            <div className="flex gap-6 pt-3 border-t border-gray-800">
              <button
                onClick={() => handleLike(post.id)}
                className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors"
              >
                <Heart className={`w-4 h-4 ${post.likesCount > 0 ? 'fill-red-500 text-red-500' : ''}`} />
                <span className="text-sm">{post.likesCount} likes</span>
              </button>
              <button className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm">{post.commentsCount} comments</span>
              </button>
            </div>
          </div>
        ))}

        {posts.length === 0 && (
          <div className="card text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-500">No posts yet. Be the first to share!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Community;