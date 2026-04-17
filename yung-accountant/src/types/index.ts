// types/index.ts

export interface User {
  id: string;
  username: string;
  email: string;
  plan: 'free' | 'premium' | 'business';
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  date: string;
  category: string;
  description: string;
  isIncome: boolean;
  tags: string[];
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'completed' | 'failed';
  context: string;
}

export interface Debt {
  id: string;
  userId: string;
  creditor: string;
  originalAmount: number;
  remainingBalance: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  startDate: string;
  status: 'active' | 'paid' | 'defaulted';
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  frequency: 'daily' | 'weekly';
  targetPerWeek: number;
  currentStreak: number;
  bestStreak: number;
  isActive: boolean;
  checks?: HabitCheck[];
}

export interface HabitCheck {
  id: string;
  habitId: string;
  checkDate: string;
  completed: boolean;
}

export interface Post {
  id: string;
  userId: string;
  title: string;
  content: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

export interface Simulation {
  id: string;
  userId: string;
  name: string;
  scenario: SimulationScenario;
  createdAt: string;
}

export interface SimulationScenario {
  monthlyIncome?: number;
  monthlyExpenses?: number;
  targetAmount?: number;
  interestRate?: number;
  debtAmount?: number;
  monthlyPayment?: number;
}

export type Category = 
  | 'Income'
  | 'Food'
  | 'Transport'
  | 'Weed'
  | 'Entertainment'
  | 'Savings'
  | 'Health'
  | 'Education'
  | 'Rent'
  | 'Utilities'
  | 'Other';

export interface StoreState {
  user: User | null;
  transactions: Transaction[];
  goals: Goal[];
  debts: Debt[];
  habits: Habit[];
  posts: Post[];
  isLoading: boolean;
  filters: {
    category: string;
    type: 'all' | 'income' | 'expense';
    startDate: string | null;
    endDate: string | null;
  };
  
  // Setters
  setUser: (user: User | null) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setGoals: (goals: Goal[]) => void;
  setDebts: (debts: Debt[]) => void;
  setHabits: (habits: Habit[]) => void;
  setPosts: (posts: Post[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setFilters: (filters: Partial<StoreState['filters']>) => void;
  
  // Transaction actions
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  
  // Goal actions
  addGoal: (goal: Omit<Goal, 'id' | 'currentAmount' | 'status' | 'userId'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  
  // Debt actions
  addDebt: (debt: Omit<Debt, 'id' | 'userId'>) => void;
  updateDebt: (id: string, updates: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  
  // Habit actions
  addHabit: (habit: Omit<Habit, 'id' | 'currentStreak' | 'bestStreak' | 'userId'>) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  checkHabit: (id: string, date: string) => void;
  
  // Post actions
  addPost: (post: Omit<Post, 'id' | 'likesCount' | 'commentsCount' | 'createdAt' | 'userId'>) => void;
  likePost: (id: string) => void;
  deletePost: (id: string) => void;
}