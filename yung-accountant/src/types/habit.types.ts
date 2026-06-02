export interface HabitCheck {
  id: string;
  habitId: string;
  checkDate: string;
  completed: boolean;
  note?: string;
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  currentStreak: number;
  bestStreak: number;
  checks?: HabitCheck[];
  createdAt: string;
}