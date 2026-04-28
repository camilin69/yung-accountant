// pages/Transactions/TransactionTable.tsx

import React, { useState } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Calendar as CalendarIcon, Edit2, Trash2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { getIconComponent } from '../../utils/iconHelpers';
import ConfirmModal from '../../components/common/ConfirmModal';
import { useNavigate } from 'react-router-dom';
import { useDebtStore } from '../../store';

interface TransactionTableProps {
  paginatedTransactions: any[];
  totalPages: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  onViewDetails: (transaction: any) => void;
  onEdit: (transaction: any, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  getCategoryById: (id: string) => any;
  getWalletById: (id: string) => any;
  filteredTransactionsLength: number;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  paginatedTransactions,
  totalPages,
  currentPage,
  setCurrentPage,
  onViewDetails,
  onEdit,
  onDelete,
  getCategoryById,
  getWalletById,
  filteredTransactionsLength
}) => {
  const [showDebtWarning, setShowDebtWarning] = useState(false);
  const [debtWarningMessage, setDebtWarningMessage] = useState('');
  const navigate = useNavigate();
  const { debts } = useDebtStore();
  if (paginatedTransactions.length === 0) {
    return (
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[0.03] flex items-center justify-center">
            <Search className="w-8 h-8 text-white/20" />
          </div>
          <p className="text-white/40 text-sm font-light">No transactions found</p>
          <p className="text-white/30 text-xs mt-1">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="text-left p-4 text-[10px] font-light text-white/40 uppercase tracking-wider">Date</th>
              <th className="text-left p-4 text-[10px] font-light text-white/40 uppercase tracking-wider">Wallet</th>
              <th className="text-left p-4 text-[10px] font-light text-white/40 uppercase tracking-wider">Category</th>
              <th className="text-left p-4 text-[10px] font-light text-white/40 uppercase tracking-wider">Description</th>
              <th className="text-right p-4 text-[10px] font-light text-white/40 uppercase tracking-wider">Amount</th>
              <th className="text-center p-4 text-[10px] font-light text-white/40 uppercase tracking-wider">Actions</th>
             </tr>
          </thead>
          <tbody>
            {paginatedTransactions.map(t => {
              const cat = getCategoryById(t.categoryId);
              const wallet = getWalletById(t.walletId);
              const isDebtTransaction = t.tags && (t.tags.includes('debt') || t.tags.includes('debt-payment'));
              
              return (
                <tr 
                  key={t.id} 
                  onClick={() => {
                    if (isDebtTransaction) {
                      // Buscar la deuda asociada
                      const debtId = t.tags?.find((tag: string) => 
                        tag && tag.length > 0 && 
                        tag !== 'debt' && 
                        tag !== 'debt-payment' && 
                        tag !== 'borrowed' && 
                        tag !== 'lent' &&
                        !tag.includes('transaction')
                      );
                      const debt = debts.find(d => d.id === debtId);
                      const debtTypeText = debt?.type === 'borrowed' ? 'debt you owe' : 'debt owed to you';
                      
                      setDebtWarningMessage(
                        `This transaction is associated with a ${debtTypeText} from/to "${debt?.creditorName}".\n\nPlease manage this debt from the Debts module instead.`
                      );
                      setShowDebtWarning(true);
                    } else {
                      onViewDetails(t);
                    }
                  }}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors duration-200 group cursor-pointer"
                >
                  <td className="p-4 text-sm text-white/60 font-light">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-3.5 h-3.5 text-white/30" />
                      {formatDate(t.date, 'short')}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-white/60 font-light">
                    <div className="flex items-center gap-2">
                      {wallet?.name}
                    </div>
                   </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const IconComponent = getIconComponent(cat?.icon || 'MoreHorizontal');
                        return (
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all duration-300 group-hover:scale-110"
                            style={{ backgroundColor: `${cat?.color}20` }}
                          >
                            <IconComponent className="w-4 h-4" style={{ color: cat?.color }} />
                          </div>
                        );
                      })()}
                      <span className="text-sm font-light text-white/80">{cat?.name}</span>
                    </div>
                   </td>
                  <td className="p-4 text-sm font-light text-white/40">{t.description || '-'}</td>
                  <td className={`p-4 text-right text-sm font-light ${cat?.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                    {cat?.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                   </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => onEdit(t, e)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isDebtTransaction
                            ? 'text-white/20 cursor-not-allowed'
                            : 'hover:bg-white/10 text-white/40 hover:text-white opacity-0 group-hover:opacity-100'
                        }`}
                        disabled={isDebtTransaction}
                        title={isDebtTransaction ? 'Debt transactions cannot be edited' : 'Edit transaction'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => onDelete(t.id, e)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isDebtTransaction
                            ? 'text-white/20 cursor-not-allowed'
                            : 'hover:bg-red-500/20 text-white/40 hover:text-red-500 opacity-0 group-hover:opacity-100'
                        }`}
                        disabled={isDebtTransaction}
                        title={isDebtTransaction ? 'Debt transactions cannot be deleted directly' : 'Delete transaction'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                   </td>
                  </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center p-4 border-t border-white/10">
          <p className="text-xs text-white/40 font-light">
            Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, paginatedTransactions.length)} of {filteredTransactionsLength}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-white/[0.03] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all duration-300"
            >
              <ChevronLeft className="w-4 h-4 text-white/60" />
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-light transition-all duration-300 ${
                      currentPage === pageNum
                        ? 'bg-[#6366F1] text-white'
                        : 'bg-white/[0.03] text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-white/[0.03] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all duration-300"
            >
              <ChevronRight className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={showDebtWarning}
        onClose={() => setShowDebtWarning(false)}
        onConfirm={() => {
          setShowDebtWarning(false);
          navigate('/debts');
        }}
        title="Debt Transaction"
        message={debtWarningMessage}
        confirmText="Go to Debts"
        cancelText="Stay Here"
        type="info"
      />
    </div>
  );
};