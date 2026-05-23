// pages/Community/WholePost.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Loader2, X, Send } from 'lucide-react';
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
      useCommunityStore.getState().recordView(postId);
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
    catch (error) { console.error('Error loading comments:', error); }
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
    try { await likePost(post.id); } catch (error) { loadPost(); }
  };

  const handleAddComment = async () => {
    if (!commentContent.trim() || !post) return;
    setIsSubmitting(true);
    try {
      const newComment = await addComment(post.id, commentContent);
      if (newComment) {
        await loadComments();
        setPost((prev: any) => ({ ...prev, commentsCount: (prev.commentsCount || 0) + 1 }));
        setCommentContent('');
        setToastMessage('Comment added'); setToastType('success'); setShowToast(true);
      }
    } catch (error) { setToastMessage('Error'); setToastType('error'); setShowToast(true); }
    finally { setIsSubmitting(false); }
  };

  const handleLikeComment = async (commentId: string) => {
    try { await likeComment(commentId); setComments((prev: any[]) => prev.map((c: any) => toggleCommentLike(c, commentId))); }
    catch (error) { console.error('Error liking comment:', error); }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setComments((prev: any[]) => prev.filter((c: any) => c.id !== commentId));
      setPost((prev: any) => ({ ...prev, commentsCount: Math.max(0, (prev.commentsCount || 1) - 1) }));
      setToastMessage('Comment deleted'); setToastType('success'); setShowToast(true);
    } catch (error) { console.error('Error deleting comment:', error); }
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
    <div className="max-w-2xl mx-auto px-4 py-24 flex justify-center">
      <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
    </div>
  );
  
  if (error || !post) return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <p className="text-sm text-white/40">{error || 'Post not found'}</p>
      <button onClick={() => navigate(-1)} className="mt-4 px-5 py-2 bg-white/10 text-white/70 rounded-xl text-sm font-light hover:bg-white/15 transition-all">
        Go back
      </button>
    </div>
  );

  const displayName = post.user?.displayName || post.displayName || 'Anonymous';
  const username = post.user?.username || post.username || 'anonymous';
  const avatarUrl = post.user?.avatar || post.avatar || '';
  const imageUrl = post.imageUrl || '';

  return (
    <div className="max-w-2xl mx-auto px-4 pb-16">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 py-5 text-xs text-white/30 hover:text-white/60 transition-colors uppercase tracking-widest font-medium">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      {/* Post Card */}
      <div className="backdrop-blur-2xl bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-6">
          {/* Author */}
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => navigateToProfile(username)} className="flex-shrink-0">
              <Avatar user={{ displayName, avatar: avatarUrl }} size="md" className="ring-1 ring-white/20" />
            </button>
            <div>
              <button onClick={() => navigateToProfile(username)} className="text-sm font-medium text-white/85 hover:text-white transition-colors">
                {displayName}
              </button>
              <p className="text-[11px] text-white/30 mt-0.5">@{username} · {formatDate(post.createdAt, 'relative')}</p>
            </div>
          </div>

          {/* Content */}
          <h1 className="text-xl font-light text-white/90 mb-3 tracking-tight">{post.title}</h1>
          <p className="text-[15px] leading-relaxed text-white/60 font-light mb-5 whitespace-pre-wrap">{post.content}</p>

          {/* Image */}
          {imageUrl && (
            <div className="relative mb-5 rounded-xl overflow-hidden ring-1 ring-white/10 cursor-pointer" onClick={() => setImageExpanded(true)}>
              <img src={imageUrl} alt="" className="w-full max-h-96 object-cover hover:scale-[1.02] transition-transform duration-500" />
            </div>
          )}

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {post.tags.map((tag: string) => (
                <span key={tag} className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-300/80 ring-1 ring-purple-500/20">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Meta */}
          <p className="text-[11px] text-white/20 mb-5 pb-5 border-b border-white/5">{formatDate(post.createdAt, 'long')}</p>

          {/* Stats */}
          <div className="flex items-center gap-8 pb-5 border-b border-white/5">
            <span className="text-xs text-white/30"><span className="font-medium text-white/60">{post.likesCount || 0}</span> Likes</span>
            <span className="text-xs text-white/30"><span className="font-medium text-white/60">{comments.length}</span> Comments</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-8 pt-5">
            <button onClick={() => document.getElementById('comment-input')?.focus()} className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors">
              <MessageCircle className="w-5 h-5" />
            </button>
            <button onClick={handleLike} className={`flex items-center gap-2 text-xs transition-all ${isLiked ? 'text-red-400' : 'text-white/30 hover:text-red-400'}`}>
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-400' : ''} ${isLiked ? 'scale-110' : ''} transition-transform`} />
            </button>
          </div>
        </div>

        {/* Comment Input */}
        <div className="border-t border-white/5 p-6">
          <div className="flex gap-3 items-start">
            <Avatar user={user} size="sm" className="flex-shrink-0 ring-1 ring-white/10" />
            <div className="flex-1">
              <textarea 
                id="comment-input" value={commentContent} onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Write a comment..." rows={2}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white/70 placeholder:text-white/20 resize-none focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all font-light"
              />
              <div className="flex justify-end mt-3">
                <button onClick={handleAddComment} disabled={!commentContent.trim() || isSubmitting}
                  className="px-5 py-2.5 bg-white text-black rounded-xl text-xs font-medium disabled:opacity-30 hover:bg-white/90 transition-all active:scale-95">
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>Post</>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="border-t border-white/5">
          {comments.length > 0 ? (
            <div className="p-6 space-y-5">
              {comments.map((comment: any) => (
                <CommentItem 
                  key={comment.id} comment={comment}
                  onLike={handleLikeComment} onDelete={handleDeleteComment}
                  onReplyAdded={handleReplyAdded}
                  isOwner={comment.userId === user?.id} currentUserId={user?.id}
                  currentUser={user} onNavigate={navigateToProfile}
                />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 ring-1 ring-white/10">
                <MessageCircle className="w-5 h-5 text-white/20" />
              </div>
              <p className="text-xs text-white/20 font-light tracking-wide">No comments yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Image */}
      {imageExpanded && imageUrl && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setImageExpanded(false)}>
          <button onClick={() => setImageExpanded(false)} className="absolute top-4 right-4 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all">
            <X className="w-5 h-5 text-white" />
          </button>
          <img src={imageUrl} alt="" className="max-w-full max-h-[90vh] object-contain rounded-2xl" onClick={(e) => e.stopPropagation()} />
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
    catch (error) { console.error('Error adding reply:', error); }
    finally { setIsSubmittingReply(false); }
  };

  return (
    <div>
      <div className="flex gap-3 items-start">
        <button onClick={() => onNavigate(cUsername)} className="flex-shrink-0 mt-0.5">
          <Avatar user={{ displayName: cDisplayName, avatar: cAvatar }} size="sm" className="ring-1 ring-white/10" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => onNavigate(cUsername)} className="text-xs font-medium text-white/70 hover:text-white transition-colors">{cDisplayName}</button>
            <span className="text-[10px] text-white/30">@{cUsername}</span>
            <span className="text-[10px] text-white/20">·</span>
            <span className="text-[10px] text-white/25">{formatDate(comment.createdAt, 'relative')}</span>
          </div>
          <p className="text-sm text-white/50 font-light leading-relaxed mb-2">{comment.content}</p>
          
          <div className="flex items-center gap-5">
            <button onClick={() => onLike(comment.id)} className={`flex items-center gap-1 text-[10px] transition-colors ${isCommentLiked ? 'text-red-400' : 'text-white/25 hover:text-red-400'}`}>
              <Heart className={`w-3 h-3 ${isCommentLiked ? 'fill-red-400' : ''}`} />{comment.likesCount || 0}
            </button>
            {!isReply && (
              <button onClick={() => setShowReplyInput(!showReplyInput)} className="text-[10px] text-white/25 hover:text-white/60 transition-colors">Reply</button>
            )}
            {isOwner && (
              <button onClick={() => onDelete(comment.id)} className="text-[10px] text-white/25 hover:text-red-400 transition-colors">Delete</button>
            )}
          </div>

          {showReplyInput && (
            <div className="mt-3 flex gap-2 items-start">
              <Avatar user={currentUser} size="sm" className="flex-shrink-0 ring-1 ring-white/10" />
              <div className="flex-1">
                <input type="text" value={replyContent} onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={`Reply to @${cUsername}...`}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white/60 placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all font-light"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmitReply(); } if (e.key === 'Escape') { setShowReplyInput(false); setReplyContent(''); } }}
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => { setShowReplyInput(false); setReplyContent(''); }} className="px-3 py-1 text-[10px] text-white/30 hover:text-white/60 transition-colors">Cancel</button>
                  <button onClick={handleSubmitReply} disabled={!replyContent.trim() || isSubmittingReply} className="px-3 py-1 bg-white/10 text-white/70 rounded-lg text-[10px] font-medium disabled:opacity-30 hover:bg-white/20 transition-all">
                    {isSubmittingReply ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reply'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isReply && hasReplies && (
        <div className="ml-8 mt-2">
          <button onClick={() => setShowReplies(!showReplies)} className="text-[9px] text-purple-400/60 hover:text-purple-400 font-medium transition-colors">
            {showReplies ? '− Hide' : '+ Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
          </button>
          {showReplies && (
            <div className="mt-3 pl-4 border-l border-white/10 space-y-4">
              {comment.replies.map((reply: any) => (
                <CommentItem key={reply.id} comment={reply} isReply={true}
                  onLike={onLike} onDelete={onDelete} onReplyAdded={onReplyAdded}
                  isOwner={reply.userId === currentUserId} currentUserId={currentUserId}
                  currentUser={currentUser} onNavigate={onNavigate}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};