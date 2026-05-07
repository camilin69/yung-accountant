export const MICROSERVICES = {
  AUTH: import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:8081',
  CATEGORIES: import.meta.env.VITE_CATEGORIES_SERVICE_URL || 'http://localhost:8082',
  DEBTS: import.meta.env.VITE_DEBTS_SERVICE_URL || 'http://localhost:8083',
  POSTS: import.meta.env.VITE_POSTS_SERVICE_URL || 'http://localhost:8085',
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
  CATEGORIES: {
    BASE: `${MICROSERVICES.CATEGORIES}/categories`,
    BY_ID: (id: string) => `${MICROSERVICES.CATEGORIES}/categories/${id}`,
  },
  META: {
    CLIENTS: `${MICROSERVICES.AUTH}/clients`,
    ROLES: `${MICROSERVICES.AUTH}/roles`,
  },
} as const;