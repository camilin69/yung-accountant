// pages/Goals.tsx

import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/formatters';
import { Plus, Target } from 'lucide-react';
import GoalCard from '../components/common/GoalCard';

const Goals: React.FC = () => {
  const { goals, addGoal, updateGoal } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    targetDate: '',
    priority: 'medium' as const,
    context: '',
  });

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.targetAmount) return;
    addGoal({
      ...formData,
      targetAmount: parseFloat(formData.targetAmount),
      userId: '1',
      currentAmount: 0,
      status: 'active',
    });
    setShowModal(false);
    setFormData({ name: '', targetAmount: '', targetDate: '', priority: 'medium', context: '' });
  };

  const handleAddFunds = (id: string) => {
    const amount = prompt('Amount to add:');
    if (amount && !isNaN(parseFloat(amount))) {
      const goal = goals.find(g => g.id === id);
      if (goal) {
        const newAmount = goal.currentAmount + parseFloat(amount);
        updateGoal(id, { currentAmount: newAmount });
        if (newAmount >= goal.targetAmount) {
          updateGoal(id, { status: 'completed' });
        }
      }
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          <Target className="inline mr-2 mb-1 w-7 h-7" />
          Financial Goals
        </h1>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Set New Goal
        </button>
      </div>

      {activeGoals.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Active Goals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGoals.map(goal => (
              <GoalCard key={goal.id} goal={goal} onAddFunds={handleAddFunds} />
            ))}
          </div>
        </div>
      )}

      {completedGoals.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Completed Goals 🎉</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedGoals.map(goal => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </div>
      )}

      {goals.length === 0 && (
        <div className="card text-center py-12">
          <Target className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-500">No goals yet. Start by setting your first financial goal!</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl max-w-md w-[90%] p-6">
            <h3 className="text-xl font-semibold mb-4">Set New Goal</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Goal Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Buy a motorcycle"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Target Amount *</label>
                <input
                  type="number"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  className="input"
                  placeholder="8000000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Target Date</label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="input"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;