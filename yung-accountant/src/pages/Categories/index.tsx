// pages/Categories/index.tsx

import React from 'react';
import { Plus } from 'lucide-react';
import { getIconComponent } from '../../utils/iconHelpers';
import ConfirmModal from '../../components/common/ConfirmModal';
import ToastNotification from '../../components/common/ToastNotification';
import { CategoryCard } from './CategoryCard';
import { CategoryFormModal } from './CategoryFormModal';
import { useCategories } from './useCategories';
import { SYSTEM_CATEGORIES } from './constants';

const Categories: React.FC = () => {
  const {
    showModal,
    setShowModal,
    showDeleteConfirm,
    setShowDeleteConfirm,
    categoryToDelete,
    editingCategory,
    setEditingCategory,
    showToast,
    setShowToast,
    toastMessage,
    toastType,
    formData,
    setFormData,
    incomeCategories,
    expenseCategories,
    systemIncomeCategories,
    customIncomeCategories,
    systemExpenseCategories,
    customExpenseCategories,
    handleSubmit,
    handleEdit,
    handleDeleteClick,
    confirmDelete,
    resetForm,
  } = useCategories();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-light bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight">
            Categories
          </h1>
          <p className="text-xs text-white/40 mt-0.5 font-light">Manage your income and expense categories</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingCategory(null);
            setShowModal(true);
          }}
          className="group relative px-4 py-2 bg-white/5 hover:bg-white/10 transition-all duration-300 text-white text-sm font-light flex items-center gap-2 overflow-hidden rounded-lg"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          New Category
        </button>
      </div>

      {/* Income Categories */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-green-500 rounded-full" />
          <h2 className="text-sm font-light text-white/60">Income Categories</h2>
          <span className="text-[10px] text-white/30">{incomeCategories.length} total</span>
        </div>
        
        {/* System Income Categories */}
        {systemIncomeCategories.length > 0 && (
          <div className="mb-4">
            <h3 className="text-[10px] text-white/30 mb-2 font-light uppercase tracking-wider">System</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {systemIncomeCategories.map(cat => {
                const IconComponent = getIconComponent(cat.icon);
                const isDebtCategory = SYSTEM_CATEGORIES.includes(cat.name);
                return (
                  <div 
                    key={cat.id} 
                    className={`bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-3 flex items-center justify-between ${isDebtCategory ? 'opacity-80' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cat.color}20` }}>
                        <IconComponent className="w-5 h-5" style={{ color: cat.color }} />
                      </div>
                      <div>
                        <p className="text-white/80 text-sm font-light">{cat.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-white/40 capitalize">{cat.type}</p>
                          {isDebtCategory && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400/80">
                              Debt
                            </span>
                          )}
                          {!isDebtCategory && cat.isDefault && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500/80">
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom Income Categories */}
        {customIncomeCategories.length > 0 && (
          <div>
            <h3 className="text-[10px] text-white/30 mb-2 font-light uppercase tracking-wider">Custom</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {customIncomeCategories.map(cat => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Expense Categories */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-red-500 rounded-full" />
          <h2 className="text-sm font-light text-white/60">Expense Categories</h2>
          <span className="text-[10px] text-white/30">{expenseCategories.length} total</span>
        </div>
        
        {/* System Expense Categories */}
        {systemExpenseCategories.length > 0 && (
          <div className="mb-4">
            <h3 className="text-[10px] text-white/30 mb-2 font-light uppercase tracking-wider">System</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {systemExpenseCategories.map(cat => {
                const IconComponent = getIconComponent(cat.icon);
                const isDebtCategory = SYSTEM_CATEGORIES.includes(cat.name);
                return (
                  <div 
                    key={cat.id} 
                    className={`bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-3 flex items-center justify-between ${isDebtCategory ? 'opacity-80' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cat.color}20` }}>
                        <IconComponent className="w-5 h-5" style={{ color: cat.color }} />
                      </div>
                      <div>
                        <p className="text-white/80 text-sm font-light">{cat.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-white/40 capitalize">{cat.type}</p>
                          {isDebtCategory && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400/80">
                              Debt
                            </span>
                          )}
                          {!isDebtCategory && cat.isDefault && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500/80">
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom Expense Categories */}
        {customExpenseCategories.length > 0 && (
          <div>
            <h3 className="text-[10px] text-white/30 mb-2 font-light uppercase tracking-wider">Custom</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {customExpenseCategories.map(cat => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Category Form Modal */}
      <CategoryFormModal
        isOpen={showModal}
        editingCategory={editingCategory}
        formData={formData}
        setFormData={setFormData}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Category"
        message={`Are you sure you want to delete "${categoryToDelete?.name}"? This action cannot be undone. Transactions using this category will be affected.`}
        confirmText="Delete"
        type="danger"
      />

      {/* Toast Notification */}
      <ToastNotification
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </div>
  );
};

export default Categories;