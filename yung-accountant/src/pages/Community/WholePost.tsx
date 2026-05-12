// pages/Community/WholePost.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Share2, Bookmark, Loader2, X } from 'lucide-react';
import { useCommunityStore, useUserStore } from '../../store';
import { Avatar } from '../../components/common/Avatar';
import { formatDate } from '../../utils/formatters';
import { communityService } from '../../services/community.service';

export const WholePost: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { likePost, likedPosts, addComment } = useCommunityStore();
  
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);

  useEffect(() => { loadPost(); }, [postId]);

  const loadPost = async () => {
    try {
      const data = await communityService.getPostById(postId!);
      setPost(data);
    } catch (error) { console.error('Error loading post:', error); }
    finally { setLoading(false); }
  };

  const handleLike = () => { if (post) likePost(post.id); };

  const handleAddComment = async () => {
    if (!commentContent.trim() || !post) return;
    setIsSubmitting(true);
    try {
      const newComment = await addComment(post.id, commentContent);
      if (newComment) {
        setPost((prev: any) => ({ ...prev, comments: [newComment, ...(prev.comments || [])], commentsCount: (prev.commentsCount || 0) + 1 }));
        setCommentContent('');
      }
    } catch (error) { console.error('Error adding comment:', error); }
    finally { setIsSubmitting(false); }
  };

  const navigateToProfile = (username: string) => navigate(`/profile/${username}`);

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-8 flex justify-center"><Loader2 className="w-8 h-8 text-[var(--theme-primary)] animate-spin" /></div>;
  if (!post) return <div className="max-w-2xl mx-auto px-4 py-8 text-center"><p className="text-sm text-[var(--theme-text-tertiary)]">Post not found</p></div>;

  const isLiked = likedPosts.has(post.id);
  const displayName = post.user?.displayName || post.displayName || 'Anonymous';
  const username = post.user?.username || post.username || 'anonymous';
  const avatarUrl = post.user?.avatar || post.avatar || '';
  const imageUrl = post.imageUrl || '';

  return (
    <div className="max-w-2xl mx-auto px-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 py-4 text-sm text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl overflow-hidden">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigateToProfile(username)} className="flex-shrink-0">
              <Avatar user={{ displayName, avatar: avatarUrl }} size="md" />
            </button>
            <div>
              <button onClick={() => navigateToProfile(username)} className="text-sm font-light text-[var(--theme-text-primary)] hover:text-[var(--theme-primary)] transition-colors">{displayName}</button>
              <p className="text-xs text-[var(--theme-text-tertiary)]">@{username} · {formatDate(post.createdAt, 'relative')}</p>
            </div>
          </div>

          <h1 className="text-xl font-light mb-3" style={{ color: 'var(--theme-text-primary)' }}>{post.title}</h1>
          <p className="text-sm leading-relaxed whitespace-pre-wrap mb-4" style={{ color: 'var(--theme-text-secondary)' }}>{post.content}</p>

          {/* Image */}
          {imageUrl && (
            <div className="relative mb-4 rounded-xl overflow-hidden border border-[var(--theme-border-light)]">
              <img src={imageUrl} alt="Post image" className="w-full max-h-96 object-cover cursor-pointer" onClick={() => setImageExpanded(true)} />
            </div>
          )}

          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag: string) => <span key={tag} className="px-2 py-1 rounded-full text-xs bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]">#{tag}</span>)}
            </div>
          )}

          <p className="text-xs text-[var(--theme-text-tertiary)] mb-4 pb-4 border-b border-[var(--theme-border-light)]">{formatDate(post.createdAt, 'long')}</p>

          <div className="flex items-center gap-6 pb-4 border-b border-[var(--theme-border-light)]">
            <div className="text-xs" style={{ color: 'var(--theme-text-tertiary)' }}><span className="font-light" style={{ color: 'var(--theme-text-primary)' }}>{post.likesCount || 0}</span> Likes</div>
            <div className="text-xs" style={{ color: 'var(--theme-text-tertiary)' }}><span className="font-light" style={{ color: 'var(--theme-text-primary)' }}>{post.commentsCount || 0}</span> Comments</div>
          </div>

          <div className="flex items-center justify-between pt-3">
            <button onClick={() => document.getElementById('comment-input')?.focus()} className="flex items-center gap-2 text-xs text-[var(--theme-text-tertiary)] hover:text-[var(--theme-primary)]"><MessageCircle className="w-5 h-5" /></button>
            <button onClick={handleLike} className={`flex items-center gap-2 text-xs transition-all ${isLiked ? 'text-red-500' : 'text-[var(--theme-text-tertiary)] hover:text-red-500'}`}><Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500' : ''}`} /></button>
            <button className="flex items-center gap-2 text-xs text-[var(--theme-text-tertiary)] hover:text-[var(--theme-primary)]"><Share2 className="w-5 h-5" /></button>
            <button className="flex items-center gap-2 text-xs text-[var(--theme-text-tertiary)] hover:text-[var(--theme-primary)]"><Bookmark className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="border-t border-[var(--theme-border-light)] p-5">
          <div className="flex gap-3">
            <Avatar user={user} size="sm" />
            <div className="flex-1">
              <textarea id="comment-input" value={commentContent} onChange={(e) => setCommentContent(e.target.value)} placeholder="Write a comment..." rows={2} className="w-full px-3 py-2 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-sm resize-none focus:outline-none focus:border-[var(--theme-primary)]/50" style={{ color: 'var(--theme-text-primary)' }} />
              <div className="flex justify-end mt-2">
                <button onClick={handleAddComment} disabled={!commentContent.trim() || isSubmitting} className="px-4 py-1.5 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] rounded-lg text-white text-xs disabled:opacity-50">{isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reply'}</button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--theme-border-light)]">
          {post.comments?.length > 0 ? (
            <div className="p-5 space-y-5">
              {post.comments.map((comment: any) => {
                const cUsername = comment.user?.username || comment.username || 'anonymous';
                const cDisplayName = comment.user?.displayName || comment.displayName || 'Anonymous';
                return (
                  <div key={comment.id} className="flex gap-3">
                    <button onClick={() => navigateToProfile(cUsername)} className="flex-shrink-0"><Avatar user={{ displayName: cDisplayName, avatar: comment.user?.avatar }} size="sm" /></button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button onClick={() => navigateToProfile(cUsername)} className="text-xs font-light text-[var(--theme-text-primary)] hover:text-[var(--theme-primary)]">{cDisplayName}</button>
                        <span className="text-[10px] text-[var(--theme-text-tertiary)]">@{cUsername}</span>
                        <span className="text-[10px] text-[var(--theme-text-tertiary)]">·</span>
                        <span className="text-[10px] text-[var(--theme-text-tertiary)]">{formatDate(comment.createdAt, 'relative')}</span>
                      </div>
                      <p className="text-sm text-[var(--theme-text-secondary)] leading-relaxed">{comment.content}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <button className="text-[10px] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-primary)]">Reply</button>
                        <button className="text-[10px] text-[var(--theme-text-tertiary)] hover:text-red-500"><Heart className="w-3 h-3 inline mr-1" />{comment.likesCount || 0}</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <MessageCircle className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.2 }} />
              <p className="text-sm" style={{ color: 'var(--theme-text-tertiary)' }}>No comments yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      {imageExpanded && imageUrl && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setImageExpanded(false)}>
          <button onClick={() => setImageExpanded(false)} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X className="w-6 h-6 text-white" /></button>
          <img src={imageUrl} alt="Full size" className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};