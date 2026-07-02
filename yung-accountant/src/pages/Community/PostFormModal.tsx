// pages/Community/PostFormModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Hash, ArrowLeft, Image, Loader2 } from 'lucide-react';
import { useTranslation } from '../../i18n';
import Tooltip from '../../components/common/Tooltip';

interface PostFormModalProps {
  isOpen: boolean;
  editingPost?: any;
  onClose: () => void;
  onSubmit: (data: { title: string; content: string; tags: string[]; imageUrl?: string }) => void;
}

export const PostFormModal: React.FC<PostFormModalProps> = ({ isOpen, editingPost, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const MAX_SIZE = 10 * 1024 * 1024;
  const TARGET_SIZE = 1 * 1024 * 1024;

  useEffect(() => {
    if (isOpen) {
      if (editingPost) {
        setTitle(editingPost.title || '');
        setContent(editingPost.content || '');
        setTags(editingPost.tags || []);
        setImagePreview(editingPost.imageUrl || null);
        setImageBase64(null);
      } else {
        setTitle(''); setContent(''); setTags([]); setImagePreview(null); setImageBase64(null);
      }
    }
  }, [isOpen, editingPost]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => setTags(tags.filter(t => t !== tag));

  const compressImage = (file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width, height = img.height;
          if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          let result = canvas.toDataURL('image/jpeg', quality);
          let currentQuality = quality;
          while (result.length > TARGET_SIZE && currentQuality > 0.3) { currentQuality -= 0.1; result = canvas.toDataURL('image/jpeg', currentQuality); }
          if (result.length > TARGET_SIZE) {
            const smallerCanvas = document.createElement('canvas');
            const ratio = Math.sqrt(TARGET_SIZE / result.length);
            smallerCanvas.width = width * ratio; smallerCanvas.height = height * ratio;
            const ctx2 = smallerCanvas.getContext('2d')!;
            ctx2.drawImage(img, 0, 0, smallerCanvas.width, smallerCanvas.height);
            result = smallerCanvas.toDataURL('image/jpeg', 0.7);
          }
          resolve(result);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);
    if (file.size > MAX_SIZE) { setImageError(`Image too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max ${MAX_SIZE / (1024 * 1024)}MB`); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setImageError('Only JPG, PNG and WebP are supported'); return; }
    const compressed = await compressImage(file);
    setImagePreview(compressed);
    setImageBase64(compressed);
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setUploading(true);
    onSubmit({ title, content, tags, imageUrl: imageBase64 || editingPost?.imageUrl || undefined });
    setUploading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg flex flex-col max-h-[85vh] rounded-[2rem] overflow-hidden glass-aero animate-scale-in">
        <div className="flex justify-between items-center p-5" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
          <div className="flex items-center gap-3">
            <Tooltip content={t('common.back')} position="bottom">
              <button onClick={onClose} className="lg:hidden p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
                <ArrowLeft className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
              </button>
            </Tooltip>
            <h3 className="text-lg font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>
              {editingPost ? t('community.editPost') : t('community.newPost')}
            </h3>
          </div>
          <Tooltip content={t('common.close')} position="bottom">
            <button onClick={onClose} className="hidden lg:block p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
              <X className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
            </button>
          </Tooltip>
        </div>

        <div className="flex-1 overflow-y-auto modal-scroll p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>{t('community.title_placeholder')}</label>
            <input maxLength={100} type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('community.title_placeholder')}
              className="w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm"
              style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }} />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>{t('community.content')}</label>
            <textarea maxLength={500} value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder={t('community.contentPlaceholder')}
              className="w-full px-4 py-2.5 rounded-2xl text-sm resize-none focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm"
              style={{ color: 'var(--theme-text-primary)', fontWeight: 350 }} />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>{t('community.imageUrl')}</label>
            {imagePreview ? (
              <div className="relative rounded-[1.25rem] overflow-hidden group glass-sm">
                <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <Tooltip content={t('common.edit')} position="top">
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full transition-all hover:scale-110 glass-sm">
                      <Image className="w-4 h-4 text-white" />
                    </button>
                  </Tooltip>
                  <Tooltip content={t('common.remove')} position="top">
                    <button onClick={() => { setImagePreview(null); setImageBase64(null); setImageError(null); }} className="p-2 rounded-full transition-all hover:scale-110" style={{ backgroundColor: 'rgba(239,68,68,0.3)' }}>
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()}
                className={`w-full p-6 rounded-2xl text-center transition-all duration-500 hover:-translate-y-1 glass-sm ${
                  imageError ? 'ring-1 ring-red-500/30' : ''
                }`}>
                <Image className="w-6 h-6 mx-auto mb-1" style={{ color: imageError ? '#EF4444' : 'var(--theme-text-tertiary)', opacity: imageError ? 1 : 0.5 }} />
                <p className="text-xs font-medium" style={{ color: imageError ? '#EF4444' : 'var(--theme-text-tertiary)' }}>
                  {imageError || t('community.imageUrlPlaceholder')}
                </p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.35 }}>Max 10MB · Auto-compressed</p>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} className="hidden" />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>{t('community.tags')}</label>
            <div className="flex gap-2">
              <input maxLength={50} type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                placeholder={t('community.tagsPlaceholder')} className="flex-1 px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm"
                style={{ color: 'var(--theme-text-primary)', fontWeight: 350 }} />
              <Tooltip content={t('common.add')} position="top">
                <button onClick={handleAddTag} className="px-4 py-2.5 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
                  <Hash className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} />
                </button>
              </Tooltip>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full glass-sm"
                    style={{ color: 'var(--theme-primary)' }}>
                    #{tag}
                    <button onClick={() => handleRemoveTag(tag)} className="hover:opacity-80 ml-1">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
          <div className="flex gap-3 p-5">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 glass-sm"
              style={{ color: 'var(--theme-text-tertiary)' }}>{t('common.cancel')}</button>
            <button onClick={handleSubmit} disabled={!content.trim() || uploading}
              className="flex-1 px-4 py-2.5 rounded-2xl text-white text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-20 disabled:cursor-not-allowed hover:-translate-y-1"
              style={{ 
                backgroundColor: content.trim() && !uploading ? 'var(--theme-primary)' : 'var(--theme-background-glass-hover)',
                boxShadow: content.trim() && !uploading ? 'var(--shadow-button)' : 'none'
              }}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" />{t('community.post')}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};