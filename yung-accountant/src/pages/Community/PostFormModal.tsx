// pages/Community/PostFormModal.tsx
import React, { useState } from 'react';
import { X, Send, Hash } from 'lucide-react';

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
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/[0.03] backdrop-blur-xl rounded-t-xl">
          <div className="flex justify-between items-center p-5 border-b border-white/10">
            <div>
              <h3 className="text-lg font-light text-white">{editingPost ? 'Edit Post' : 'Create Post'}</h3>
              <p className="text-xs text-white/40 mt-0.5 font-light">
                Share your thoughts with the community
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Title (optional) */}
          <div>
            <label className="block text-xs text-white/40 mb-1.5 font-light">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's the topic?"
              className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 placeholder:text-white/20"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs text-white/40 mb-1.5 font-light">Content *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="Share your financial journey, tips, or questions..."
              className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light resize-none focus:outline-none focus:border-[#6366F1]/50 placeholder:text-white/20"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs text-white/40 mb-1.5 font-light">Tags</label>
            <div className="flex gap-2">
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add tags (e.g., savings, investing)"
                  className="flex-1 px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 placeholder:text-white/20"
                />
                <button
                  onClick={handleAddTag}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 text-sm font-light transition-colors"
                >
                  <Hash className="w-4 h-4" />
                </button>
              </div>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-[10px] text-[#6366F1]/60 bg-[#6366F1]/10 px-2 py-1 rounded-full">
                    #{tag}
                    <button onClick={() => handleRemoveTag(tag)} className="hover:text-white ml-1">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white/[0.03] backdrop-blur-xl rounded-b-xl">
          <div className="flex gap-3 p-5 border-t border-white/10">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-white/[0.03] hover:bg-white/10 rounded-lg text-white/60 text-sm font-light">
              Cancel
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={!content.trim()}
              className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-light transition-all duration-300 flex items-center justify-center gap-2 ${
                content.trim()
                  ? 'bg-gradient-to-r from-[#6366F1] to-[#EC4899] hover:scale-[1.02]'
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