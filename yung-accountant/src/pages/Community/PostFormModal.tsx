// pages/Community/PostFormModal.tsx
import React, { useState } from 'react';
import { X, Send, Hash, ArrowLeft } from 'lucide-react';

interface PostFormModalProps {
  isOpen: boolean;
  editingPost?: any;
  onClose: () => void;
  onSubmit: (data: { title: string; content: string; tags: string[] }) => void;
}

export const PostFormModal: React.FC<PostFormModalProps> = ({ isOpen, editingPost, onClose, onSubmit }) => {
  const [title, setTitle] = useState(editingPost?.title || '');
  const [content, setContent] = useState(editingPost?.content || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(editingPost?.tags || []);

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit({ title, content, tags });
      setTitle('');
      setContent('');
      setTags([]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--theme-background-glass)] backdrop-blur-xl border border-[var(--theme-border-light)] rounded-xl w-full max-w-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-t-xl">
          <div className="flex justify-between items-center p-5 border-b border-[var(--theme-border-light)]">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="lg:hidden p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors">
                <ArrowLeft className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
              </button>
              <div>
                <h3 className="text-lg font-light text-[var(--theme-text-primary)]">
                  {editingPost ? 'Edit Post' : 'Create Post'}
                </h3>
                <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 font-light">
                  Share your thoughts with the community
                </p>
              </div>
            </div>
            <button onClick={onClose} className="hidden lg:block p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors">
              <X className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto modal-scroll p-5 space-y-4">
          <div>
            <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's the topic?"
              className="w-full px-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50 placeholder:text-[var(--theme-text-tertiary)]/20"
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Content *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="Share your financial journey, tips, or questions..."
              className="w-full px-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light resize-none focus:outline-none focus:border-[var(--theme-primary)]/50 placeholder:text-[var(--theme-text-tertiary)]/20"
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Tags</label>
            <div className="flex gap-2">
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add tags (e.g., savings, investing)"
                  className="flex-1 px-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50 placeholder:text-[var(--theme-text-tertiary)]/20"
                />
                <button
                  onClick={handleAddTag}
                  className="px-4 py-2.5 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-tertiary)] text-sm font-light transition-colors"
                >
                  <Hash className="w-4 h-4" />
                </button>
              </div>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-[10px] text-[var(--theme-primary)]/80 bg-[var(--theme-primary)]/10 px-2 py-1 rounded-full">
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
            <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-tertiary)] text-sm font-light">
              Cancel
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={!content.trim()}
              className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-light transition-all duration-300 flex items-center justify-center gap-2 ${
                content.trim()
                  ? 'bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] hover:scale-[1.02]'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              {editingPost ? 'Update' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};