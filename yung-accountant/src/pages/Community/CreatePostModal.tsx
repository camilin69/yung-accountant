// pages/Community/CreatePostModal.tsx
import React, { useState, useRef } from 'react';
import { X, Image, Hash, Smile, Calendar, MapPin, Loader2 } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A2E]/95 backdrop-blur-xl border border-white/20 rounded-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-light text-white">
            {editingPost ? 'Edit Post' : 'Create Post'}
          </h3>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* User Info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#EC4899] flex items-center justify-center">
              <span className="text-white text-sm font-light">ME</span>
            </div>
            <div>
              <p className="text-sm font-light text-white">Your Post</p>
              <p className="text-xs text-white/40">Share with the community</p>
            </div>
          </div>

          {/* Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a title (optional)"
            className="w-full mb-3 px-0 py-1 bg-transparent border-none text-lg font-light text-white placeholder:text-white/30 focus:outline-none"
          />

          {/* Content Input */}
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
            className="w-full px-0 py-1 bg-transparent border-none text-sm text-white/80 font-light resize-none focus:outline-none placeholder:text-white/30"
            autoFocus
          />

          {/* Character Counter */}
          <div className="flex justify-end mt-1">
            <span className={`text-xs ${charsLeft < 50 ? 'text-red-500' : 'text-white/30'}`}>
              {charsLeft} characters left
            </span>
          </div>

          {/* Tags */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-white/30" />
              <span className="text-xs text-white/40">Tags</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add tags (press Enter)"
                className="flex-1 px-3 py-1.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-xs font-light focus:outline-none focus:border-[#6366F1]/50 placeholder:text-white/20"
              />
              <button
                onClick={handleAddTag}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 text-xs font-light transition-colors"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-xs text-[#6366F1]/80 bg-[#6366F1]/10 px-2 py-1 rounded-full">
                    #{tag}
                    <button 
                      onClick={() => handleRemoveTag(tag)} 
                      className="hover:text-white ml-1 text-[#6366F1]/60"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
            <div className="flex gap-2">
              <button className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/40 hover:text-[#6366F1]">
                <Image className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/40 hover:text-[#6366F1]">
                <Smile className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/40 hover:text-[#6366F1]">
                <MapPin className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/40 hover:text-[#6366F1]">
                <Calendar className="w-4 h-4" />
              </button>
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || isLoading}
              className="px-5 py-1.5 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-full text-white text-sm font-light transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingPost ? 'Update' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};