// pages/Community/EmojiPicker.tsx
import React, { useState } from 'react';
import { X, Search } from 'lucide-react';

const EMOJI_CATEGORIES: Record<string, string[]> = {
  'Smileys': ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥴','😵','🤯','🥳','🥺','😢','😭','😤','😠','😡','🤬','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  'Gestures': ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦵','🦶','👂','🦻','👃','🧠','🦷','🦴','👀','👁️','👅','👄'],
  'Hearts': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','♡'],
  'Symbols': ['💯','🔥','⭐','🌟','✨','💫','🪐','☀️','🌈','🍀','💐','🌹','🥀','🌺','🌸','🌼','🌻','⚡','💥','💢','💦','💨','✅','❌','➕','➖','➗','❗','❓','💱','💲','🔱','🚫','🔞','🔰','♻️','⚠️','⚜️','©️','®️','™️'],
};

export const EmojiPicker: React.FC<{ onSelect: (emoji: string) => void; onClose: () => void }> = ({ onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Smileys');
  const categories = Object.keys(EMOJI_CATEGORIES);

  const filteredEmojis = search
    ? Object.values(EMOJI_CATEGORIES).flat().filter(e => e.includes(search))
    : EMOJI_CATEGORIES[activeCategory] || [];

  return (
    <div className="absolute bottom-full left-0 mb-2 z-50 w-80 p-3 rounded-2xl glass-aero animate-dropdown-in" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-medium" style={{ color: 'var(--theme-text-primary)' }}>Emojis</h4>
        <button onClick={onClose} className="p-1 rounded-full transition-all duration-300 hover:scale-110 glass-sm">
          <X className="w-3 h-3" style={{ color: 'var(--theme-text-tertiary)' }} />
        </button>
      </div>
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search emoji..."
          className="w-full pl-7 pr-3 py-1.5 text-xs rounded-xl outline-none transition-all duration-300 glass-sm"
          style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }} />
      </div>
      {!search && (
        <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-2 py-1 text-[10px] font-medium rounded-full whitespace-nowrap transition-all duration-300 ${
                activeCategory === cat ? 'glass-sm' : ''
              }`}
              style={{ color: activeCategory === cat ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)' }}>
              {cat}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-10 gap-1 max-h-48 overflow-y-auto modal-scroll">
        {filteredEmojis.map((emoji, i) => (
          <button key={i} onClick={() => onSelect(emoji)} className="w-7 h-7 flex items-center justify-center text-base rounded-lg transition-all duration-300 hover:scale-125 glass-sm">{emoji}</button>
        ))}
      </div>
    </div>
  );
};