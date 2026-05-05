// services/api/init.ts
import './axios.config';
import './auth.interceptor';

// Este archivo se importa una vez al inicio de la app
export { axiosInstance } from './axios.config';