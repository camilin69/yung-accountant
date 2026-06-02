// services/types/error.types.ts
export const ErrorCode = {
  // Auth errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
  
  // User errors
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_ROLE: 'INVALID_ROLE',
  INVALID_CLIENT_ID: 'INVALID_CLIENT_ID',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_FIELDS: 'MISSING_FIELDS',
  
  // Unknown
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

export interface ApiError {
  code: ErrorCodeType;
  message: string;
  details?: Record<string, any>;
  status?: number;
}

export class AppError extends Error {
  code: ErrorCodeType;
  details?: Record<string, any>;
  status?: number;
  
  constructor(code: ErrorCodeType, message: string, details?: Record<string, any>, status?: number) {
    super(message);
    this.code = code;
    this.details = details;
    this.status = status;
    this.name = 'AppError';
  }
}

// Mapeo de errores del backend a nuestros códigos
export const mapBackendError = (error: any): AppError => {
  // Network errors
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return new AppError(ErrorCode.TIMEOUT_ERROR, 'Request timeout. Please try again.');
    }
    return new AppError(ErrorCode.NETWORK_ERROR, 'Network error. Check your connection.');
  }
  
  const status = error.response.status;
  const data = error.response.data;
  
  // Server errors
  if (status >= 500) {
    return new AppError(ErrorCode.SERVER_ERROR, 'Server error. Please try again later.');
  }
  
  // Client errors
  switch (status) {
    case 401:
      if (data.error?.toLowerCase().includes('invalid credentials')) {
        return new AppError(ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password.', data, status);
      }
      if (data.error?.toLowerCase().includes('token expired')) {
        return new AppError(ErrorCode.TOKEN_EXPIRED, 'Session expired. Please login again.', data, status);
      }
      return new AppError(ErrorCode.TOKEN_INVALID, 'Invalid token. Please login again.', data, status);
      
    case 404:
      return new AppError(ErrorCode.USER_NOT_FOUND, 'User not found.', data, status);
      
    case 409:
      if (data.error?.toLowerCase().includes('email')) {
        return new AppError(ErrorCode.EMAIL_ALREADY_REGISTERED, 'Email already registered.', data, status);
      }
      return new AppError(ErrorCode.USER_ALREADY_EXISTS, 'User already exists.', data, status);
      
    case 400:
      if (data.error?.toLowerCase().includes('email')) {
        return new AppError(ErrorCode.INVALID_EMAIL, 'Invalid email address.', data, status);
      }
      if (data.error?.toLowerCase().includes('role')) {
        return new AppError(ErrorCode.INVALID_ROLE, 'Invalid role specified.', data, status);
      }
      if (data.error?.toLowerCase().includes('clientid')) {
        return new AppError(ErrorCode.INVALID_CLIENT_ID, 'Invalid client ID.', data, status);
      }
      if (data.error?.toLowerCase().includes('missing')) {
        return new AppError(ErrorCode.MISSING_FIELDS, 'Missing required fields.', data, status);
      }
      return new AppError(ErrorCode.VALIDATION_ERROR, data.error || 'Validation error.', data, status);
      
    default:
      return new AppError(ErrorCode.UNKNOWN_ERROR, data.error || 'An unknown error occurred.', data, status);
  }
};