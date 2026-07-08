// pages/Home/index.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart,
  Wallet,
  Repeat,
  Calendar,
  Layers,
  CreditCard,
  Target,
  Brain,
  TrendingUp,
  GraduationCap,
  Briefcase,
  Heart
} from 'lucide-react';
import Galaxy from '../../components/common/Galaxy';
import { useHomeAnimation } from './useHomeAnimation';
import { HeroSection } from './HeroSection';
import { FeatureSection } from './FeatureSection';
import { StatsSection } from './StatsSection';
import { CTASection } from './CTASection';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { FooterSection } from './FooterSection';
import { useTranslation } from '../../i18n';

type Role = 'estudiante' | 'trabajador' | 'ama-de-casa';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { heroRef, showScrollIndicator } = useHomeAnimation();

  // Theme toggle state
  const [selectedRole, setSelectedRole] = useState<Role>('estudiante');
  const [currentMode, setCurrentMode] = useState<'dark' | 'light'>('dark');

  const roles: { id: Role; label: string; icon: React.ReactNode; description: string }[] = [
    { id: 'estudiante', label: t('theme.estudiante'), icon: <GraduationCap className="w-4 h-4" />, description: t('theme.estudianteDesc') },
    { id: 'trabajador', label: t('theme.trabajador'), icon: <Briefcase className="w-4 h-4" />, description: t('theme.trabajadorDesc') },
    { id: 'ama-de-casa', label: t('theme.ama-de-casa'), icon: <Heart className="w-4 h-4" />, description: t('theme.ama-de-casaDesc') },
  ];

  // Section name mapping: section id → i18n key prefix
  const sectionKeyMap: Record<string, string> = {
    dashboard: 'home.sectionCommandCenter',
    wallets: 'home.sectionWallets',
    transactions: 'home.sectionTransactions',
    calendar: 'home.sectionCalendar',
    categories: 'home.sectionCategories',
    debts: 'home.sectionDebts',
    goals: 'home.sectionGoals',
    simulation: 'home.sectionSimulation',
    habits: 'home.sectionHabits',
  };

  // Feature i18n key mapping per section
  const featureKeysMap: Record<string, string[]> = {
    dashboard: ['home.featureRealTimeUpdates', 'home.featureSpendingCharts', 'home.featureIncomeVsExpenses', 'home.featureNetWorth'],
    wallets: ['home.featureMultiWallet', 'home.featureBalanceSync', 'home.featureTransactionHistory', 'home.featureBudgetAllocation'],
    transactions: ['home.featureQuickEntry', 'home.featureSmartCategorization', 'home.featureSearchFilter', 'home.featureExport'],
    calendar: ['home.featureMonthlyCalendar', 'home.featureUpcomingPayments', 'home.featureRecurringTransactions', 'home.featurePaymentReminders'],
    categories: ['home.featureCustomCategories', 'home.featureColorCoding', 'home.featureIconSelection', 'home.featureCategoryBudget'],
    debts: ['home.featureDebtTracking', 'home.featureInterestCalculation', 'home.featurePaymentScheduling', 'home.featureProgressVisualization'],
    goals: ['home.featureGoalSetting', 'home.featureProgressTracking', 'home.featureMilestoneCelebrations', 'home.featureCustomDeadlines'],
    simulation: ['home.featureInvestmentSimulation', 'home.featureDebtPayoffScenarios', 'home.featureSavingsProjections', 'home.featureRiskAnalysis'],
    habits: ['home.featureDailyHabitTracking', 'home.featureStreakMonitoring', 'home.featureAchievementBadges', 'home.featureProgressVisualization'],
  };

  const sections = [
    { id: 'dashboard', icon: PieChart },
    { id: 'wallets', icon: Wallet },
    { id: 'transactions', icon: Repeat },
    { id: 'calendar', icon: Calendar },
    { id: 'categories', icon: Layers },
    { id: 'debts', icon: CreditCard },
    { id: 'goals', icon: Target },
    { id: 'simulation', icon: Brain },
    { id: 'habits', icon: TrendingUp },
  ].map(s => ({
    ...s,
    title: t(sectionKeyMap[s.id]),
    description: t(sectionKeyMap[s.id] + 'Desc'),
    features: (featureKeysMap[s.id] || []).map(k => t(k)),
  }));

  // Inicializar tema (misma lógica que LoginNavbar/RegisterNavbar)
  useEffect(() => {
    const savedTheme = localStorage.getItem('preview-theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
      const mode = savedTheme.endsWith('-dark') ? 'dark' : savedTheme.endsWith('-light') ? 'light' : 'dark';
      const role = savedTheme.slice(0, -(mode.length + 1)); // remove "-dark" or "-light"
      if (role) setSelectedRole(role as Role);
      setCurrentMode(mode as 'dark' | 'light');
    } else {
      document.documentElement.setAttribute('data-theme', `${selectedRole}-${currentMode}`);
    }
  }, []);

  useDocumentTitle(t('pagetitle.home'));

  // Cambiar rol
  const handleRoleChange = (role: Role) => {
    setSelectedRole(role);
    const newTheme = `${role}-${currentMode}`;
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('preview-theme', newTheme);
  };

  // Toggle modo
  const toggleMode = () => {
    const newMode = currentMode === 'dark' ? 'light' : 'dark';
    setCurrentMode(newMode);
    const newTheme = `${selectedRole}-${newMode}`;
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('preview-theme', newTheme);
  };

  const handleGetStarted = () => navigate('/register');
  const handleLogin = () => navigate('/login');

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: 'var(--theme-background-primary)' }}>
      {/* Fondo Galáctico */}
      <Galaxy />

      <HeroSection 
        onGetStarted={handleGetStarted}
        onLogin={handleLogin}
        heroRef={heroRef as React.RefObject<HTMLDivElement>}
        showScrollIndicator={showScrollIndicator}
        selectedRole={selectedRole}
        currentMode={currentMode}
        onRoleChange={handleRoleChange}
        onToggleMode={toggleMode}
        roles={roles}
      />

      {sections.map((section, index) => (
        <FeatureSection 
          key={section.id}
          feature={section}
          index={index}
          isEven={index % 2 === 0}
        />
      ))}

      <StatsSection />
      <CTASection onGetStarted={handleGetStarted} />
      <FooterSection />
    </div>
  );
};

export default Home;