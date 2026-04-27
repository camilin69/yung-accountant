// store/habit.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Habit, HabitCheck } from '../types';

const generateId = () => Date.now().toString();

interface HabitStore {
  habits: Habit[];
  setHabits: (habits: Habit[]) => void;
  addHabit: (habit: Omit<Habit, 'id' | 'userId' | 'currentStreak' | 'bestStreak' | 'checks' | 'createdAt'>) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  checkHabit: (habitId: string, date: string, completed: boolean, note?: string) => void;
}

export const useHabitStore = create<HabitStore>()(
  persist(
    (set, get) => ({
      habits: [],
      
      setHabits: (habits) => set({ habits }),
      
      addHabit: (habit) => {
        const newHabit: Habit = {
          ...habit,
          id: generateId(),
          userId: '1',
          currentStreak: 0,
          bestStreak: 0,
          checks: [],
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ habits: [...state.habits, newHabit] }));
      },
      
      updateHabit: (id, updates) => {
        set((state) => ({
          habits: state.habits.map((h) => {
            if (h.id === id) {
              const updated = { ...h, ...updates };
              if (updates.currentStreak && updates.currentStreak > (h.bestStreak || 0)) {
                updated.bestStreak = updates.currentStreak;
              }
              return updated;
            }
            return h;
          }),
        }));
      },
      
      deleteHabit: (id) => {
        set((state) => ({
          habits: state.habits.filter((h) => h.id !== id),
        }));
      },
      
      checkHabit: (habitId, date, completed, note) => {
        const habit = get().habits.find(h => h.id === habitId);
        if (!habit) return;
        
        const existingChecks = habit.checks || [];
        let newChecks: HabitCheck[];
        let newCurrentStreak = habit.currentStreak;
        let newBestStreak = habit.bestStreak;
        
        if (completed) {
          const existingIndex = existingChecks.findIndex(c => c.checkDate === date);
          if (existingIndex >= 0) {
            newChecks = [...existingChecks];
            newChecks[existingIndex] = { ...newChecks[existingIndex], completed: true, note };
          } else {
            newChecks = [...existingChecks, { 
              id: generateId(), 
              habitId, 
              checkDate: date, 
              completed: true, 
              note 
            }];
            
            const yesterday = new Date(date);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            const wasYesterdayCompleted = existingChecks.some(c => c.checkDate === yesterdayStr && c.completed);
            
            if (wasYesterdayCompleted) {
              newCurrentStreak = habit.currentStreak + 1;
            } else {
              newCurrentStreak = 1;
            }
            newBestStreak = Math.max(newCurrentStreak, habit.bestStreak);
          }
        } else {
          newChecks = existingChecks.filter(c => c.checkDate !== date);
          newCurrentStreak = 0;
          newBestStreak = habit.bestStreak;
        }
        
        set((state) => ({
          habits: state.habits.map((h) =>
            h.id === habitId
              ? { 
                  ...h, 
                  checks: newChecks, 
                  currentStreak: newCurrentStreak,
                  bestStreak: newBestStreak
                }
              : h
          ),
        }));
      },
    }),
    { name: 'yung-accountant-habits' }
  )
);