// pages/Categories/CategoryCard.tsx

import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { getIconComponent } from '../../utils/iconHelpers';

interface CategoryCardProps {
  category: any;
  onEdit: (cat: any) => void;
  onDelete: (id: string, name: string) => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, onEdit, onDelete }) => {
  const IconComponent = getIconComponent(category.icon);

  return (
    <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-3 flex items-center justify-between group hover:bg-white/[0.06] transition-all duration-300">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${category.color}20` }}
        >
          <IconComponent className="w-5 h-5" style={{ color: category.color }} />
        </div>
        <div>
          <p className="text-white/80 text-sm font-light">{category.name}</p>
          <p className="text-[10px] text-white/40 capitalize">{category.type}</p>
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(category)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(category.id, category.name)}
          className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};