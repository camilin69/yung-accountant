const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const API_URL = isDev ? "http://localhost" : "https://yung-accountant-back.duckdns.org";

export const MICROSERVICES = {
  AUTH: isDev ? API_URL + ":8081" : API_URL,
  CATEGORIES: isDev ? API_URL + ":8082" : API_URL,
  DEBTS: isDev ? API_URL + ":8083" : API_URL,
  GOALS: isDev ? API_URL + ":8084" : API_URL,
  HABITS: isDev ? API_URL + ":8085" : API_URL,
  WALLETS: isDev ? API_URL + ":8086" : API_URL,
  TRANSACTIONS: isDev ? API_URL + ":8087" : API_URL,
  SIMULATIONS: isDev ? API_URL + ":8088" : API_URL,
  COMMUNITY: isDev ? API_URL + ":8089" : API_URL,
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
    TRANSACTION_BY_ID: (id: string) => `${MICROSERVICES.GOALS}/goals-transactions/${id}`,
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
  COMMUNITY: {
    POSTS: `${MICROSERVICES.COMMUNITY}/community/posts`,
    POST_BY_ID: (id: string) => `${MICROSERVICES.COMMUNITY}/community/posts/${id}`,
    LIKE_POST: (id: string) => `${MICROSERVICES.COMMUNITY}/community/posts/${id}/like`,
    COMMENTS: (postId: string) => `${MICROSERVICES.COMMUNITY}/community/posts/${postId}/comments`,
    COMMENT_BY_ID: (commentId: string) => `${MICROSERVICES.COMMUNITY}/comments/${commentId}`,
    LIKE_COMMENT: (commentId: string) => `${MICROSERVICES.COMMUNITY}/comments/${commentId}/like`,
    REPLIES: (commentId: string) => `${MICROSERVICES.COMMUNITY}/comments/${commentId}/replies`,
    SEARCH: `${MICROSERVICES.COMMUNITY}/community/search`,
    RECOMMENDED: `${MICROSERVICES.COMMUNITY}/community/recommended`,
    TAGS: (tag: string) => `${MICROSERVICES.COMMUNITY}/community/tags/${tag}`,
  },
  META: {
    CLIENTS: `${MICROSERVICES.AUTH}/clients`,
    ROLES: `${MICROSERVICES.AUTH}/roles`,
  },
} as const;