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
      case 'estudiante': return 'Ocean Deep theme — Perfect for students';
      case 'trabajador': return 'Emerald Forest theme — Professional and elegant';
      case 'ama-de-casa': return 'Lavender Mist theme — Warm and welcoming';
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
                className="p-2.5 rounded-2xl transition-all duration-500 hover:-translate-y-0.5"
                style={{
                  backgroundColor: currentMode === 'dark' ? 'var(--theme-background-glass-hover)' : 'var(--theme-background-glass)',
                  border: currentMode === 'dark' ? '1px solid var(--theme-border-medium)' : '1px solid var(--theme-border-dark)',
                  boxShadow: currentMode === 'dark' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                }}
                title="Dark Mode"
              >
                <Moon className="w-4 h-4" style={{ color: currentMode === 'dark' ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)' }} />
              </button>
              <button 
                onClick={() => setMode('light')}
                className="p-2.5 rounded-2xl transition-all duration-500 hover:-translate-y-0.5"
                style={{
                  backgroundColor: currentMode === 'light' ? 'var(--theme-background-glass-hover)' : 'var(--theme-background-glass)',
                  border: currentMode === 'light' ? '1px solid var(--theme-border-medium)' : '1px solid var(--theme-border-dark)',
                  boxShadow: currentMode === 'light' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                }}
                title="Light Mode"
              >
                <Sun className="w-4 h-4" style={{ color: currentMode === 'light' ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)' }} />
              </button>
              <button 
                onClick={toggleMode}
                className="p-2.5 rounded-2xl transition-all duration-500 hover:-translate-y-0.5 glass-sm"
                style={{ color: 'var(--theme-text-tertiary)' }}
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
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl glass-sm">
              <div className="w-3 h-3 rounded-full animate-pulse-subtle" style={{ backgroundColor: 'var(--theme-primary)' }} />
              <span className="text-xs font-medium capitalize" style={{ color: 'var(--theme-text-primary)' }}>
                {getRoleDisplayName()}
              </span>
              <Sparkles className="w-3.5 h-3.5" style={{ color: '#F59E0B' }} strokeWidth={1.5} />
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
              className="px-4 py-2.5 rounded-2xl text-sm font-medium focus:outline-none transition-all duration-500 glass-sm"
              style={{ color: 'var(--theme-text-primary)' }}
            >
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="COP">COP — Colombian Peso</option>
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
              className="relative w-11 h-6 rounded-full transition-all duration-500"
              style={{ backgroundColor: notificationsEnabled ? 'var(--theme-primary)' : 'var(--theme-background-glass-hover)' }}
            >
              <div 
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-500 shadow-md"
                style={{ left: notificationsEnabled ? 'calc(100% - 1.375rem)' : '0.125rem' }}
              />
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
    <div className="max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-10 pt-4 animate-fade-in-down">
        <h1 className="text-[34px] font-light tracking-[-0.03em]" style={{ color: 'var(--theme-text-primary)' }}>
          Settings
        </h1>
        <p className="text-[14px] mt-1.5 tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)' }}>
          Manage your account preferences
        </p>
      </div>

      {/* Theme Preview Card */}
      <div className="mb-8 p-6 rounded-[1.75rem] glass-md animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[15px] font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>Current Theme Preview</p>
            <p className="text-[12px] tracking-[0.03em] mt-1" style={{ color: 'var(--theme-text-tertiary)' }}>
              {currentMode === 'dark' ? 'Dark Mode' : 'Light Mode'} · {getRoleDisplayName()} Role
            </p>
          </div>
          <div className="flex items-center gap-2">
            {['var(--theme-primary)', 'var(--theme-secondary)', 'var(--theme-accent)'].map((color, i) => (
              <div 
                key={i}
                className="w-9 h-9 rounded-[0.85rem] flex items-center justify-center glass-sm transition-transform duration-500 hover:scale-110"
                style={{ backgroundColor: `${color}20` }}
              >
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {settingsSections.map((section, idx) => (
          <div 
            key={idx} 
            className="rounded-[2rem] overflow-hidden glass-md animate-fade-in-up"
            style={{ animationDelay: `${200 + idx * 100}ms` }}
          >
            <div className="px-6 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
              <div className="w-9 h-9 rounded-[1rem] flex items-center justify-center glass-sm">
                <section.icon className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />
              </div>
              <h2 className="text-[15px] font-medium tracking-[0.02em]" style={{ color: 'var(--theme-text-primary)' }}>
                {section.title}
              </h2>
            </div>
            <div>
              {section.items.map((item, itemIdx) => (
                <div 
                  key={itemIdx}
                  className="px-6 py-5 flex items-center justify-between transition-all duration-300 cursor-pointer hover:bg-[var(--theme-background-glass-hover)]"
                  onClick={item.onClick}
                  style={{ borderBottom: itemIdx < section.items.length - 1 ? '1px solid var(--theme-border-dark)' : 'none' }}
                >
                  <div>
                    <p className="text-sm font-medium tracking-[0.02em]" style={{ color: 'var(--theme-text-primary)' }}>{item.label}</p>
                    <p className="text-[12px] tracking-[0.03em] mt-1" style={{ color: 'var(--theme-text-tertiary)' }}>{item.description}</p>
                  </div>
                  {item.component ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      {item.component}
                    </div>
                  ) : (
                    <div className="p-1.5 rounded-2xl transition-all duration-300 group-hover:translate-x-1">
                      <ChevronRight className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Save Button */}
        <div className="flex justify-end animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          <button
            onClick={handleSavePreferences}
            className="px-6 py-3 rounded-2xl text-[13px] font-medium tracking-[0.04em] uppercase transition-all duration-500 hover:-translate-y-1 active:scale-95"
            style={{ backgroundColor: 'var(--theme-primary)', color: '#FFFFFF', boxShadow: '0 4px 20px -6px var(--theme-primary)' }}
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