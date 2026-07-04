// /src/components/layout/Layout.tsx
import React, { memo, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Galaxy from '../common/Galaxy';
import SkipLink from '../common/SkipLink';
import OfflineBanner from '../common/OfflineBanner';
import SyncIndicator from '../common/SyncIndicator';
import PwaReloadPrompt from '../common/PwaReloadPrompt';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useTransactionStore } from '../../store/transaction.store';
import { useWalletStore } from '../../store/wallet.store';
import { useGoalStore } from '../../store/goal.store';
import { useDebtStore } from '../../store/debt.store';
import { useHabitStore } from '../../store/habit.store';
import { useCategoryStore } from '../../store/category.store';
import { useSimulationStore } from '../../store/simulation.store';
import { useUserStore } from '../../store/user.store';

const MemoizedOutlet = memo(() => <Outlet />);

const Layout: React.FC = () => {
  const location = useLocation();
  const mainContentRef = useRef<HTMLDivElement>(null);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load user profile when entering protected routes — the landing page
  // doesn't trigger this, so /users/me only fires inside the app.
  useEffect(() => {
    useUserStore.getState().loadUserProfile();
  }, []);

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
    if (!isDesktop) {
      setIsMobileMenuOpen(false);
    }
  }, [location.pathname, isDesktop]);

  // When background sync finishes, replay any deferred operations.
  // Also refresh wallets + transactions — the SW may have replayed
  // non-deferred mutations (real-UUID entities edited offline).
  useEffect(() => {
    const handleSyncComplete = async () => {
      const pendingGoals = useGoalStore.getState().pendingGoalTransactions.length > 0;
      const pendingDebts = useDebtStore.getState().pendingDebtPayments.length > 0;
      const pendingHabits = useHabitStore.getState().pendingChecks.length > 0;

      const needsGoals = useGoalStore.getState()._needsRefresh;
      const needsDebts = useDebtStore.getState()._needsRefresh;
      const needsHabits = useHabitStore.getState()._needsRefresh;

      // pendingHabits can have stale entries from old sessions (zustand persist).
      // Only count habits as deferred if _needsRefresh is also set, which means
      // a habit was actually mutated offline in this session.
      const hasDeferred = pendingGoals || pendingDebts || (pendingHabits && needsHabits);

      // Always refresh wallets + transactions — the SW replays mutations
      await useWalletStore.getState().fetchWallets(true);
      await useTransactionStore.getState().fetchTransactions(true);

      if (hasDeferred) {
        if (pendingGoals) await useGoalStore.getState().fetchGoals(true);
        if (pendingDebts) await useDebtStore.getState().fetchDebts(true);
        if (pendingHabits && needsHabits) {
          await useHabitStore.getState().fetchHabits(true);
          useHabitStore.getState().replayPendingChecks();
        }
        if (pendingGoals) {
          await useGoalStore.getState().replayPendingTransactions();
        }
        if (pendingDebts) {
          await useDebtStore.getState().replayPendingPayments();
        }
      }

      // Final refresh — only for stores that had offline mutations.
      // pending* covers deferred transactions; needs* covers real-UUID mutations.
      if (pendingGoals || needsGoals) await useGoalStore.getState().fetchGoals(true);
      if (pendingDebts || needsDebts) await useDebtStore.getState().fetchDebts(true);
      if (needsHabits) await useHabitStore.getState().fetchHabits(true);
      useCategoryStore.getState().clearCache();
      useSimulationStore.getState().clearCache();
    };
    window.addEventListener('bg-sync:completed', handleSyncComplete);
    return () => window.removeEventListener('bg-sync:completed', handleSyncComplete);
  }, []);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--theme-background-primary)' }}>
      {/* Skip-to-content link for keyboard users */}
      <SkipLink />

      {/* Fondo galáctico global */}
      <Galaxy />
      
      <Navbar onMobileMenuClick={toggleMobileMenu} />

      {/* Status banners — stacked so they don't overlap.
          Each renders conditionally based on offline / sync state. */}
      <div className="sticky top-[68px] z-30">
        <OfflineBanner />
        <SyncIndicator />
      </div>

      <div className="flex flex-1 overflow-hidden pt-[64px] relative">
        <div className={`
          fixed lg:relative inset-y-0 left-0 z-40
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <Sidebar isMobileOpen={isMobileMenuOpen} onCloseMobile={closeMobileMenu} />
        </div>
        
        {isMobileMenuOpen && !isDesktop && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
            onClick={closeMobileMenu}
          />
        )}
        
        <main
          id="main-content"
          ref={mainContentRef}
          className="flex-1 overflow-y-auto w-full smooth-scroll relative"
          style={{ backgroundColor: 'transparent' }}
        >
          <div className="p-3 sm:p-4 md:p-6 max-w-[1400px] mx-auto">
            <MemoizedOutlet />
          </div>
        </main>
      </div>
      <PwaReloadPrompt />
    </div>
  );
};

export default memo(Layout);