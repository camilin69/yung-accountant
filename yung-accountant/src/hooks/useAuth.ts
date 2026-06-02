// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { useUserStore } from '../store/user.store';

export const useAuth = () => {
  const { isAuthenticated, initialize, isInitialized } = useUserStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initialize();
      setIsReady(true);
    };
    init();
  }, [initialize]);

  return { isAuthenticated, isReady, isInitialized };
};