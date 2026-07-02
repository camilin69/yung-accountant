// store/meta.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { metaService } from '../services/meta.service';
import type { Client, Role } from '../services/types/user.types';

interface MetaStore {
  clients: Client[];
  roles: Role[];
  isLoading: boolean;
  error: string | null;
  isLoaded: boolean;
  clientsPromise: Promise<Client[]> | null;
  rolesPromise: Promise<Role[]> | null;
  
  loadClients: () => Promise<Client[]>;
  loadRoles: () => Promise<Role[]>;
  getClients: () => Promise<Client[]>;
  getRoles: () => Promise<Role[]>;
  clear: () => void;
}

export const useMetaStore = create<MetaStore>()(
  persist(
    (set, get) => ({
      clients: [],
      roles: [],
      isLoading: false,
      error: null,
      isLoaded: false,
      clientsPromise: null,
      rolesPromise: null,
      
      loadClients: async () => {
        const { clients, clientsPromise } = get();
        
        // Si ya tenemos clients en caché, devolverlos
        if (clients.length > 0) {
          return clients;
        }
        
        // Si ya hay una promesa en curso, esperarla
        if (clientsPromise) {
          return clientsPromise;
        }
        
        
        // Crear nueva promesa
        const promise = (async () => {
          set({ isLoading: true, error: null });
          try {
            const clients = await metaService.getClients();
            set({ clients, isLoading: false, isLoaded: true });
            return clients;
          } catch (error: any) {
            const errorMessage = error.response?.data?.error || error.message || 'Error al cargar clientes';
            set({ error: errorMessage, isLoading: false });
            throw error;
          } finally {
            set({ clientsPromise: null });
          }
        })();
        
        set({ clientsPromise: promise });
        return promise;
      },
      
      loadRoles: async () => {
        const { roles, rolesPromise } = get();
        
        // Si ya tenemos roles en caché, devolverlos
        if (roles.length > 0) {
          return roles;
        }
        
        // Si ya hay una promesa en curso, esperarla
        if (rolesPromise) {
          return rolesPromise;
        }
        
        
        // Crear nueva promesa
        const promise = (async () => {
          set({ isLoading: true, error: null });
          try {
            const roles = await metaService.getRoles();
            set({ roles, isLoading: false, isLoaded: true });
            return roles;
          } catch (error: any) {
            const errorMessage = error.response?.data?.error || error.message || 'Error al cargar roles';
            set({ error: errorMessage, isLoading: false });
            throw error;
          } finally {
            set({ rolesPromise: null });
          }
        })();
        
        set({ rolesPromise: promise });
        return promise;
      },
      
      getClients: async () => {
        const { clients, loadClients } = get();
        if (clients.length > 0) return clients;
        return loadClients();
      },
      
      getRoles: async () => {
        const { roles, loadRoles } = get();
        if (roles.length > 0) return roles;
        return loadRoles();
      },
      
      clear: () => set({ 
        clients: [], 
        roles: [], 
        isLoaded: false,
        clientsPromise: null,
        rolesPromise: null
      }),
    }),
    {
      name: 'yung-accountant-meta',
      partialize: (state) => ({
        clients: state.clients,
        roles: state.roles,
        isLoaded: state.isLoaded,
      }),
    }
  )
);