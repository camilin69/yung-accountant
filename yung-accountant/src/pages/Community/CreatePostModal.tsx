// pages/Community/CreatePostModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { X, Image, Hash, Smile, Calendar, MapPin, Loader2, ArrowLeft, Send } from 'lucide-react';

interface CreatePostModalProps {
  isOpen: boolean;
  editingPost?: any;
  onClose: () => void;
  onSubmit: (data: { title: string; content: string; tags: string[] }) => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ 
  isOpen, 
  editingPost, 
  onClose, 
  onSubmit 
}) => {
  const [title, setTitle] = useState(editingPost?.title || '');
  const [content, setContent] = useState(editingPost?.content || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(editingPost?.tags || []);
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingPost) {
        setTitle(editingPost.title || '');
        setContent(editingPost.content || '');
        setTags(editingPost.tags || []);
      } else {
        setTitle('');
        setContent('');
        setTags([]);
      }
    }
  }, [isOpen, editingPost]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim().toLowerCase())) {
      setTags([...tags, tagInput.trim().toLowerCase()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput) {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsLoading(true);
    await onSubmit({ title: title.trim(), content: content.trim(), tags });
    setIsLoading(false);
    setTitle('');
    setContent('');
    setTags([]);
    onClose();
  };

  const maxChars = 1000;
  const charsLeft = maxChars - content.length;

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg rounded-[2rem] overflow-hidden glass-aero animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="lg:hidden p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
            </button>
            <h3 className="text-lg font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>
              {editingPost ? 'Edit Post' : 'Create Post'}
            </h3>
          </div>
          <button onClick={onClose} className="hidden lg:block p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
            <X className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--theme-gradient-primary)' }}>
              <span className="text-white text-sm font-medium">ME</span>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Your Post</p>
              <p className="text-xs" style={{ color: 'var(--theme-text-tertiary)' }}>Share with the community</p>
            </div>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a title (optional)"
            maxLength={100}
            className="w-full mb-3 px-0 py-1 bg-transparent border-none text-lg font-medium tracking-[0.01em] placeholder:opacity-25 focus:outline-none"
            style={{ color: 'var(--theme-text-primary)' }}
          />

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              if (e.target.value.length <= maxChars) {
                setContent(e.target.value);
              }
            }}
            placeholder="What's on your mind? Share your financial journey, tips, or questions..."
            rows={5}
            maxLength={500}
            className="w-full px-0 py-1 bg-transparent border-none text-sm resize-none focus:outline-none placeholder:opacity-25"
            style={{ color: 'var(--theme-text-secondary)', fontWeight: 350 }}
            autoFocus
          />

          <div className="flex justify-end mt-1">
            <span className={`text-xs font-medium ${charsLeft < 50 ? '' : ''}`}
              style={{ color: charsLeft < 50 ? '#EF4444' : 'var(--theme-text-tertiary)', opacity: charsLeft < 50 ? 1 : 0.45 }}>
              {charsLeft} characters left
            </span>
          </div>

          <div className="mt-5">
            <div className="flex items-center gap-2 mb-2.5">
              <Hash className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }} />
              <span className="text-xs font-medium tracking-[0.04em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>Tags</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add tags (press Enter)"
                className="flex-1 px-4 py-2.5 rounded-2xl text-xs font-medium focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm"
                style={{ color: 'var(--theme-text-primary)' }}
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2.5 rounded-2xl text-xs font-medium transition-all duration-300 hover:-translate-y-0.5 glass-sm"
                style={{ color: 'var(--theme-text-tertiary)' }}
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full glass-sm"
                    style={{ color: 'var(--theme-primary)' }}>
                    #{tag}
                    <button onClick={() => handleRemoveTag(tag)} className="hover:opacity-80 ml-1">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-5 pt-5" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
            <div className="flex gap-1.5">
              {[
                { icon: Image, color: 'var(--theme-text-tertiary)' },
                { icon: Smile, color: 'var(--theme-text-tertiary)' },
                { icon: MapPin, color: 'var(--theme-text-tertiary)' },
                { icon: Calendar, color: 'var(--theme-text-tertiary)' },
              ].map((btn, i) => (
                <button key={i} className="p-2.5 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
                  <btn.icon className="w-4 h-4" style={{ color: btn.color, opacity: 0.5 }} />
                </button>
              ))}
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || isLoading}
              className="px-6 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 flex items-center gap-2 disabled:opacity-20 disabled:cursor-not-allowed hover:-translate-y-1"
              style={{ 
                backgroundColor: content.trim() && !isLoading ? 'var(--theme-primary)' : 'var(--theme-background-glass-hover)',
                color: content.trim() && !isLoading ? '#FFFFFF' : 'var(--theme-text-tertiary)',
                boxShadow: content.trim() && !isLoading ? 'var(--shadow-button)' : 'none'
              }}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> {editingPost ? 'Update' : 'Post'}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};