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
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
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
      setToastMessage(`Reply sent to @${comment.user.username}`);
      setToastType('success');
      setShowToast(true);
      setReplyContent('');
      setShowReplyInput(false);
    };

    return (
      <div className={`relative ${depth > 0 ? 'ml-8 mt-2' : 'mt-3'}`}>
        {depth > 0 && (
          <div className="absolute left-[-20px] top-0 bottom-0 w-px bg-gradient-to-b from-[#6366F1]/30 to-transparent" />
        )}
        <div className="flex gap-3">
          <button 
            onClick={() => onUserClick?.(comment.userId)}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#EC4899] flex items-center justify-center hover:scale-105 transition-transform"
          >
            <span className="text-white text-xs font-light">
              {comment.user.displayName?.charAt(0).toUpperCase() || comment.user.username?.charAt(0).toUpperCase()}
            </span>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <button 
                onClick={() => onUserClick?.(comment.userId)}
                className="text-xs font-light text-white hover:text-[#6366F1] transition-colors"
              >
                {comment.user.displayName}
              </button>
              <span className="text-[9px] text-white/40">@{comment.user.username}</span>
              <span className="text-[9px] text-white/20">•</span>
              <span className="text-[9px] text-white/40">{formatDate(comment.createdAt, 'relative')}</span>
            </div>
            <p className="text-xs text-white/70 font-light mb-2">{comment.content}</p>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => handleLikeComment(comment.id)}
                className={`flex items-center gap-1 text-[10px] transition-colors ${
                  isCommentLiked ? 'text-red-500' : 'text-white/40 hover:text-red-500'
                }`}
              >
                <Heart className={`w-3 h-3 ${isCommentLiked ? 'fill-red-500' : ''}`} />
                <span>{comment.likesCount || 0}</span>
              </button>
              <button 
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="text-[10px] text-white/40 hover:text-[#6366F1] transition-colors"
              >
                Reply
              </button>
              {isCommentOwner && (
                <button 
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-[10px] text-white/40 hover:text-red-500 transition-colors"
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
                    className="w-full px-3 py-1.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-xs font-light resize-none focus:outline-none focus:border-[#6366F1]/50"
                  />
                </div>
                <button
                  onClick={handleReply}
                  disabled={!replyContent.trim()}
                  className="px-3 py-1.5 bg-[#6366F1]/20 hover:bg-[#6366F1]/30 rounded-lg text-[#6366F1] text-xs font-light transition-colors disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Replies */}
            {hasReplies && (
              <button
                onClick={() => toggleReplies(comment.id)}
                className="mt-2 text-[9px] text-[#6366F1]/60 hover:text-[#6366F1] transition-colors"
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
          isOpen={showToast}
          onClose={() => setShowToast(false)}
          message={toastMessage}
          type={toastType}
        />
      </div>
    );
  };


  return (
    <>
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl transition-all duration-300 hover:bg-white/[0.06]">
        {/* Post Content */}
        <div className="p-5">
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => onUserClick?.(post.userId)}
                className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#EC4899] flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
              >
                <span className="text-white text-sm font-light">
                  {post.user.displayName?.charAt(0).toUpperCase() || post.user.username?.charAt(0).toUpperCase()}
                </span>
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    onClick={() => onUserClick?.(post.userId)}
                    className="text-sm font-light text-white hover:text-[#6366F1] transition-colors text-left"
                  >
                    {post.user.displayName}
                  </button>
                  <span className="text-xs text-white/40">@{post.user.username}</span>
                  <span className="text-xs text-white/20">•</span>
                  <span className="text-xs text-white/40">{formatDate(post.createdAt, 'relative')}</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4 text-white/40" />
              </button>
              
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-[#1A1A2E]/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden">
                    {isOwner ? (
                      <>
                        {onEdit && (
                          <button
                            onClick={() => {
                              onEdit(post);
                              setShowMenu(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-white/60 hover:bg-white/5 transition-colors flex items-center gap-2"
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
                      <button className="w-full px-3 py-2 text-left text-sm text-white/60 hover:bg-white/5 transition-colors flex items-center gap-2">
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
            <h3 className="text-lg font-light text-white mb-2">{post.title}</h3>
          )}
          <p className="text-sm text-white/70 font-light mb-4 leading-relaxed whitespace-pre-wrap">
            {post.content}
          </p>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag: string, idx: number) => (
                <span 
                  key={idx} 
                  className="text-[10px] text-[#6366F1]/80 bg-[#6366F1]/10 px-2 py-1 rounded-full cursor-pointer hover:bg-[#6366F1]/20 transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <button 
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-2 text-xs transition-colors ${
                showComments ? 'text-[#6366F1]' : 'text-white/40 hover:text-[#6366F1]'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{post.comments?.length || 0}</span>
            </button>
            
            <button className="flex items-center gap-2 text-xs text-white/40 hover:text-green-500 transition-colors">
              <Repeat2 className="w-4 h-4" />
              <span>0</span>
            </button>
            
            <button 
              onClick={handleLike}
              disabled={isLoading}
              className={`flex items-center gap-2 text-xs transition-colors ${
                isLiked ? 'text-red-500' : 'text-white/40 hover:text-red-500'
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
                isBookmarked ? 'text-[#6366F1]' : 'text-white/40 hover:text-[#6366F1]'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-[#6366F1]' : ''}`} />
            </button>
            
            <button className="flex items-center gap-2 text-xs text-white/40 hover:text-[#6366F1] transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="border-t border-white/10 p-5 bg-white/[0.02]">
            {/* Add Comment */}
            <div className="flex gap-3 mb-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <User className="w-4 h-4 text-white/40" />
              </div>
              <div className="flex-1">
                {replyTo && (
                  <div className="flex items-center justify-between bg-[#6366F1]/10 rounded-lg px-3 py-1.5 mb-2">
                    <span className="text-xs text-[#6366F1]">
                      Replying to @{replyTo.username}
                    </span>
                    <button 
                      onClick={() => setReplyTo(null)}
                      className="p-0.5 hover:bg-white/10 rounded"
                    >
                      <X className="w-3 h-3 text-white/40" />
                    </button>
                  </div>
                )}
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder={replyTo ? `Reply to @${replyTo.username}...` : "Write a comment..."}
                  rows={2}
                  className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light resize-none focus:outline-none focus:border-[#6366F1]/50 placeholder:text-white/20"
                />
                <div className="flex justify-end mt-2">
                  <button 
                    onClick={handleAddComment}
                    disabled={!commentContent.trim() || isLoading}
                    className="px-4 py-1.5 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-lg text-white text-xs font-light transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <MessageCircle className="w-10 h-10 text-white/20 mx-auto mb-2" />
                  <p className="text-sm text-white/40 font-light">No comments yet</p>
                  <p className="text-xs text-white/20">Be the first to share your thoughts</p>
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