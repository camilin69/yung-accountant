// pages/Community/PostCard.tsx
import React, { useState } from 'react';
import { 
  Heart, MessageCircle, Repeat2, Share2, MoreHorizontal, Bookmark, Flag,
  Trash2, Edit2, X, Send, Loader2
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import { useUserStore, useCommunityStore } from '../../store';
import ConfirmModal from '../../components/common/ConfirmModal';
import ToastNotification from '../../components/common/ToastNotification';
import { Avatar } from '../../components/common/Avatar';
import { useNavigate } from 'react-router-dom';

interface PostCardProps {
  post: any;
  onEdit?: (post: any) => void;
  onDelete?: (id: string) => void;
  onUserClick?: (userId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onEdit, onDelete, onUserClick }) => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { likePost, addComment, addReply, deleteComment, updateComment, likeComment, likedPosts } = useCommunityStore();
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [commentContent, setCommentContent] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);

  const isLiked = likedPosts.has(post.id);
  const isOwner = post.userId === user?.id;
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');

  const displayName = post.user?.displayName || post.displayName || 'Anonymous';
  const username = post.user?.username || post.username || 'anonymous';
  const avatarUrl = post.user?.avatar || post.avatar || '';
  const imageUrl = post.imageUrl || '';

  const handlePostClick = () => navigate(`/community/post/${post.id}`);

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUserClick) onUserClick(username);
    else navigate(`/profile/${username}`);
  };

  const handleLike = (e: React.MouseEvent) => { e.stopPropagation(); likePost(post.id); };

  const handleDelete = () => {
    if (onDelete) onDelete(post.id);
    setShowDeleteConfirm(false);
    setShowMenu(false);
  };

  const handleAddComment = async () => {
    if (!commentContent.trim() || !user) return;
    setIsLoading(true);
    try {
      if (replyTo) {
        await addReply(replyTo.id, commentContent);
        setToastMessage('Reply sent!');
      } else {
        await addComment(post.id, commentContent);
        setToastMessage('Comment added!');
      }
      setToastType('success');
      setShowToast(true);
      setCommentContent('');
      setReplyTo(null);
    } catch { setToastMessage('Error'); setToastType('error'); setShowToast(true); }
    finally { setIsLoading(false); }
  };

  const handleDeleteComment = async (commentId: string) => { await deleteComment(commentId); };
  const handleEditComment = async (commentId: string) => {
    if (!editCommentContent.trim()) return;
    await updateComment(commentId, editCommentContent);
    setEditingCommentId(null);
    setEditCommentContent('');
  };
  const handleLikeComment = async (commentId: string) => { if (user) likeComment(commentId); };

  const CommentItem: React.FC<{ comment: any; depth?: number }> = ({ comment, depth = 0 }) => {
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [showRepliesFor, setShowRepliesFor] = useState(false);
    const { user } = useUserStore();
    const { addReply, likedComments } = useCommunityStore();
    const isCommentLiked = likedComments.has(comment.id);
    const isCommentOwner = comment.userId === user?.id;
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isEditing = editingCommentId === comment.id;
    const cDisplayName = comment.user?.displayName || comment.displayName || 'Unknown';
    const cUsername = comment.user?.username || comment.username || 'unknown';

    const handleReply = async () => {
      if (!replyContent.trim() || !user) return;
      await addReply(comment.id, replyContent);
      setReplyContent(''); setShowReplyInput(false);
    };

    return (
      <div className={`relative ${depth > 0 ? 'ml-8 mt-2' : 'mt-3'}`}>
        {depth > 0 && <div className="absolute left-[-20px] top-0 bottom-0 w-px bg-gradient-to-b from-[var(--theme-primary)]/30 to-transparent" />}
        <div className="flex gap-3">
          <button onClick={() => onUserClick?.(cUsername)} className="flex-shrink-0">
            <Avatar user={{ displayName: cDisplayName, avatar: comment.user?.avatar || comment.avatar }} size="sm" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => onUserClick?.(cUsername)} className="text-xs font-light text-[var(--theme-text-primary)] hover:text-[var(--theme-primary)] truncate">{cDisplayName}</button>
              <span className="text-[9px] text-[var(--theme-text-tertiary)] truncate">@{cUsername}</span>
              <span className="text-[9px] text-[var(--theme-text-tertiary)]/30">·</span>
              <span className="text-[9px] text-[var(--theme-text-tertiary)] whitespace-nowrap">{formatDate(comment.createdAt, 'relative')}</span>
            </div>
            {isEditing ? (
              <div className="flex gap-2 mb-2">
                <input value={editCommentContent} onChange={(e) => setEditCommentContent(e.target.value)} className="flex-1 px-2 py-1 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded text-xs" autoFocus />
                <button onClick={() => handleEditComment(comment.id)} className="px-2 py-1 bg-[var(--theme-primary)]/20 rounded text-xs text-[var(--theme-primary)]">Save</button>
                <button onClick={() => setEditingCommentId(null)} className="px-2 py-1 bg-[var(--theme-background-glass)] rounded text-xs">Cancel</button>
              </div>
            ) : (
              <p className="text-xs text-[var(--theme-text-secondary)] font-light mb-2 break-words">{comment.content}</p>
            )}
            <div className="flex items-center gap-4">
              <button onClick={() => handleLikeComment(comment.id)} className={`flex items-center gap-1 text-[10px] transition-colors ${isCommentLiked ? 'text-red-500' : 'text-[var(--theme-text-tertiary)] hover:text-red-500'}`}>
                <Heart className={`w-3 h-3 ${isCommentLiked ? 'fill-red-500' : ''}`} />{comment.likesCount || 0}
              </button>
              <button onClick={() => { setShowReplyInput(!showReplyInput); setReplyTo({ id: comment.id, username: cUsername }); }} className="text-[10px] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-primary)]">Reply</button>
              {isCommentOwner && (
                <>
                  <button onClick={() => { setEditingCommentId(comment.id); setEditCommentContent(comment.content); }} className="text-[10px] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-primary)]">Edit</button>
                  <button onClick={() => handleDeleteComment(comment.id)} className="text-[10px] text-[var(--theme-text-tertiary)] hover:text-red-500">Delete</button>
                </>
              )}
            </div>
            {showReplyInput && (
              <div className="mt-2 flex gap-2">
                <input value={replyContent} onChange={(e) => setReplyContent(e.target.value)} placeholder={`Reply to @${cUsername}...`} className="flex-1 px-2 py-1 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded text-xs" autoFocus />
                <button onClick={handleReply} disabled={!replyContent.trim()} className="px-2 py-1 bg-[var(--theme-primary)]/20 rounded text-xs text-[var(--theme-primary)] disabled:opacity-50"><Send className="w-3 h-3" /></button>
              </div>
            )}
            {hasReplies && (
              <button onClick={() => setShowRepliesFor(!showRepliesFor)} className="mt-2 text-[9px] text-[var(--theme-primary)]/60 hover:text-[var(--theme-primary)]">
                {showRepliesFor ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
              </button>
            )}
            {showRepliesFor && hasReplies && <div className="mt-2 space-y-2">{comment.replies.map((reply: any) => <CommentItem key={reply.id} comment={reply} depth={depth + 1} />)}</div>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div onClick={handlePostClick} className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl transition-all duration-300 hover:border-[var(--theme-primary)]/20 cursor-pointer">
        <div className="p-5">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <button onClick={handleUserClick} className="flex-shrink-0 cursor-pointer">
                <Avatar user={post.user || { displayName, avatar: avatarUrl }} size="md" />
              </button>
              <div className="min-w-0">
                <button onClick={handleUserClick} className="cursor-pointer text-sm font-light text-[var(--theme-text-primary)] hover:text-[var(--theme-primary)] transition-colors truncate block">{displayName}</button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--theme-text-tertiary)] truncate">@{username}</span>
                  <span className="text-xs text-[var(--theme-text-tertiary)]/30">·</span>
                  <span className="text-xs text-[var(--theme-text-tertiary)] whitespace-nowrap">{formatDate(post.createdAt, 'relative')}</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="p-1.5 rounded-full hover:bg-[var(--theme-background-glass-hover)] transition-colors">
                <MoreHorizontal className="w-4 h-4 text-[var(--theme-text-tertiary)]" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--theme-background-secondary)]/95 backdrop-blur-xl border border-[var(--theme-border-light)] rounded-lg shadow-2xl z-50 overflow-hidden">
                    {isOwner ? (
                      <>
                        {onEdit && <button onClick={(e) => { e.stopPropagation(); onEdit(post); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--theme-background-glass-hover)] flex items-center gap-2" style={{ color: 'var(--theme-text-secondary)' }}><Edit2 className="w-3.5 h-3.5" /> Edit Post</button>}
                        <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-red-500/80 hover:bg-red-500/10 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Delete Post</button>
                      </>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--theme-background-glass-hover)] flex items-center gap-2" style={{ color: 'var(--theme-text-secondary)' }}><Flag className="w-3.5 h-3.5" /> Report</button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {post.title && <h3 className="text-lg font-light mb-2" style={{ color: 'var(--theme-text-primary)' }}>{post.title}</h3>}
          <p className="text-sm font-light mb-4 leading-relaxed whitespace-pre-wrap break-words" style={{ color: 'var(--theme-text-secondary)' }}>{post.content}</p>

          {/* Image */}
          {imageUrl && (
            <div className="relative mb-4 rounded-xl overflow-hidden border border-[var(--theme-border-light)]">
              <img src={imageUrl} alt="Post image" className="w-full max-h-80 object-cover cursor-pointer" onClick={(e) => { e.stopPropagation(); setImageExpanded(true); }} />
            </div>
          )}

          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag: string, idx: number) => (
                <span key={idx} className="text-[10px] text-[var(--theme-primary)]/80 bg-[var(--theme-primary)]/10 px-2 py-1 rounded-full cursor-pointer hover:bg-[var(--theme-primary)]/20 transition-colors">#{tag}</span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-[var(--theme-border-light)]">
            <button onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }} className={`flex items-center gap-2 text-xs transition-colors ${showComments ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-primary)]'}`}>
              <MessageCircle className="w-4 h-4" /> <span>{post.commentsCount || post.comments?.length || 0}</span>
            </button>
            <button className="flex items-center gap-2 text-xs text-[var(--theme-text-tertiary)] hover:text-green-500 transition-colors"><Repeat2 className="w-4 h-4" /></button>
            <button onClick={handleLike} className={`flex items-center gap-2 text-xs transition-all duration-200 ${isLiked ? 'text-red-500 scale-110' : 'text-[var(--theme-text-tertiary)] hover:text-red-500'}`}>
              <Heart className={`w-4 h-4 transition-all ${isLiked ? 'fill-red-500' : ''}`} /> <span>{post.likesCount || 0}</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); setIsBookmarked(!isBookmarked); }} className={`flex items-center gap-2 text-xs transition-colors ${isBookmarked ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-primary)]'}`}>
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-[var(--theme-primary)]' : ''}`} />
            </button>
            <button className="flex items-center gap-2 text-xs text-[var(--theme-text-tertiary)] hover:text-blue-500 transition-colors"><Share2 className="w-4 h-4" /></button>
          </div>
        </div>

        {showComments && (
          <div className="border-t border-[var(--theme-border-light)] p-5 bg-[var(--theme-background-glass)]/50 rounded-b-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-3 mb-4">
              <div className="flex-shrink-0"><Avatar user={user} size="sm" /></div>
              <div className="flex-1 min-w-0">
                {replyTo && (
                  <div className="flex items-center justify-between bg-[var(--theme-primary)]/10 rounded-lg px-3 py-1.5 mb-2">
                    <span className="text-xs text-[var(--theme-primary)]">Replying to @{replyTo.username}</span>
                    <button onClick={() => setReplyTo(null)} className="p-0.5 hover:bg-[var(--theme-primary)]/20 rounded"><X className="w-3 h-3 text-[var(--theme-primary)]" /></button>
                  </div>
                )}
                <textarea value={commentContent} onChange={(e) => setCommentContent(e.target.value)} placeholder="Write a comment..." rows={2} className="w-full px-3 py-2 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-sm resize-none focus:outline-none focus:border-[var(--theme-primary)]/50" style={{ color: 'var(--theme-text-primary)' }} />
                <div className="flex justify-end mt-2">
                  <button onClick={handleAddComment} disabled={!commentContent.trim() || isLoading} className="px-4 py-1.5 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] rounded-lg text-white text-xs disabled:opacity-50">{isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Post'}</button>
                </div>
              </div>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto modal-scroll">
              {post.comments?.map((comment: any) => <CommentItem key={comment.id} comment={comment} />)}
              {(!post.comments || post.comments.length === 0) && (
                <div className="text-center py-8">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.2 }} />
                  <p className="text-sm" style={{ color: 'var(--theme-text-tertiary)' }}>No comments yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Image Modal */}
      {imageExpanded && imageUrl && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setImageExpanded(false)}>
          <button onClick={() => setImageExpanded(false)} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X className="w-6 h-6 text-white" /></button>
          <img src={imageUrl} alt="Full size" className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <ConfirmModal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={handleDelete} title="Delete Post" message="Are you sure?" confirmText="Delete" type="danger" />
      <ToastNotification isOpen={showToast} onClose={() => setShowToast(false)} message={toastMessage} type={toastType} />
    </>
  );
};