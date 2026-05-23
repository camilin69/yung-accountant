// components/community/PostList.tsx
import React from 'react';
import { MessageCircle, TrendingUp, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Post } from '../../types';
import { Avatar } from '../../components/common/Avatar';

interface PostListProps {
  posts: Post[];
  isLoading?: boolean;
  emptyMessage?: string;
  onUserClick?: (userId: string) => void;
}

export const PostList: React.FC<PostListProps> = ({ posts, isLoading, emptyMessage = "No posts found", onUserClick }) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-[var(--theme-background-glass)] rounded-xl p-6 border border-[var(--theme-border-light)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[var(--theme-border-light)]" />
              <div className="space-y-2">
                <div className="h-3 w-24 bg-[var(--theme-border-light)] rounded" />
                <div className="h-2 w-16 bg-[var(--theme-border-light)] rounded" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-3/4 bg-[var(--theme-border-light)] rounded" />
              <div className="h-3 w-full bg-[var(--theme-border-light)] rounded" />
              <div className="h-3 w-2/3 bg-[var(--theme-border-light)] rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }} />
        <p className="text-sm" style={{ color: 'var(--theme-text-tertiary)' }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map(post => {
        // 🎯 Obtener datos del usuario desde post.user o desde las props raíz del post
        const userDisplayName = post.user?.displayName || (post as any).displayName || 'Anonymous';
        const userUsername = post.user?.username || (post as any).username || 'anonymous';
        const userAvatar = post.user?.avatar || (post as any).avatar || '';
        const postImageUrl = post.imageUrl || (post as any).imageUrl || '';

        return (
          <article 
            key={post.id} 
            onClick={() => navigate(`/community/post/${post.id}`)} 
            className="group bg-[var(--theme-background-glass)] rounded-xl p-6 border border-[var(--theme-border-light)] hover:border-[var(--theme-primary)]/30 transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div 
                className="flex items-center gap-3" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onUserClick?.(userUsername); 
                }}
              >
                <Avatar user={{ displayName: userDisplayName, avatar: userAvatar }} size="sm" />
                <div>
                  <p className="text-sm font-light transition-colors hover:text-[var(--theme-primary)]" style={{ color: 'var(--theme-text-primary)' }}>
                    {userDisplayName}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--theme-text-tertiary)' }}>
                    @{userUsername}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1" style={{ color: 'var(--theme-text-tertiary)' }}>
                <Clock className="w-3 h-3" />
                <span className="text-[10px]">{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            
            <h3 className="text-base font-light mb-2 transition-colors group-hover:text-[var(--theme-primary)]" style={{ color: 'var(--theme-text-primary)' }}>
              {post.title}
            </h3>
            <p className="text-sm leading-relaxed line-clamp-3" style={{ color: 'var(--theme-text-secondary)' }}>
              {post.content}
            </p>
            
            {postImageUrl && (
              <div className="mt-3 rounded-lg overflow-hidden border border-[var(--theme-border-light)]">
                <img src={postImageUrl} alt="" className="w-full h-40 object-cover" />
              </div>
            )}
            
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {post.tags.map((tag: string) => (
                  <span 
                    key={tag} 
                    className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            
            <div className="flex items-center gap-6 mt-4 pt-4 border-t" style={{ borderColor: 'var(--theme-border-dark)' }}>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--theme-text-tertiary)' }}>
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{post.likesCount || 0} likes</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--theme-text-tertiary)' }}>
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{post.commentsCount || 0} comments</span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};