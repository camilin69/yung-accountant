// pages/Community/PostCard.tsx
import React, { useState } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Repeat2, 
  Share2, 
  MoreHorizontal, 
  Bookmark, 
  Flag,
  User,
  Trash2,
  Edit2,
  X,
  Send,
  Loader2
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import { useUserStore, usePostStore } from '../../store';
import ConfirmModal from '../../components/common/ConfirmModal';
import ToastNotification from '../../components/common/ToastNotification';

interface PostCardProps {
  post: any;
  onEdit?: (post: any) => void;
  onDelete?: (id: string) => void;
  onUserClick?: (userId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onEdit, onDelete, onUserClick }) => {
  const { user } = useUserStore();
  const { likePost, addComment, addReply, deleteComment, likeComment } = usePostStore();
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [commentContent, setCommentContent] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; username: string; displayName: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isLiked = post.likedBy?.includes(user?.id) || false;
  const isOwner = post.userId === user?.id;
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleLike = async () => {
    if (!user) return;
    setIsLoading(true);
    await likePost(post.id, user.id);
    setIsLoading(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(post.id);
    } 
    setShowDeleteConfirm(false);
    setShowMenu(false);
    setToastMessage('Post deleted successfully');
    setToastType('success');
    setShowToast(true);
  };

  const handleAddComment = async () => {
    if (!commentContent.trim() || !user) return;
    setIsLoading(true);
    
    if (replyTo) {
      await addReply(post.id, replyTo.id, { content: commentContent });
      setToastMessage(`Reply sent to @${replyTo.username}`);
    } else {
      await addComment(post.id, { content: commentContent });
      setToastMessage('Comment added!');
    }
    
    setToastType('success');
    setShowToast(true);
    setCommentContent('');
    setReplyTo(null);
    setIsLoading(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(post.id, commentId);
    setToastMessage('Comment deleted');
    setToastType('success');
    setShowToast(true);
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;
    await likeComment(post.id, commentId, user.id);
  };

  interface CommentItemProps {
    comment: any;
    depth?: number;
    onUserClick?: (userId: string) => void;
    handleLikeComment: (commentId: string) => Promise<void>;
    handleDeleteComment: (commentId: string) => Promise<void>;
    setReplyTo: (reply: { id: string; username: string; displayName: string } | null) => void;
  }

  const CommentItem: React.FC<CommentItemProps> = ({ 
    comment, 
    depth = 0,
    onUserClick,
    handleLikeComment,
    handleDeleteComment,
    setReplyTo
  }) => {
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const { user } = useUserStore();
    const { addReply } = usePostStore();
    const [showToastLocal, setShowToastLocal] = useState(false);
    const [toastMessageLocal, setToastMessageLocal] = useState('');
    const [toastTypeLocal, setToastTypeLocal] = useState<'success' | 'error' | 'warning' | 'info'>('success');
    const [showRepliesFor, setShowRepliesFor] = useState<string[]>([]);

    const isCommentLiked = comment.likedBy?.includes(user?.id) || false;
    const isCommentOwner = comment.userId === user?.id;
    const hasReplies = comment.replies && comment.replies.length > 0;

    const toggleReplies = (commentId: string) => {
      setShowRepliesFor(prev => 
        prev.includes(commentId) 
          ? prev.filter(id => id !== commentId)
          : [...prev, commentId]
      );
    };

    const handleReply = async () => {
      if (!replyContent.trim() || !user) return;
      await addReply(post.id, comment.id, { content: replyContent });
      setToastMessageLocal(`Reply sent to @${comment.user.username}`);
      setToastTypeLocal('success');
      setShowToastLocal(true);
      setReplyContent('');
      setShowReplyInput(false);
    };

    return (
      <div className={`relative ${depth > 0 ? 'ml-8 mt-2' : 'mt-3'}`}>
        {depth > 0 && (
          <div className="absolute left-[-20px] top-0 bottom-0 w-px bg-gradient-to-b from-[var(--theme-primary)]/30 to-transparent" />
        )}
        <div className="flex gap-3">
          <button 
            onClick={() => onUserClick?.(comment.userId)}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-secondary)] flex items-center justify-center hover:scale-105 transition-transform"
          >
            <span className="text-white text-xs font-light">
              {comment.user.displayName?.charAt(0).toUpperCase() || comment.user.username?.charAt(0).toUpperCase()}
            </span>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <button 
                onClick={() => onUserClick?.(comment.userId)}
                className="text-xs font-light text-[var(--theme-text-primary)] hover:text-[var(--theme-primary)] transition-colors"
              >
                {comment.user.displayName}
              </button>
              <span className="text-[9px] text-[var(--theme-text-tertiary)]">@{comment.user.username}</span>
              <span className="text-[9px] text-[var(--theme-text-tertiary)]/30">•</span>
              <span className="text-[9px] text-[var(--theme-text-tertiary)]">{formatDate(comment.createdAt, 'relative')}</span>
            </div>
            <p className="text-xs text-[var(--theme-text-secondary)] font-light mb-2">{comment.content}</p>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => handleLikeComment(comment.id)}
                className={`flex items-center gap-1 text-[10px] transition-colors ${
                  isCommentLiked ? 'text-red-500' : 'text-[var(--theme-text-tertiary)] hover:text-red-500'
                }`}
              >
                <Heart className={`w-3 h-3 ${isCommentLiked ? 'fill-red-500' : ''}`} />
                <span>{comment.likesCount || 0}</span>
              </button>
              <button 
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="text-[10px] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-primary)] transition-colors"
              >
                Reply
              </button>
              {isCommentOwner && (
                <button 
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-[10px] text-[var(--theme-text-tertiary)] hover:text-red-500 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>

            {/* Reply Input */}
            {showReplyInput && (
              <div className="mt-2 flex gap-2">
                <div className="flex-1">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder={`Reply to @${comment.user.username}...`}
                    rows={1}
                    className="w-full px-3 py-1.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-xs font-light resize-none focus:outline-none focus:border-[var(--theme-primary)]/50 placeholder:text-[var(--theme-text-tertiary)]/20"
                  />
                </div>
                <button
                  onClick={handleReply}
                  disabled={!replyContent.trim()}
                  className="px-3 py-1.5 bg-[var(--theme-primary)]/20 hover:bg-[var(--theme-primary)]/30 rounded-lg text-[var(--theme-primary)] text-xs font-light transition-colors disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Replies */}
            {hasReplies && (
              <button
                onClick={() => toggleReplies(comment.id)}
                className="mt-2 text-[9px] text-[var(--theme-primary)]/60 hover:text-[var(--theme-primary)] transition-colors"
              >
                {showRepliesFor.includes(comment.id) ? 'Hide' : 'Show'} {comment.replies.length} replies
              </button>
            )}

            {showRepliesFor.includes(comment.id) && hasReplies && (
              <div className="mt-2 space-y-2">
                {comment.replies.map((reply: any) => (
                  <CommentItem 
                    key={reply.id} 
                    comment={reply} 
                    depth={depth + 1}
                    onUserClick={onUserClick}
                    handleLikeComment={handleLikeComment}
                    handleDeleteComment={handleDeleteComment}
                    setReplyTo={setReplyTo}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <ToastNotification
          isOpen={showToastLocal}
          onClose={() => setShowToastLocal(false)}
          message={toastMessageLocal}
          type={toastTypeLocal}
        />
      </div>
    );
  };

  return (
    <>
      <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl transition-all duration-300 hover:bg-[var(--theme-background-glass-hover)]">
        {/* Post Content */}
        <div className="p-5">
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => onUserClick?.(post.userId)}
                className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-secondary)] flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
              >
                <span className="text-white text-sm font-light">
                  {post.user.displayName?.charAt(0).toUpperCase() || post.user.username?.charAt(0).toUpperCase()}
                </span>
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    onClick={() => onUserClick?.(post.userId)}
                    className="text-sm font-light text-[var(--theme-text-primary)] hover:text-[var(--theme-primary)] transition-colors text-left"
                  >
                    {post.user.displayName}
                  </button>
                  <span className="text-xs text-[var(--theme-text-tertiary)]">@{post.user.username}</span>
                  <span className="text-xs text-[var(--theme-text-tertiary)]/30">•</span>
                  <span className="text-xs text-[var(--theme-text-tertiary)]">{formatDate(post.createdAt, 'relative')}</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-full hover:bg-[var(--theme-background-glass-hover)] transition-colors"
              >
                <MoreHorizontal className="w-4 h-4 text-[var(--theme-text-tertiary)]" />
              </button>
              
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--theme-background-secondary)]/90 backdrop-blur-xl border border-[var(--theme-border-light)] rounded-lg shadow-2xl z-50 overflow-hidden">
                    {isOwner ? (
                      <>
                        {onEdit && (
                          <button
                            onClick={() => {
                              onEdit(post);
                              setShowMenu(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-[var(--theme-text-secondary)] hover:bg-[var(--theme-background-glass-hover)] transition-colors flex items-center gap-2"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit Post
                          </button>
                        )}
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="w-full px-3 py-2 text-left text-sm text-red-500/60 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete Post
                        </button>
                      </>
                    ) : (
                      <button className="w-full px-3 py-2 text-left text-sm text-[var(--theme-text-secondary)] hover:bg-[var(--theme-background-glass-hover)] transition-colors flex items-center gap-2">
                        <Flag className="w-3.5 h-3.5" /> Report
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Content */}
          {post.title && (
            <h3 className="text-lg font-light text-[var(--theme-text-primary)] mb-2">{post.title}</h3>
          )}
          <p className="text-sm text-[var(--theme-text-secondary)] font-light mb-4 leading-relaxed whitespace-pre-wrap">
            {post.content}
          </p>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag: string, idx: number) => (
                <span 
                  key={idx} 
                  className="text-[10px] text-[var(--theme-primary)]/80 bg-[var(--theme-primary)]/10 px-2 py-1 rounded-full cursor-pointer hover:bg-[var(--theme-primary)]/20 transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--theme-border-light)]">
            <button 
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-2 text-xs transition-colors ${
                showComments ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-primary)]'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{post.comments?.length || 0}</span>
            </button>
            
            <button className="flex items-center gap-2 text-xs text-[var(--theme-text-tertiary)] hover:text-green-500 transition-colors">
              <Repeat2 className="w-4 h-4" />
              <span>0</span>
            </button>
            
            <button 
              onClick={handleLike}
              disabled={isLoading}
              className={`flex items-center gap-2 text-xs transition-colors ${
                isLiked ? 'text-red-500' : 'text-[var(--theme-text-tertiary)] hover:text-red-500'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500' : ''}`} />
              )}
              <span>{post.likesCount || 0}</span>
            </button>
            
            <button 
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={`flex items-center gap-2 text-xs transition-colors ${
                isBookmarked ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-primary)]'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-[var(--theme-primary)]' : ''}`} />
            </button>
            
            <button className="flex items-center gap-2 text-xs text-[var(--theme-text-tertiary)] hover:text-[var(--theme-primary)] transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="border-t border-[var(--theme-border-light)] p-5 bg-[var(--theme-background-glass)]/50">
            {/* Add Comment */}
            <div className="flex gap-3 mb-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--theme-background-glass)] flex items-center justify-center border border-[var(--theme-border-light)]">
                <User className="w-4 h-4 text-[var(--theme-text-tertiary)]" />
              </div>
              <div className="flex-1">
                {replyTo && (
                  <div className="flex items-center justify-between bg-[var(--theme-primary)]/10 rounded-lg px-3 py-1.5 mb-2">
                    <span className="text-xs text-[var(--theme-primary)]">
                      Replying to @{replyTo.username}
                    </span>
                    <button 
                      onClick={() => setReplyTo(null)}
                      className="p-0.5 hover:bg-[var(--theme-background-glass-hover)] rounded"
                    >
                      <X className="w-3 h-3 text-[var(--theme-text-tertiary)]" />
                    </button>
                  </div>
                )}
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder={replyTo ? `Reply to @${replyTo.username}...` : "Write a comment..."}
                  rows={2}
                  className="w-full px-3 py-2 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light resize-none focus:outline-none focus:border-[var(--theme-primary)]/50 placeholder:text-[var(--theme-text-tertiary)]/20"
                />
                <div className="flex justify-end mt-2">
                  <button 
                    onClick={handleAddComment}
                    disabled={!commentContent.trim() || isLoading}
                    className="px-4 py-1.5 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] rounded-lg text-white text-xs font-light transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Post'}
                  </button>
                </div>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
              {post.comments?.map((comment: any) => (
                <CommentItem 
                  key={comment.id} 
                  comment={comment}
                  onUserClick={onUserClick}
                  handleLikeComment={handleLikeComment}
                  handleDeleteComment={handleDeleteComment}
                  setReplyTo={setReplyTo}
                />
              ))}
              {(!post.comments || post.comments.length === 0) && (
                <div className="text-center py-8">
                  <MessageCircle className="w-10 h-10 text-[var(--theme-text-tertiary)]/20 mx-auto mb-2" />
                  <p className="text-sm text-[var(--theme-text-tertiary)] font-light">No comments yet</p>
                  <p className="text-xs text-[var(--theme-text-tertiary)]/30">Be the first to share your thoughts</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />

      <ToastNotification
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </>
  );
};