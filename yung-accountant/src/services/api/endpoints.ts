// services/api/endpoints.ts
export const MICROSERVICES = {
  AUTH: import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:8081',
  POSTS: import.meta.env.VITE_POSTS_SERVICE_URL || 'http://localhost:8082',
  FINANCIAL: import.meta.env.VITE_FINANCIAL_SERVICE_URL || 'http://localhost:8083',
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
  POSTS: {
    BASE: `${MICROSERVICES.POSTS}/posts`,
    BY_ID: (id: string) => `${MICROSERVICES.POSTS}/posts/${id}`,
    LIKE: (id: string) => `${MICROSERVICES.POSTS}/posts/${id}/like`,
    COMMENTS: (postId: string) => `${MICROSERVICES.POSTS}/posts/${postId}/comments`,
    COMMENT_BY_ID: (postId: string, commentId: string) => `${MICROSERVICES.POSTS}/posts/${postId}/comments/${commentId}`,
    REPLY: (postId: string, commentId: string) => `${MICROSERVICES.POSTS}/posts/${postId}/comments/${commentId}/replies`,
    LIKE_COMMENT: (postId: string, commentId: string) => `${MICROSERVICES.POSTS}/posts/${postId}/comments/${commentId}/like`,
  },
  META: {
    CLIENTS: `${MICROSERVICES.AUTH}/clients`,
    ROLES: `${MICROSERVICES.AUTH}/roles`,
  },
} as const;