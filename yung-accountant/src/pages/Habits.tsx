// pages/Habits.tsx

import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { CheckSquare, Plus } from 'lucide-react';
;

const Habits: React.FC = () => {
  const { habits, addHabit, deleteHabit, checkHabit } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');

  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const getHabitIcon = (name: string) => {
    const icons: Record<string, string> = {
      'Gym': '💪',
      'Clean food': '🥗',
      'Codeforces': '💻',
    };
    return icons[name] || '⭐';
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    addHabit({
      name: newHabitName,
      frequency: 'daily',
      targetPerWeek: 5,
      isActive: true,
    });
    setNewHabitName('');
    setShowModal(false);
  };

  const handleCheckIn = (id: string) => {
    const habit = habits.find(h => h.id === id);
    if (habit) {
      checkHabit(id, new Date().toISOString().split('T')[0]);
    }
  };

  const handleDeleteHabit = (id: string) => {
    if (confirm('Delete this habit?')) {
      deleteHabit(id);
    }
  };

  // Mock weekly check-ins (in real app, would come from habit_checks)
  const getMockChecks = (_habit: any) => {
    return [true, true, false, true, false, false, false];
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          <CheckSquare className="inline mr-2 mb-1 w-7 h-7" />
          Daily Habits Tracker
        </h1>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Add Habit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {habits.filter(h => h.isActive).map(habit => {
          const checks = getMockChecks(habit);
          const progress = (checks.filter(c => c).length / 7) * 100;
          
          return (
            <div key={habit.id} className="card text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                {getHabitIcon(habit.name)}
              </div>
              <h3 className="text-xl font-semibold mb-2">{habit.name}</h3>
              
              <div className="flex justify-center gap-6 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{habit.currentStreak}</div>
                  <div className="text-xs text-gray-500">Current Streak</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-500">{habit.bestStreak}</div>
                  <div className="text-xs text-gray-500">Best Streak</div>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-4">
                {weekDays.map((day, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                      checks[i] ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-500'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Weekly Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleCheckIn(habit.id)}
                  className="flex-1 py-2 text-sm bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors"
                >
                  Check-in Today
                </button>
                <button
                  onClick={() => handleDeleteHabit(habit.id)}
                  className="py-2 px-4 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {habits.filter(h => h.isActive).length === 0 && (
        <div className="card text-center py-12">
          <CheckSquare className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-500">No habits yet. Add your first habit to start tracking!</p>
        </div>
      )}

      {/* Add Habit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl max-w-md w-[90%] p-6">
            <h3 className="text-xl font-semibold mb-4">Add New Habit</h3>
            <form onSubmit={handleAddHabit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Habit Name</label>
                <input
                  type="text"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  className="input"
                  placeholder="Gym, Clean food, Codeforces..."
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Add Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Habits;