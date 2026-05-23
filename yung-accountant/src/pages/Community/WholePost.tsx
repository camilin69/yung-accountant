// pages/Community/WholePost.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Loader2, X } from 'lucide-react';
import { useCommunityStore, useUserStore } from '../../store';
import { Avatar } from '../../components/common/Avatar';
import { formatDate } from '../../utils/formatters';
import { communityService } from '../../services/community.service';
import ToastNotification from '../../components/common/ToastNotification';

export const WholePost: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { likePost, addComment, likeComment, deleteComment } = useCommunityStore();
  
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const loadedRef = useRef(false);

  useEffect(() => { 
    if (postId && !loadedRef.current) {
      loadedRef.current = true;
      loadPost(); loadComments();
      useCommunityStore.getState().recordView?.(postId);
    }
  }, [postId]);

  const loadPost = async () => {
    try { setLoading(true); setError(null);
      const data = await communityService.getPostById(postId!);
      if (!data) setError('Post not found'); else setPost(data);
    } catch (error) { setError('Error loading post'); }
    finally { setLoading(false); }
  };

  const loadComments = async () => {
    try { const data = await communityService.getComments(postId!); setComments(data || []); }
    catch (error) { /* silently handle */ }
  };

  const isLiked = post?.likedBy?.includes(user?.id) || false;

  const handleLike = async () => { 
    if (!post) return;
    const wasLiked = isLiked;
    setPost((prev: any) => ({
      ...prev,
      likesCount: wasLiked ? Math.max(0, (prev.likesCount || 1) - 1) : (prev.likesCount || 0) + 1,
      likedBy: wasLiked ? (prev.likedBy || []).filter((id: string) => id !== user?.id) : [...(prev.likedBy || []), user?.id],
    }));
    try { await likePost(post.id); } catch { loadPost(); }
  };

  const handleAddComment = async () => {
    if (!commentContent.trim() || !post) return;
    setIsSubmitting(true);
    try {
      await addComment(post.id, commentContent);
      await loadComments();
      setPost((prev: any) => ({ ...prev, commentsCount: (prev.commentsCount || 0) + 1 }));
      setCommentContent('');
      setToastMessage('Comment added'); setToastType('success'); setShowToast(true);
    } catch { setToastMessage('Error'); setToastType('error'); setShowToast(true); }
    finally { setIsSubmitting(false); }
  };

  const handleLikeComment = async (commentId: string) => {
    try { await likeComment(commentId); setComments((prev: any[]) => prev.map((c: any) => toggleCommentLike(c, commentId))); }
    catch { /* silently handle */ }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setComments((prev: any[]) => prev.filter((c: any) => c.id !== commentId));
      setPost((prev: any) => ({ ...prev, commentsCount: Math.max(0, (prev.commentsCount || 1) - 1) }));
      setToastMessage('Comment deleted'); setToastType('success'); setShowToast(true);
    } catch { /* silently handle */ }
  };

  const handleReplyAdded = () => { loadComments(); };

  const toggleCommentLike = (comment: any, targetId: string): any => {
    if (comment.id === targetId) {
      const isCommentLiked = comment.likedBy?.includes(user?.id);
      return {
        ...comment,
        likesCount: isCommentLiked ? Math.max(0, (comment.likesCount || 1) - 1) : (comment.likesCount || 0) + 1,
        likedBy: isCommentLiked ? (comment.likedBy || []).filter((id: string) => id !== user?.id) : [...(comment.likedBy || []), user?.id],
      };
    }
    if (comment.replies?.length) return { ...comment, replies: comment.replies.map((r: any) => toggleCommentLike(r, targetId)) };
    return comment;
  };

  const navigateToProfile = (username: string) => navigate(`/profile/${username}`);

  if (loading) return (
    <div className="max-w-[680px] mx-auto px-4 py-32 flex justify-center">
      <Loader2 className="w-6 h-6 animate-spin" strokeWidth={1.5} style={{ color: 'var(--theme-text-tertiary)', opacity: 0.35 }} />
    </div>
  );
  
  if (error || !post) return (
    <div className="max-w-[680px] mx-auto px-4 py-32 text-center">
      <p className="text-[15px] tracking-[0.02em] font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>{error || 'Post not found'}</p>
      <button onClick={() => navigate(-1)} className="mt-6 px-6 py-3 rounded-2xl text-[13px] font-medium transition-all duration-500 hover:-translate-y-1 glass-sm"
        style={{ color: 'var(--theme-text-secondary)' }}>
        Go back
      </button>
    </div>
  );

  const displayName = post.user?.displayName || post.displayName || 'Anonymous';
  const username = post.user?.username || post.username || 'anonymous';
  const avatarUrl = post.user?.avatar || post.avatar || '';
  const imageUrl = post.imageUrl || '';

  return (
    <div className="max-w-[680px] mx-auto px-4 pb-24">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2.5 py-6 text-[12px] font-medium uppercase tracking-[0.15em] transition-all duration-500 hover:-translate-x-1"
        style={{ color: 'var(--theme-text-tertiary)' }}>
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back
      </button>

      <div className="rounded-[2rem] overflow-hidden glass-aero animate-fade-in-up">
        <div className="p-7">
          <div className="flex items-center gap-3.5 mb-6">
            <button onClick={() => navigateToProfile(username)} className="flex-shrink-0 transition-transform duration-500 hover:scale-110">
              <Avatar user={{ displayName, avatar: avatarUrl }} size="md" />
            </button>
            <div>
              <button onClick={() => navigateToProfile(username)} className="text-[15px] font-medium block tracking-[0.01em] transition-colors duration-300"
                style={{ color: 'var(--theme-text-primary)' }}>
                {displayName}
              </button>
              <p className="text-[12px] mt-0.5 tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.55 }}>
                @{username} · {formatDate(post.createdAt, 'relative')}
              </p>
            </div>
          </div>

          <h1 className="text-[24px] font-medium mb-4 tracking-[0.01em] leading-snug" style={{ color: 'var(--theme-text-primary)' }}>{post.title}</h1>
          <p className="text-[16px] leading-[1.8] mb-6 tracking-[0.01em] whitespace-pre-wrap" style={{ color: 'var(--theme-text-secondary)', fontWeight: 350 }}>{post.content}</p>

          {imageUrl && (
            <div className="relative mb-6 rounded-[1.5rem] overflow-hidden">
              <img src={imageUrl} alt="" className="w-full max-h-[500px] object-cover cursor-pointer hover:scale-[1.02] transition-transform duration-700 ease-out" onClick={() => setImageExpanded(true)} />
            </div>
          )}

          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag: string) => (
                <span key={tag} className="text-[11px] font-medium px-3 py-1.5 rounded-2xl tracking-[0.02em] glass-sm"
                  style={{ color: 'var(--theme-primary)' }}>#{tag}</span>
              ))}
            </div>
          )}

          <p className="text-[12px] mb-6 pb-6 tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.35, borderBottom: '1px solid var(--theme-border-dark)' }}>
            {formatDate(post.createdAt, 'long')}
          </p>

          <div className="flex items-center gap-10 pb-6" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
            <span className="text-[13px] font-medium tracking-[0.02em]" style={{ color: 'var(--theme-text-secondary)', opacity: 0.65 }}>
              <span style={{ color: 'var(--theme-text-primary)', opacity: 1 }}>{post.likesCount || 0}</span> Likes
            </span>
            <span className="text-[13px] font-medium tracking-[0.02em]" style={{ color: 'var(--theme-text-secondary)', opacity: 0.65 }}>
              <span style={{ color: 'var(--theme-text-primary)', opacity: 1 }}>{comments.length}</span> Comments
            </span>
          </div>

          <div className="flex items-center gap-10 pt-6">
            <button onClick={() => document.getElementById('comment-input')?.focus()} className="flex items-center gap-2.5 text-[13px] font-medium transition-all duration-300 hover:scale-105"
              style={{ color: 'var(--theme-text-tertiary)' }}>
              <MessageCircle className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <button onClick={handleLike} className={`flex items-center gap-2.5 text-[13px] font-medium transition-all duration-300 hover:scale-105 ${isLiked ? '' : ''}`}
              style={{ color: isLiked ? '#EF4444' : 'var(--theme-text-tertiary)' }}>
              <Heart className={`w-5 h-5 transition-all duration-300 ${isLiked ? 'fill-red-400 scale-110' : ''}`} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="p-7" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
          <div className="flex gap-3.5 items-start">
            <Avatar user={user} size="sm" className="flex-shrink-0" />
            <div className="flex-1">
              <textarea 
                id="comment-input" value={commentContent} onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Write a comment..." rows={3}
                className="w-full px-5 py-4 rounded-2xl text-[14px] resize-none focus:outline-none transition-all duration-500 tracking-[0.01em] leading-relaxed placeholder:opacity-30 glass-sm"
                style={{ color: 'var(--theme-text-secondary)', fontWeight: 350 }}
              />
              <div className="flex justify-end mt-3">
                <button onClick={handleAddComment} disabled={!commentContent.trim() || isSubmitting}
                  className="px-6 py-2.5 rounded-2xl text-[13px] font-medium tracking-[0.02em] disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.98] hover:-translate-y-1"
                  style={{ backgroundColor: 'var(--theme-text-primary)', color: 'var(--theme-background-primary)', boxShadow: 'var(--shadow-button)' }}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
          {comments.length > 0 ? (
            <div className="p-7 space-y-6">
              {comments.map((comment: any) => (
                <CommentItem key={comment.id} comment={comment} onLike={handleLikeComment} onDelete={handleDeleteComment} onReplyAdded={handleReplyAdded} isOwner={comment.userId === user?.id} currentUserId={user?.id} currentUser={user} onNavigate={navigateToProfile} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <div className="w-16 h-16 rounded-[2rem] flex items-center justify-center mx-auto mb-5 glass-sm">
                <MessageCircle className="w-6 h-6" strokeWidth={1.5} style={{ color: 'var(--theme-text-tertiary)', opacity: 0.2 }} />
              </div>
              <p className="text-[13px] tracking-[0.03em] font-medium" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.25 }}>No comments yet</p>
            </div>
          )}
        </div>
      </div>

      {imageExpanded && imageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8 modal-overlay" onClick={() => setImageExpanded(false)}>
          <button onClick={() => setImageExpanded(false)} className="absolute top-6 right-6 p-3.5 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
            <X className="w-5 h-5" style={{ color: 'var(--theme-text-secondary)' }} strokeWidth={1.5} />
          </button>
          <img src={imageUrl} alt="" className="max-w-full max-h-[90vh] object-contain rounded-[2rem]" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <ToastNotification isOpen={showToast} onClose={() => setShowToast(false)} message={toastMessage} type={toastType} />
    </div>
  );
};

// ============================================
// CommentItem
// ============================================
const CommentItem: React.FC<{
  comment: any; isReply?: boolean;
  onLike: (id: string) => void; onDelete: (id: string) => void;
  onReplyAdded: () => void; isOwner: boolean;
  currentUserId: string | undefined; currentUser: any;
  onNavigate: (username: string) => void;
}> = ({ comment, isReply = false, onLike, onDelete, onReplyAdded, isOwner, currentUserId, currentUser, onNavigate }) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const { addReply } = useCommunityStore();
  
  const cUsername = comment.user?.username || comment.username || 'anonymous';
  const cDisplayName = comment.user?.displayName || comment.displayName || 'Anonymous';
  const cAvatar = comment.user?.avatar || comment.avatar || '';
  const isCommentLiked = comment.likedBy?.includes(currentUserId) || false;
  const hasReplies = comment.replies && comment.replies.length > 0;

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return;
    setIsSubmittingReply(true);
    try { await addReply(comment.id, replyContent); setReplyContent(''); setShowReplyInput(false); onReplyAdded(); }
    catch { /* silently handle */ }
    finally { setIsSubmittingReply(false); }
  };

  return (
    <div>
      <div className="flex gap-3 items-start">
        <button onClick={() => onNavigate(cUsername)} className="flex-shrink-0 mt-1 transition-transform duration-300 hover:scale-110">
          <Avatar user={{ displayName: cDisplayName, avatar: cAvatar }} size="sm" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <button onClick={() => onNavigate(cUsername)} className="text-[13px] font-medium transition-colors duration-300 tracking-[0.01em]"
              style={{ color: 'var(--theme-text-primary)' }}>{cDisplayName}</button>
            <span className="text-[11px] tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.45 }}>@{cUsername}</span>
            <span className="text-[11px]" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.25 }}>·</span>
            <span className="text-[11px] tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.55 }}>{formatDate(comment.createdAt, 'relative')}</span>
          </div>
          <p className="text-[14px] leading-[1.7] mb-3 tracking-[0.01em]" style={{ color: 'var(--theme-text-secondary)', fontWeight: 350 }}>{comment.content}</p>
          
          <div className="flex items-center gap-6">
            <button onClick={() => onLike(comment.id)} className={`flex items-center gap-1.5 text-[11px] font-medium transition-all duration-300 hover:scale-105 ${isCommentLiked ? '' : ''}`}
              style={{ color: isCommentLiked ? '#EF4444' : 'var(--theme-text-tertiary)' }}>
              <Heart className={`w-3 h-3 transition-all ${isCommentLiked ? 'fill-red-400' : ''}`} strokeWidth={1.5} />{comment.likesCount || 0}
            </button>
            {!isReply && (
              <button onClick={() => setShowReplyInput(!showReplyInput)} className="text-[11px] font-medium transition-colors duration-300 tracking-[0.02em] hover:opacity-80"
                style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>Reply</button>
            )}
            {isOwner && (
              <button onClick={() => onDelete(comment.id)} className="text-[11px] font-medium transition-colors duration-300 tracking-[0.02em] hover:text-red-400"
                style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>Delete</button>
            )}
          </div>

          {showReplyInput && (
            <div className="mt-4 flex gap-2.5 items-start">
              <Avatar user={currentUser} size="sm" className="flex-shrink-0" />
              <div className="flex-1">
                <input type="text" value={replyContent} onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={`Reply to @${cUsername}...`}
                  className="w-full px-4 py-2.5 rounded-2xl text-[13px] focus:outline-none transition-all duration-500 tracking-[0.01em] placeholder:opacity-30 glass-sm"
                  style={{ color: 'var(--theme-text-secondary)', fontWeight: 350 }}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmitReply(); } if (e.key === 'Escape') { setShowReplyInput(false); setReplyContent(''); } }}
                />
                <div className="flex justify-end gap-2 mt-2.5">
                  <button onClick={() => { setShowReplyInput(false); setReplyContent(''); }} className="px-4 py-2 text-[11px] font-medium tracking-[0.02em] transition-colors duration-300 hover:opacity-80"
                    style={{ color: 'var(--theme-text-tertiary)', opacity: 0.55 }}>Cancel</button>
                  <button onClick={handleSubmitReply} disabled={!replyContent.trim() || isSubmittingReply}
                    className="px-5 py-2 rounded-2xl text-[11px] font-medium tracking-[0.02em] disabled:opacity-20 transition-all duration-300 hover:-translate-y-0.5 glass-sm"
                    style={{ color: 'var(--theme-text-primary)' }}>
                    {isSubmittingReply ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reply'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isReply && hasReplies && (
        <div className="ml-10 mt-3">
          <button onClick={() => setShowReplies(!showReplies)} className="text-[10px] font-medium tracking-[0.04em] uppercase transition-colors duration-300 hover:opacity-80"
            style={{ color: 'var(--theme-primary)', opacity: 0.55 }}>
            {showReplies ? '− Hide' : '+ Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
          </button>
          {showReplies && (
            <div className="mt-4 pl-6 space-y-5" style={{ borderLeft: '1px solid var(--theme-border-dark)' }}>
              {comment.replies.map((reply: any) => (
                <CommentItem key={reply.id} comment={reply} isReply={true} onLike={onLike} onDelete={onDelete} onReplyAdded={onReplyAdded} isOwner={reply.userId === currentUserId} currentUserId={currentUserId} currentUser={currentUser} onNavigate={onNavigate} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};