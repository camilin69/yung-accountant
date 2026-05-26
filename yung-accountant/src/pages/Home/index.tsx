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
import { FooterSection } from './FooterSection';

type Role = 'estudiante' | 'trabajador' | 'ama-de-casa';

const roles: { id: Role; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'estudiante', label: 'Student', icon: <GraduationCap className="w-4 h-4" />, description: 'Ocean Deep theme' },
  { id: 'trabajador', label: 'Worker', icon: <Briefcase className="w-4 h-4" />, description: 'Emerald Forest theme' },
  { id: 'ama-de-casa', label: 'Housewife', icon: <Heart className="w-4 h-4" />, description: 'Lavender Mist theme' },
];

const sections = [
  {
    id: 'dashboard',
    title: 'Command Center',
    icon: PieChart,
    description: 'Get a complete overview of your financial health with real-time statistics, spending charts, and net worth tracking — all from your command bridge.',
    features: ['Real-time balance updates', 'Spending by category charts', 'Monthly income vs expenses', 'Net worth progression']
  },
  {
    id: 'wallets',
    title: 'Wallets',
    icon: Wallet,
    description: 'Manage multiple wallets and accounts in one place. Track cash, bank accounts, and credit cards effortlessly.',
    features: ['Multi-wallet support', 'Real-time balance sync', 'Transaction history', 'Budget allocation per wallet']
  },
  {
    id: 'transactions',
    title: 'Transactions',
    icon: Repeat,
    description: 'Record and categorize every transaction. Never lose track of where your money goes.',
    features: ['Quick transaction entry', 'Smart categorization', 'Search and filter', 'Export capabilities']
  },
  {
    id: 'calendar',
    title: 'Calendar View',
    icon: Calendar,
    description: 'Visualize your financial activities on an interactive calendar. Plan ahead and never miss a payment.',
    features: ['Monthly calendar view', 'Upcoming payments', 'Recurring transactions', 'Payment reminders']
  },
  {
    id: 'categories',
    title: 'Categories',
    icon: Layers,
    description: 'Organize your finances with customizable categories. Create, edit, and personalize your spending categories.',
    features: ['Custom categories', 'Color coding', 'Icon selection', 'Budget allocation']
  },
  {
    id: 'debts',
    title: 'Debts',
    icon: CreditCard,
    description: 'Take control of your debts. Track loans, calculate interest, and plan your path to financial freedom.',
    features: ['Debt tracking', 'Interest calculation', 'Payment scheduling', 'Progress visualization']
  },
  {
    id: 'goals',
    title: 'Goals',
    icon: Target,
    description: 'Set and achieve your financial goals. Whether it\'s saving for a house or paying off debt, we help you stay on track.',
    features: ['Goal setting', 'Progress tracking', 'Milestone celebrations', 'Custom deadlines']
  },
  {
    id: 'simulation',
    title: 'Simulation',
    icon: Brain,
    description: 'Test different financial scenarios and see how your decisions impact your future finances before committing.',
    features: ['Investment simulation', 'Debt payoff scenarios', 'Savings projections', 'Risk analysis']
  },
  {
    id: 'habits',
    title: 'Habits',
    icon: TrendingUp,
    description: 'Build healthy financial habits with daily tracking and streak monitoring. Small changes lead to big results.',
    features: ['Daily habit tracking', 'Streak monitoring', 'Progress visualization', 'Achievement badges']
  }
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { heroRef, showScrollIndicator } = useHomeAnimation();
  
  // Theme toggle state
  const [selectedRole, setSelectedRole] = useState<Role>('estudiante');
  const [currentMode, setCurrentMode] = useState<'dark' | 'light'>('dark');

  // Inicializar tema
  useEffect(() => {
    const savedTheme = localStorage.getItem('preview-theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
      const [role, mode] = savedTheme.split('-');
      if (role) setSelectedRole(role as Role);
      if (mode) setCurrentMode(mode as 'dark' | 'light');
    } else {
      document.documentElement.setAttribute('data-theme', `${selectedRole}-${currentMode}`);
    }
  }, []);

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