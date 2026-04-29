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
    <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-3 flex items-center justify-between group hover:bg-[var(--theme-background-glass-hover)] transition-all duration-300">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${category.color}20` }}
        >
          <IconComponent className="w-5 h-5" style={{ color: category.color }} />
        </div>
        <div>
          <p className="text-[var(--theme-text-primary)] text-sm font-light">{category.name}</p>
          <p className="text-[10px] text-[var(--theme-text-tertiary)] capitalize">{category.type}</p>
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(category)}
          className="p-1.5 rounded-lg hover:bg-[var(--theme-background-glass-hover)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(category.id, category.name)}
          className="p-1.5 rounded-lg hover:bg-red-500/20 text-[var(--theme-text-tertiary)] hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};