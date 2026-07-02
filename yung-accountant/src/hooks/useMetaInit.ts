// hooks/useMetaInit.ts
import { useEffect, useRef } from 'react';
import { useMetaStore } from '../store/meta.store';

export const useMetaInit = () => {
  const { clients, roles, loadClients, loadRoles, isLoaded } = useMetaStore();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Solo inicializar una vez
    if (!hasInitialized.current && !isLoaded) {
      hasInitialized.current = true;
      
      // Cargar ambos en paralelo
      Promise.all([
        loadClients(),
        loadRoles()
      ]).catch(error => {
        console.error('Error loading meta data:', error);
      });
    }
  }, [isLoaded, loadClients, loadRoles]);

  return { clients, roles, isLoaded };
};