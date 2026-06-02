// services/meta.service.ts
import { authAxios } from './api/axios.config';
import { ENDPOINTS } from './api/endpoints';
import type { Client, Role } from './types/user.types';

export const metaService = {
  /**
   * Obtener lista de clientes/municipios
   */
  async getClients(): Promise<Client[]> {
    const response = await authAxios.get<Client[]>(ENDPOINTS.META.CLIENTS);
    return response.data;
  },
  
  /**
   * Obtener lista de roles
   */
  async getRoles(): Promise<Role[]> {
    const response = await authAxios.get<Role[]>(ENDPOINTS.META.ROLES);
    return response.data;
  },
};