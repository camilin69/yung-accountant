// pages/Settings/index.tsx
import React, { useState } from 'react';
import { User, Bell, Palette, Shield, ChevronRight, Moon, Sun, Monitor, Sparkles } from 'lucide-react';
import { useTheme, useThemeStyles } from '../../hooks/useTheme';
import ToastNotification from '../../components/common/ToastNotification';

const Settings: React.FC = () => {
  const { currentRole, currentMode, setMode, toggleMode } = useTheme();
  const { getGradientTextClass } = useThemeStyles();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [currency, setCurrency] = useState('USD');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleSavePreferences = () => {
    setToastMessage('Preferences saved successfully');
    setToastType('success');
    setShowToast(true);
  };

  // Información del tema actual
  const getRoleDisplayName = () => {
    switch (currentRole) {
      case 'estudiante': return 'Student';
      case 'trabajador': return 'Worker';
      case 'ama-de-casa': return 'Housewife';
      default: return 'Student';
    }
  };

  const getRoleDescription = () => {
    switch (currentRole) {
      case 'estudiante': return 'Ocean Deep theme - Perfect for students';
      case 'trabajador': return 'Emerald Forest theme - Professional and elegant';
      case 'ama-de-casa': return 'Lavender Mist theme - Warm and welcoming';
      default: return '';
    }
  };

  const settingsSections = [
    {
      title: 'Appearance',
      icon: Palette,
      items: [
        { 
          label: 'Theme Mode', 
          description: `Currently in ${currentMode === 'dark' ? 'Dark Mode' : 'Light Mode'}`,
          component: (
            <div className="flex gap-2">
              <button 
                onClick={() => setMode('dark')}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  currentMode === 'dark' 
                    ? 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] ring-1 ring-[var(--theme-primary)]' 
                    : 'bg-[var(--theme-background-glass)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]'
                }`}
                title="Dark Mode"
              >
                <Moon className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setMode('light')}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  currentMode === 'light' 
                    ? 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] ring-1 ring-[var(--theme-primary)]' 
                    : 'bg-[var(--theme-background-glass)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]'
                }`}
                title="Light Mode"
              >
                <Sun className="w-4 h-4" />
              </button>
              <button 
                onClick={toggleMode}
                className={`p-2 rounded-lg transition-all duration-300 bg-[var(--theme-background-glass)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]`}
                title="Toggle Mode"
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>
          )
        },
        { 
          label: 'Current Theme', 
          description: getRoleDescription(),
          component: (
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full bg-[var(--theme-primary)] animate-pulse`} />
              <span className="text-xs font-light text-[var(--theme-text-primary)] capitalize">
                {getRoleDisplayName()}
              </span>
              <Sparkles className="w-3 h-3 text-yellow-500" />
            </div>
          )
        },
        {
          label: 'Currency',
          description: 'Default currency for transactions',
          component: (
            <select 
              value={currency} 
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg px-3 py-1.5 text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-primary)]/50 transition-colors"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="COP">COP - Colombian Peso</option>
            </select>
          )
        },
      ]
    },
    {
      title: 'Account',
      icon: User,
      items: [
        { label: 'Profile Information', description: 'Update your personal information', onClick: () => {} },
        { label: 'Change Password', description: 'Update your password', onClick: () => {} },
        { label: 'Email Preferences', description: 'Manage email notifications', onClick: () => {} },
      ]
    },
    {
      title: 'Notifications',
      icon: Bell,
      items: [
        {
          label: 'Push Notifications',
          description: 'Receive push notifications',
          component: (
            <button 
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`relative w-10 h-5 rounded-full transition-colors ${notificationsEnabled ? 'bg-[var(--theme-primary)]' : 'bg-[var(--theme-border-light)]'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${notificationsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          )
        },
        { label: 'Email Digest', description: 'Weekly summary of your finances', onClick: () => {} },
        { label: 'Goal Reminders', description: 'Get notified about goal progress', onClick: () => {} },
      ]
    },
    {
      title: 'Privacy & Security',
      icon: Shield,
      items: [
        { label: 'Two-Factor Authentication', description: 'Add an extra layer of security', onClick: () => {} },
        { label: 'Data Export', description: 'Export your financial data', onClick: () => {} },
        { label: 'Connected Apps', description: 'Manage third-party integrations', onClick: () => {} },
      ]
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className={`text-2xl font-light tracking-tight ${getGradientTextClass()}`}>
          Settings
        </h1>
        <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 font-light">
          Manage your account preferences
        </p>
      </div>

      {/* Theme Preview Card */}
      <div className="mb-6 p-4 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-light text-[var(--theme-text-primary)]">Current Theme Preview</p>
            <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5">
              {currentMode === 'dark' ? 'Dark Mode' : 'Light Mode'} • {getRoleDisplayName()} Role
            </p>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)]/20 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-[var(--theme-primary)]" />
            </div>
            <div className="w-8 h-8 rounded-lg bg-[var(--theme-secondary)]/20 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-[var(--theme-secondary)]" />
            </div>
            <div className="w-8 h-8 rounded-lg bg-[var(--theme-accent)]/20 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-[var(--theme-accent)]" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {settingsSections.map((section, idx) => (
          <div key={idx} className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl overflow-hidden">
            <div className="p-5 border-b border-[var(--theme-border-light)] flex items-center gap-2">
              <section.icon className="w-4 h-4 text-[var(--theme-primary)]" />
              <h2 className="text-sm font-light text-[var(--theme-text-primary)]">{section.title}</h2>
            </div>
            <div className="divide-y divide-[var(--theme-border-dark)]">
              {section.items.map((item, itemIdx) => (
                <div 
                  key={itemIdx}
                  className="p-5 flex items-center justify-between hover:bg-[var(--theme-background-glass-hover)] transition-colors cursor-pointer"
                  onClick={item.onClick}
                >
                  <div>
                    <p className="text-sm font-light text-[var(--theme-text-primary)]">{item.label}</p>
                    <p className="text-xs text-[var(--theme-text-tertiary)] mt-1">{item.description}</p>
                  </div>
                  {item.component ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      {item.component}
                    </div>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[var(--theme-text-tertiary)]" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <button
            onClick={handleSavePreferences}
            className="px-6 py-2.5 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-dark)] rounded-lg text-white text-sm font-light hover:scale-[1.02] transition-all duration-300 btn-hover"
          >
            Save Changes
          </button>
        </div>
      </div>

      <ToastNotification
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </div>
  );
};

export default Settings;