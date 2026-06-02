// pages/Categories/index.tsx
import React from 'react';
import { Plus, Target } from 'lucide-react';
import { getIconComponent } from '../../utils/iconHelpers';
import ConfirmModal from '../../components/common/ConfirmModal';
import ToastNotification from '../../components/common/ToastNotification';
import { CategoryCard } from './CategoryCard';
import { CategoryFormModal } from './CategoryFormModal';
import { useCategories } from './useCategories';
import { SYSTEM_CATEGORIES, GOAL_CATEGORIES } from './constants';

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
    <div className="max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 mb-10 pt-4 animate-fade-in-down">
        <div>
          <h1 className="text-[34px] font-light tracking-[-0.03em]" style={{ color: 'var(--theme-text-primary)' }}>
            Categories
          </h1>
          <p className="text-[14px] mt-1.5 tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)' }}>
            Manage your income and expense categories
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingCategory(null);
            setShowModal(true);
          }}
          className="px-5 py-3 rounded-2xl text-[12px] font-medium tracking-[0.04em] uppercase flex items-center gap-2.5 transition-all duration-500 hover:-translate-y-1 active:scale-95"
          style={{ 
            backgroundColor: 'var(--theme-primary)', 
            color: '#FFFFFF',
            boxShadow: '0 4px 20px -6px var(--theme-primary)'
          }}
        >
          <Plus className="w-4 h-4 transition-transform duration-500 hover:rotate-90" strokeWidth={2.5} />
          New Category
        </button>
      </div>

      {/* Income Categories */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-[1rem] flex items-center justify-center glass-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10B981' }} />
          </div>
          <h2 className="text-[15px] font-medium tracking-[0.02em]" style={{ color: 'var(--theme-text-secondary)' }}>Income Categories</h2>
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full glass-sm" style={{ color: 'var(--theme-text-tertiary)' }}>{incomeCategories.length} total</span>
        </div>
        
        {/* System Income Categories */}
        {systemIncomeCategories.length > 0 && (
          <div className="mb-5">
            <h3 className="text-[10px] font-medium tracking-[0.08em] uppercase mb-3" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.6 }}>System</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {systemIncomeCategories.map(cat => {
                const IconComponent = getIconComponent(cat.icon);
                const isDebtCategory = SYSTEM_CATEGORIES.includes(cat.name);
                return (
                  <div 
                    key={cat.id} 
                    className={`rounded-[1.25rem] p-4 flex items-center justify-between transition-all duration-300 glass-sm ${isDebtCategory ? 'opacity-75' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-[1rem] flex items-center justify-center transition-transform duration-500 hover:scale-110"
                        style={{ backgroundColor: `${cat.color}16` }}
                      >
                        <IconComponent className="w-5 h-5" style={{ color: cat.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>{cat.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] font-medium capitalize" style={{ color: 'var(--theme-text-tertiary)' }}>{cat.type}</p>
                          {isDebtCategory && (
                            <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full glass-sm" style={{ color: '#8B5CF6' }}>Debt</span>
                          )}
                          {!isDebtCategory && cat.isDefault && (
                            <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full glass-sm" style={{ color: '#F59E0B' }}>Default</span>
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
            <h3 className="text-[10px] font-medium tracking-[0.08em] uppercase mb-3" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.6 }}>Custom</h3>
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
          <div className="text-center py-10">
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>No custom income categories yet</p>
            <button
              onClick={() => {
                resetForm();
                setFormData((prev: any) => ({ ...prev, type: 'income' }));
                setEditingCategory(null);
                setShowModal(true);
              }}
              className="mt-3 text-[13px] font-medium transition-all duration-300 hover:opacity-80"
              style={{ color: 'var(--theme-primary)' }}
            >
              Create your first income category →
            </button>
          </div>
        )}
      </div>

      {/* Expense Categories */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-[1rem] flex items-center justify-center glass-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }} />
          </div>
          <h2 className="text-[15px] font-medium tracking-[0.02em]" style={{ color: 'var(--theme-text-secondary)' }}>Expense Categories</h2>
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full glass-sm" style={{ color: 'var(--theme-text-tertiary)' }}>{expenseCategories.length} total</span>
        </div>
        
        {/* System Expense Categories */}
        {systemExpenseCategories.length > 0 && (
          <div className="mb-5">
            <h3 className="text-[10px] font-medium tracking-[0.08em] uppercase mb-3" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.6 }}>System</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {systemExpenseCategories.map(cat => {
                const IconComponent = getIconComponent(cat.icon);
                const isDebtCategory = SYSTEM_CATEGORIES.includes(cat.name);
                const isGoalCategory = GOAL_CATEGORIES.includes(cat.name);
                return (
                  <div 
                    key={cat.id} 
                    className={`rounded-[1.25rem] p-4 flex items-center justify-between transition-all duration-300 glass-sm ${isDebtCategory ? 'opacity-75' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-[1rem] flex items-center justify-center transition-transform duration-500 hover:scale-110"
                        style={{ backgroundColor: `${cat.color}16` }}
                      >
                        <IconComponent className="w-5 h-5" style={{ color: cat.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>{cat.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] font-medium capitalize" style={{ color: 'var(--theme-text-tertiary)' }}>{cat.type}</p>
                          {isDebtCategory && (
                            <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full glass-sm" style={{ color: '#8B5CF6' }}>Debt</span>
                          )}
                          {isGoalCategory && (
                            <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full glass-sm flex items-center gap-0.5" style={{ color: '#6366F1' }}>
                              <Target className="w-2 h-2" /> Goal
                            </span>
                          )}
                          {!isDebtCategory && !isGoalCategory && cat.isDefault && (
                            <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full glass-sm" style={{ color: '#F59E0B' }}>Default</span>
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
            <h3 className="text-[10px] font-medium tracking-[0.08em] uppercase mb-3" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.6 }}>Custom</h3>
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
          <div className="text-center py-10">
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>No custom expense categories yet</p>
            <button
              onClick={() => {
                resetForm();
                setFormData((prev: any) => ({ ...prev, type: 'expense' }));
                setEditingCategory(null);
                setShowModal(true);
              }}
              className="mt-3 text-[13px] font-medium transition-all duration-300 hover:opacity-80"
              style={{ color: 'var(--theme-primary)' }}
            >
              Create your first expense category →
            </button>
          </div>
        )}
      </div>

      {/* Empty state when no categories at all */}
      {incomeCategories.length === 0 && expenseCategories.length === 0 && (
        <div className="rounded-[2.5rem] p-16 text-center glass-aero animate-fade-in-up">
          <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 glass-sm">
            <Plus className="w-10 h-10" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.25 }} strokeWidth={1} />
          </div>
          <p className="text-[18px] font-light tracking-[-0.02em] mb-2" style={{ color: 'var(--theme-text-primary)' }}>No categories yet</p>
          <p className="text-[14px] tracking-[0.03em] mb-7" style={{ color: 'var(--theme-text-tertiary)' }}>
            Create your first category to start tracking transactions
          </p>
          <button
            onClick={() => {
              resetForm();
              setEditingCategory(null);
              setShowModal(true);
            }}
            className="px-7 py-3.5 rounded-2xl text-[13px] font-medium tracking-[0.04em] uppercase transition-all duration-500 hover:-translate-y-1 active:scale-95"
            style={{ 
              backgroundColor: 'var(--theme-primary)', 
              color: '#FFFFFF',
              boxShadow: '0 4px 24px -6px var(--theme-primary)'
            }}
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