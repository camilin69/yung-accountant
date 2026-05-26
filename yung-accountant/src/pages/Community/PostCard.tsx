// pages/Community/PostCard.tsx
import React, { useState } from 'react';
import { 
  Heart, MessageCircle, MoreHorizontal,
  Trash2, Edit2, X
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
  onLike?: (postId: string) => void; // NUEVO: callback para actualizar estado en páginas padre
}

export const PostCard: React.FC<PostCardProps> = ({ post, onEdit, onDelete, onUserClick, onLike }) => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { likePost } = useCommunityStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, _setToastMessage] = useState('');
  const [toastType, _setToastType] = useState<'success' | 'error'>('success');
  const [imageExpanded, setImageExpanded] = useState(false);

  const isLiked = post.likedBy?.includes(user?.id) || false;
  const isOwner = post.userId === user?.id;

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

  const handleLike = (e: React.MouseEvent) => { 
    e.stopPropagation(); 
    likePost(post.id);
    // Si hay callback externo, notificar para actualizar estado padre
    if (onLike) onLike(post.id);
  };

  const handleDelete = () => {
    if (onDelete) onDelete(post.id);
    setShowDeleteConfirm(false);
    setShowMenu(false);
  };

  return (
    <>
      <div 
        onClick={handlePostClick} 
        className="group rounded-[2rem] transition-all duration-700 ease-out cursor-pointer animate-fade-in-up glass-md hover:-translate-y-2"
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-5">
            <div className="flex items-center gap-3.5">
              <button onClick={handleUserClick} className="flex-shrink-0 transition-transform duration-500 hover:scale-110">
                <Avatar user={post.user || { displayName, avatar: avatarUrl }} size="md" />
              </button>
              <div className="min-w-0">
                <button 
                  onClick={handleUserClick} 
                  className="text-[15px] font-medium hover:opacity-80 truncate block tracking-[0.01em] transition-all duration-500"
                  style={{ color: 'var(--theme-text-primary)' }}
                >
                  {displayName}
                </button>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[12px] truncate tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)' }}>@{username}</span>
                  <span className="text-[12px] select-none" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.3 }}>·</span>
                  <span className="text-[12px] whitespace-nowrap tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.65 }}>{formatDate(post.createdAt, 'relative')}</span>
                </div>
              </div>
            </div>
            
            {isOwner && (onEdit || onDelete) && (
              <div className="flex items-center gap-1">
                {onEdit && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(post); }}
                    className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm opacity-0 group-hover:opacity-100"
                    title="Edit post"
                  >
                    <Edit2 className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
                  </button>
                )}
                <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} 
                    className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm"
                  >
                    <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
                  </button>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
                      <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl z-50 overflow-hidden animate-dropdown-in glass-aero"
                        style={{ boxShadow: 'var(--shadow-glass-lg)' }}>
                        {onEdit && (
                          <button onClick={(e) => { e.stopPropagation(); onEdit(post); setShowMenu(false); }} 
                            className="w-full px-5 py-3.5 text-left text-[13px] font-medium transition-all duration-300 flex items-center gap-3 tracking-[0.02em] hover:bg-[var(--theme-background-glass-hover)]"
                            style={{ color: 'var(--theme-text-secondary)' }}>
                            <Edit2 className="w-4 h-4" strokeWidth={1.5} /> Edit Post
                          </button>
                        )}
                        {onDelete && (
                          <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); setShowMenu(false); }} 
                            className="w-full px-5 py-3.5 text-left text-[13px] font-medium transition-all duration-300 flex items-center gap-3 tracking-[0.02em] hover:bg-red-500/10"
                            style={{ color: '#EF4444', opacity: 0.8 }}>
                            <Trash2 className="w-4 h-4" strokeWidth={1.5} /> Delete Post
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {post.title && (
            <h3 className="text-[20px] font-medium mb-3 tracking-[0.01em] leading-snug" style={{ color: 'var(--theme-text-primary)' }}>
              {post.title}
            </h3>
          )}

          <p className="text-[15px] mb-5 leading-[1.75] tracking-[0.01em] whitespace-pre-wrap break-words" style={{ color: 'var(--theme-text-secondary)', fontWeight: 350 }}>
            {post.content}
          </p>

          {imageUrl && (
            <div className="relative mb-5 rounded-[1.5rem] overflow-hidden">
              <img src={imageUrl} alt="" className="w-full max-h-80 object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out" 
                onClick={(e) => { e.stopPropagation(); setImageExpanded(true); }} />
            </div>
          )}

          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {post.tags.map((tag: string, idx: number) => (
                <span key={idx} className="text-[11px] font-medium px-3 py-1.5 rounded-2xl tracking-[0.02em] transition-all duration-300 cursor-pointer hover:scale-105 glass-sm"
                  style={{ color: 'var(--theme-primary)' }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-10 pt-4" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
            <button onClick={(e) => { e.stopPropagation(); navigate(`/community/post/${post.id}`); }} 
              className="flex items-center gap-2.5 text-[13px] font-medium transition-all duration-300 group/btn hover:scale-105"
              style={{ color: 'var(--theme-text-tertiary)' }}>
              <MessageCircle className="w-[18px] h-[18px] group-hover/btn:scale-115 transition-transform duration-300" strokeWidth={1.5} /> 
              <span className="tracking-[0.02em] tabular-nums">{post.commentsCount || 0}</span>
            </button>
            <button onClick={handleLike} 
              className={`flex items-center gap-2.5 text-[13px] font-medium transition-all duration-300 group/btn hover:scale-105`}
              style={{ color: isLiked ? '#EF4444' : 'var(--theme-text-tertiary)' }}>
              <Heart className={`w-[18px] h-[18px] transition-all duration-300 ${isLiked ? 'fill-red-400 scale-110' : 'group-hover/btn:scale-115'}`} strokeWidth={1.5} /> 
              <span className="tracking-[0.02em] tabular-nums">{post.likesCount || 0}</span>
            </button>
          </div>
        </div>
      </div>

      {imageExpanded && imageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8 modal-overlay"
          onClick={() => setImageExpanded(false)}>
          <button onClick={() => setImageExpanded(false)} 
            className="absolute top-6 right-6 p-3.5 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
            <X className="w-5 h-5" style={{ color: 'var(--theme-text-secondary)' }} strokeWidth={1.5} />
          </button>
          <img src={imageUrl} alt="" className="max-w-full max-h-[90vh] object-contain rounded-[2rem]" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <ConfirmModal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={handleDelete} 
        title="Delete Post" message="This action cannot be undone." confirmText="Delete" type="danger" />
      <ToastNotification isOpen={showToast} onClose={() => setShowToast(false)} message={toastMessage} type={toastType} />
    </>
  );
};