// types/index.ts

export interface User {
  id: string;
  username: string;
  email: string;
  plan: 'free' | 'premium' | 'business';
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: 'income' | 'expense';
  icon: string; 
  color: string;
  isDefault?: boolean;
  isSystem?: boolean;
  createdAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  name: string;
  type: 'cash' | 'bank_account' | 'credit_card' | 'debit_card' | 'other';
  bankName?: string;
  lastFourDigits?: string;
  color: string;
  icon: string;
  initialBalance: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
  transactions?: Transaction[];
}


export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  date: string;
  categoryId: string;
  categoryName?: string;
  description: string;
  walletId: string;
  wallet?: Wallet; 
  tags: string[];
}

export interface SimulationTransaction {
  id: string;
  userId: string;
  amount: number;
  categoryId: string;
  categoryName?: string;
  description: string;
  startDate: string;
  endDate: string;
  days: number;
  weeks: number;
  months: number;
  period: 'day' | 'week' | 'month';
  createdAt: string;
}

export interface GoalTransaction {
  id: string;
  goalId: string;
  amount: number;
  type: 'add' | 'remove';
  note: string;
  date: string;
  walletId: string;
}

export interface BaseGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'completed' | 'failed';
  context: string;
  purchaseCategoryId?: string;
  completedAt?: string;
}

export interface Goal extends BaseGoal {
  transactions?: GoalTransaction[];
  allocatedAmount?: number;
}

// types/index.ts

export interface VariableInterest {
  month: number;
  rate: number;
}

export interface Debt {
  id: string;
  userId: string;
  type: 'borrowed' | 'lent';
  creditorName: string;
  walletId: string;
  categoryId: string;
  originalAmount: number;
  remainingBalance: number;
  interestRate: number;
  interestType: 'fixed' | 'variable';
  termMonths: number;
  monthlyPayment: number;
  startDate: string;
  nextDueDate: string;
  status: 'active' | 'paid' | 'defaulted';
  notes?: string;
  payments?: DebtPayment[];
  createdAt: string;
  realAmountToPay: number;  // monthlyPayment * termMonths (total a pagar con intereses)
  realInterests: number;     // realAmountToPay - originalAmount (intereses reales)
  variableInterests?: VariableInterest[]; // Lista de intereses variables por mes
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  date: string;
  interestAmount: number;
  principalAmount: number;
  remainingBalance: number;
  notes?: string;
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

export interface StoreState {
  user: User | null;
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  debts: Debt[];
  habits: Habit[];
  posts: Post[];
  simulationTransactions: SimulationTransaction[];
  isLoading: boolean;
  filters: {
    categoryId: string | null;
    type: 'all' | 'income' | 'expense';
    startDate: string | null;
    endDate: string | null;
  };
  
  // Setters
  setUser: (user: User | null) => void;
  setCategories: (categories: Category[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setGoals: (goals: Goal[]) => void;
  setDebts: (debts: Debt[]) => void;
  setHabits: (habits: Habit[]) => void;
  setPosts: (posts: Post[]) => void;
  setSimulationTransactions: (transactions: SimulationTransaction[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setFilters: (filters: Partial<StoreState['filters']>) => void;
  
  // Category actions
  addCategory: (category: Omit<Category, 'id' | 'userId' | 'createdAt'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  
  // Transaction actions
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  
  wallets: Wallet[];
  setWallets: (wallets: Wallet[]) => void;
  addWallet: (wallet: Omit<Wallet, 'id' | 'userId' | 'createdAt' | 'currentBalance'>) => void;
  updateWallet: (id: string, updates: Partial<Wallet>) => void;
  deleteWallet: (id: string) => void;
  updateWalletBalance: (walletId: string, amount: number, isIncome: boolean) => void;

  // Simulation Transaction actions
  addSimulationTransaction: (transaction: Omit<SimulationTransaction, 'id' | 'userId' | 'createdAt'>) => void;
  updateSimulationTransaction: (id: string, updates: Partial<SimulationTransaction>) => void;
  deleteSimulationTransaction: (id: string) => void;
  
  // Goal actions
  addGoal: (goal: Omit<Goal, 'id' | 'currentAmount' | 'status' | 'userId' | 'transactions'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  addGoalTransaction: (goalId: string, transaction: Omit<GoalTransaction, 'id'>) => void;
  updateGoalTransaction: (goalId: string, transactionId: string, updates: Partial<Omit<GoalTransaction, 'id' | 'goalId'>>) => void;
  deleteGoalTransaction: (goalId: string, transactionId: string) => void;
  updateGoalAmount: (goalId: string, amount: number) => void;
  
  // Debt actions
  addDebt: (debt: Omit<Debt, 'id' | 'userId' | 'createdAt' | 'remainingBalance' | 'payments'>) => void;
  updateDebt: (id: string, updates: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  addDebtPayment: (debtId: string, payment: Omit<DebtPayment, 'id' | 'debtId'>) => void;
  
  // Habit actions
  addHabit: (habit: Omit<Habit, 'id' | 'currentStreak' | 'bestStreak' | 'userId'>) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  checkHabit: (id: string, date: string) => void;
  
  // Post actions
  addPost: (post: Omit<Post, 'id' | 'likesCount' | 'commentsCount' | 'createdAt' | 'userId'>) => void;
  likePost: (id: string) => void;
  deletePost: (id: string) => void;

  hasSufficientBalance: (walletId: string, amount: number) => boolean;
  updateAllWalletBalances : () => void;
  calculateWalletBalance: (walletId: string, transactions: Transaction[], categories: Category[], goals: Goal[]) => number;
}