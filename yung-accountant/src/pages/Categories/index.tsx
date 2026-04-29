// pages/Categories/index.tsx
import React from 'react';
import { Plus } from 'lucide-react';
import { useThemeStyles } from '../../hooks/useTheme';
import { getIconComponent } from '../../utils/iconHelpers';
import ConfirmModal from '../../components/common/ConfirmModal';
import ToastNotification from '../../components/common/ToastNotification';
import { CategoryCard } from './CategoryCard';
import { CategoryFormModal } from './CategoryFormModal';
import { useCategories } from './useCategories';
import { SYSTEM_CATEGORIES } from './constants';

const Categories: React.FC = () => {
  const { getGradientTextClass } = useThemeStyles();
  
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
          <h1 className={`text-2xl font-light tracking-tight ${getGradientTextClass()}`}>
            Categories
          </h1>
          <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 font-light">Manage your income and expense categories</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingCategory(null);
            setShowModal(true);
          }}
          className="group relative px-4 py-2 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] transition-all duration-300 text-[var(--theme-text-primary)] text-sm font-light flex items-center gap-2 overflow-hidden rounded-lg border border-[var(--theme-border-light)]"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          New Category
        </button>
      </div>

      {/* Income Categories */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-green-600 rounded-full" />
          <h2 className="text-sm font-light text-[var(--theme-text-secondary)]">Income Categories</h2>
          <span className="text-[10px] text-[var(--theme-text-tertiary)]">{incomeCategories.length} total</span>
        </div>
        
        {/* System Income Categories */}
        {systemIncomeCategories.length > 0 && (
          <div className="mb-4">
            <h3 className="text-[10px] text-[var(--theme-text-tertiary)] mb-2 font-light uppercase tracking-wider">System</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {systemIncomeCategories.map(cat => {
                const IconComponent = getIconComponent(cat.icon);
                const isDebtCategory = SYSTEM_CATEGORIES.includes(cat.name);
                return (
                  <div 
                    key={cat.id} 
                    className={`bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-3 flex items-center justify-between ${isDebtCategory ? 'opacity-80' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cat.color}20` }}>
                        <IconComponent className="w-5 h-5" style={{ color: cat.color }} />
                      </div>
                      <div>
                        <p className="text-[var(--theme-text-primary)] text-sm font-light">{cat.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-[var(--theme-text-tertiary)] capitalize">{cat.type}</p>
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
            <h3 className="text-[10px] text-[var(--theme-text-tertiary)] mb-2 font-light uppercase tracking-wider">Custom</h3>
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

        {/* No custom categories message */}
        {customIncomeCategories.length === 0 && systemIncomeCategories.length > 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-[var(--theme-text-tertiary)] font-light">No custom income categories yet</p>
            <button
              onClick={() => {
                resetForm();
                setFormData(prev => ({ ...prev, type: 'income' }));
                setEditingCategory(null);
                setShowModal(true);
              }}
              className="mt-3 text-xs text-[var(--theme-primary)] hover:underline"
            >
              Create your first income category →
            </button>
          </div>
        )}
      </div>

      {/* Expense Categories */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-red-600 rounded-full" />
          <h2 className="text-sm font-light text-[var(--theme-text-secondary)]">Expense Categories</h2>
          <span className="text-[10px] text-[var(--theme-text-tertiary)]">{expenseCategories.length} total</span>
        </div>
        
        {/* System Expense Categories */}
        {systemExpenseCategories.length > 0 && (
          <div className="mb-4">
            <h3 className="text-[10px] text-[var(--theme-text-tertiary)] mb-2 font-light uppercase tracking-wider">System</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {systemExpenseCategories.map(cat => {
                const IconComponent = getIconComponent(cat.icon);
                const isDebtCategory = SYSTEM_CATEGORIES.includes(cat.name);
                return (
                  <div 
                    key={cat.id} 
                    className={`bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-3 flex items-center justify-between ${isDebtCategory ? 'opacity-80' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cat.color}20` }}>
                        <IconComponent className="w-5 h-5" style={{ color: cat.color }} />
                      </div>
                      <div>
                        <p className="text-[var(--theme-text-primary)] text-sm font-light">{cat.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-[var(--theme-text-tertiary)] capitalize">{cat.type}</p>
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
            <h3 className="text-[10px] text-[var(--theme-text-tertiary)] mb-2 font-light uppercase tracking-wider">Custom</h3>
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

        {/* No custom categories message */}
        {customExpenseCategories.length === 0 && systemExpenseCategories.length > 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-[var(--theme-text-tertiary)] font-light">No custom expense categories yet</p>
            <button
              onClick={() => {
                resetForm();
                setFormData(prev => ({ ...prev, type: 'expense' }));
                setEditingCategory(null);
                setShowModal(true);
              }}
              className="mt-3 text-xs text-[var(--theme-primary)] hover:underline"
            >
              Create your first expense category →
            </button>
          </div>
        )}
      </div>

      {/* Empty state when no categories at all */}
      {incomeCategories.length === 0 && expenseCategories.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--theme-background-glass)] flex items-center justify-center border border-[var(--theme-border-light)]">
            <Plus className="w-8 h-8 text-[var(--theme-text-tertiary)]" />
          </div>
          <p className="text-sm text-[var(--theme-text-secondary)] font-light">No categories yet</p>
          <p className="text-xs text-[var(--theme-text-tertiary)] mt-1">Create your first category to start tracking transactions</p>
          <button
            onClick={() => {
              resetForm();
              setEditingCategory(null);
              setShowModal(true);
            }}
            className="mt-4 px-4 py-2 bg-[var(--theme-primary)]/20 hover:bg-[var(--theme-primary)]/30 text-[var(--theme-primary)] text-sm font-light rounded-lg transition-all duration-300"
          >
            Create Category
          </button>
        </div>
      )}

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