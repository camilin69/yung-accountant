export const MICROSERVICES = {
  AUTH: import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:8081',
  CATEGORIES: import.meta.env.VITE_CATEGORIES_SERVICE_URL || 'http://localhost:8082',
  DEBTS: import.meta.env.VITE_DEBTS_SERVICE_URL || 'http://localhost:8083',
  GOALS: import.meta.env.VITE_GOALS_SERVICE_URL || 'http://localhost:8084',
  HABITS: import.meta.env.VITE_HABITS_SERVICE_URL || 'http://localhost:8085',
  WALLETS: import.meta.env.VITE_WALLETS_SERVICE_URL || 'http://localhost:8086',
  TRANSACTIONS: import.meta.env.VITE_TRANSACTIONS_SERVICE_URL || 'http://localhost:8087',
  SIMULATIONS: import.meta.env.VITE_SIMULATIONS_SERVICE_URL || 'http://localhost:8088',
  POSTS: import.meta.env.VITE_POSTS_SERVICE_URL || 'http://localhost:8089',
} as const;

export const ENDPOINTS = {
  AUTH: {
    LOGIN: `${MICROSERVICES.AUTH}/auth/login`,
    LOGOUT: `${MICROSERVICES.AUTH}/auth/logout`,
    REFRESH: `${MICROSERVICES.AUTH}/auth/refresh`,
    REFRESH_SESSION: `${MICROSERVICES.AUTH}/auth/refresh-session`,
  },
  USERS: {
    REGISTER: `${MICROSERVICES.AUTH}/users/register`,
    ME: `${MICROSERVICES.AUTH}/users/me`,
    UPDATE: `${MICROSERVICES.AUTH}/users/update`,
    DELETE: `${MICROSERVICES.AUTH}/users/delete`,
    FOLLOW: `${MICROSERVICES.AUTH}/users/follow`,
    UNFOLLOW: `${MICROSERVICES.AUTH}/users/unfollow`,
    BY_EMAIL: (email: string) => `${MICROSERVICES.AUTH}/users/by-email/${encodeURIComponent(email)}`,
  },
  DEBTS: {
    BASE: `${MICROSERVICES.DEBTS}/debts`,
    BY_ID: (id: string) => `${MICROSERVICES.DEBTS}/debts/${id}`,
    PAYMENTS: (debtId: string) => `${MICROSERVICES.DEBTS}/debts/${debtId}/payments`,
    PAYMENT_BY_ID: (paymentId: string) => `${MICROSERVICES.DEBTS}/payments/${paymentId}`,
    INTERESTS: `${MICROSERVICES.DEBTS}/interests`,
  },
  GOALS: {
    BASE: `${MICROSERVICES.GOALS}/goals`,
    BY_ID: (id: string) => `${MICROSERVICES.GOALS}/goals/${id}`,
    TRANSACTIONS: `${MICROSERVICES.GOALS}/goals-transactions`,
    TRANSACTION_BY_ID: (id: string) => `${MICROSERVICES.GOALS}/goal-transactions/${id}`,
  },
  HABITS: {
    BASE: `${MICROSERVICES.HABITS}/habits`,
    BY_ID: (id: string) => `${MICROSERVICES.HABITS}/habits/${id}`,
    CHECK: (habitId: string) => `${MICROSERVICES.HABITS}/habits/${habitId}/check`,
  },
  CATEGORIES: {
    BASE: `${MICROSERVICES.CATEGORIES}/categories`,
    BY_ID: (id: string) => `${MICROSERVICES.CATEGORIES}/categories/${id}`,
  },
  TRANSACTIONS: {
    BASE: `${MICROSERVICES.TRANSACTIONS}/transactions`,
    BY_ID: (id: string) => `${MICROSERVICES.TRANSACTIONS}/transactions/${id}`,
  },
  WALLETS: {
    BASE: `${MICROSERVICES.WALLETS}/wallets`,
    BY_ID: (id: string) => `${MICROSERVICES.WALLETS}/wallets/${id}`,
  },
  SIMULATIONS: {
    BASE: `${MICROSERVICES.SIMULATIONS}/simulations`,
    BY_ID: (id: string) => `${MICROSERVICES.SIMULATIONS}/simulations/${id}`,
  },
  META: {
    CLIENTS: `${MICROSERVICES.AUTH}/clients`,
    ROLES: `${MICROSERVICES.AUTH}/roles`,
  },
} as const;