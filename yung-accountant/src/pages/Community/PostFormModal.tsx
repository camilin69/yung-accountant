// pages/Community/PostFormModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Hash, ArrowLeft, Image, Loader2 } from 'lucide-react';

interface PostFormModalProps {
  isOpen: boolean;
  editingPost?: any;
  onClose: () => void;
  onSubmit: (data: { title: string; content: string; tags: string[]; imageUrl?: string }) => void;
}

export const PostFormModal: React.FC<PostFormModalProps> = ({ isOpen, editingPost, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageError, setImageError] = useState<string | null>(null);
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB maximo
  const TARGET_SIZE = 1 * 1024 * 1024;

  // Todos los hooks antes del return condicional
  useEffect(() => {
    if (isOpen) {
      if (editingPost) {
        setTitle(editingPost.title || '');
        setContent(editingPost.content || '');
        setTags(editingPost.tags || []);
        setImagePreview(editingPost.imageUrl || null);
        setImageBase64(null);
      } else {
        setTitle('');
        setContent('');
        setTags([]);
        setImagePreview(null);
        setImageBase64(null);
      }
    }
  }, [isOpen, editingPost]);

  // Return condicional DESPUES de todos los hooks
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
          let width = img.width;
          let height = img.height;
          
          // Redimensionar si es muy grande
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          
          // Intentar con calidad inicial
          let result = canvas.toDataURL('image/jpeg', quality);
          
          // Si aun es muy grande, reducir calidad gradualmente
          let currentQuality = quality;
          while (result.length > TARGET_SIZE && currentQuality > 0.3) {
            currentQuality -= 0.1;
            result = canvas.toDataURL('image/jpeg', currentQuality);
          }
          
          // Si aun es muy grande, reducir dimensiones
          if (result.length > TARGET_SIZE) {
            const smallerCanvas = document.createElement('canvas');
            const ratio = Math.sqrt(TARGET_SIZE / result.length);
            smallerCanvas.width = width * ratio;
            smallerCanvas.height = height * ratio;
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
    
    // Validar tamanio maximo
    if (file.size > MAX_SIZE) {
      setImageError(`Image too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max ${MAX_SIZE / (1024 * 1024)}MB`);
      return;
    }
    
    // Validar tipo
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setImageError('Only JPG, PNG and WebP are supported');
      return;
    }
    
    // Comprimir imagen
    const compressed = await compressImage(file);
    setImagePreview(compressed);
    setImageBase64(compressed);
    
    console.log(`[Image] Original: ${(file.size / 1024).toFixed(0)}KB -> Compressed: ${(compressed.length / 1024).toFixed(0)}KB`);
  };


  const handleSubmit = async () => {
    if (!content.trim()) return;
    setUploading(true);

    // Enviar base64 al backend (el backend lo sube a Cloudinary)
    onSubmit({
      title,
      content,
      tags,
      imageUrl: imageBase64 || editingPost?.imageUrl || undefined,
    });

    setUploading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--theme-background-glass)] backdrop-blur-xl border border-[var(--theme-border-light)] rounded-xl w-full max-w-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-t-xl">
          <div className="flex justify-between items-center p-5 border-b border-[var(--theme-border-light)]">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="lg:hidden p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)]">
                <ArrowLeft className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
              </button>
              <div>
                <h3 className="text-lg font-light text-[var(--theme-text-primary)]">
                  {editingPost ? 'Edit Post' : 'Create Post'}
                </h3>
              </div>
            </div>
            <button onClick={onClose} className="hidden lg:block p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)]">
              <X className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto modal-scroll p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's the topic?"
              className="w-full px-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Content *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="Share your financial journey..."
              className="w-full px-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light resize-none focus:outline-none focus:border-[var(--theme-primary)]/50"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Image (optional)</label>
            {imagePreview ? (
              <div className="relative rounded-lg overflow-hidden border border-[var(--theme-border-light)] group">
                <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover" />
                {/* Overlay con botones */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    title="Change image"
                  >
                    <Image className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => { setImagePreview(null); setImageBase64(null); setImageError(null); }}
                    className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full transition-colors"
                    title="Remove image"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
                {/* Badge de tamanio */}
                {imageBase64 && (
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 rounded text-[10px] text-white/80">
                    {(imageBase64.length / 1024).toFixed(0)}KB
                  </span>
                )}
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`w-full p-6 border-2 border-dashed rounded-lg text-center transition-colors ${
                  imageError 
                    ? 'border-red-500/50 bg-red-500/5' 
                    : 'border-[var(--theme-border-light)] hover:border-[var(--theme-primary)]/30'
                }`}
              >
                <Image className={`w-6 h-6 mx-auto mb-1 ${imageError ? 'text-red-400' : 'text-[var(--theme-text-tertiary)]'}`} />
                <p className={`text-xs ${imageError ? 'text-red-400' : 'text-[var(--theme-text-tertiary)]'}`}>
                  {imageError || 'Click to upload image'}
                </p>
                <p className="text-[10px] text-[var(--theme-text-tertiary)]/50 mt-1">Max 10MB · Auto-compressed</p>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Tags</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tags..."
                className="flex-1 px-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50"
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2.5 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-tertiary)]"
              >
                <Hash className="w-4 h-4" />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 text-[10px] text-[var(--theme-primary)]/80 bg-[var(--theme-primary)]/10 px-2 py-1 rounded-full"
                  >
                    #{tag}
                    <button onClick={() => handleRemoveTag(tag)} className="hover:text-white ml-1">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-b-xl">
          <div className="flex gap-3 p-5 border-t border-[var(--theme-border-light)]">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-tertiary)] text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || uploading}
              className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-light transition-all flex items-center justify-center gap-2 ${
                content.trim() && !uploading
                  ? 'bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] hover:scale-[1.02]'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {editingPost ? 'Update' : 'Post'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};