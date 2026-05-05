// services/index.ts
// Exportar servicios
export { authService } from './auth.service';
export { userService } from './user.service';
export { metaService } from './meta.service';

// Exportar tipos
export type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  LogoutRequest,
  UserProfile,
  UpdateUserRequest,
  UpdateUserResponse,
  Client,
  Role,
} from './types/user.types';

// Exportar instancias de axios
export { authAxios, usersAxios, axiosInstance } from './api/axios.config';

// Inicializar interceptores
import './api/auth.interceptor';