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
    <div className="group rounded-[1.25rem] p-4 flex items-center justify-between transition-all duration-500 hover:-translate-y-1 cursor-default glass-sm">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-[1rem] flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
          style={{ backgroundColor: `${category.color}16` }}
        >
          <IconComponent className="w-5 h-5" style={{ color: category.color }} />
        </div>
        <div>
          <p className="text-sm font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>{category.name}</p>
          <p className="text-[10px] font-medium capitalize mt-0.5" style={{ color: 'var(--theme-text-tertiary)' }}>{category.type}</p>
        </div>
      </div>
      <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-500">
        <button
          onClick={() => onEdit(category)}
          className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm"
        >
          <Edit2 className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
        </button>
        <button
          onClick={() => onDelete(category.id, category.name)}
          className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm"
        >
          <Trash2 className="w-3.5 h-3.5" style={{ color: '#EF4444', opacity: 0.7 }} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};