// pages/Settings/index.tsx
import React, { useState } from 'react';
import { User, Bell, Palette, Shield, ChevronRight, Moon, Sun, Monitor } from 'lucide-react';
import { useUserStore } from '../../store';
import ToastNotification from '../../components/common/ToastNotification';

const Settings: React.FC = () => {
  const { user } = useUserStore();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
  const [currency, setCurrency] = useState('USD');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleSavePreferences = () => {
    setToastMessage('Preferences saved successfully');
    setToastType('success');
    setShowToast(true);
  };

  const settingsSections = [
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
      title: 'Preferences',
      icon: Palette,
      items: [
        { 
          label: 'Theme', 
          description: 'Choose your preferred theme',
          component: (
            <div className="flex gap-2">
              <button 
                onClick={() => setTheme('light')}
                className={`p-2 rounded-lg transition-colors ${theme === 'light' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
              >
                <Sun className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setTheme('dark')}
                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
              >
                <Moon className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setTheme('system')}
                className={`p-2 rounded-lg transition-colors ${theme === 'system' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
              >
                <Monitor className="w-4 h-4" />
              </button>
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
              className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/80"
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
      title: 'Notifications',
      icon: Bell,
      items: [
        {
          label: 'Push Notifications',
          description: 'Receive push notifications',
          component: (
            <button 
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`relative w-10 h-5 rounded-full transition-colors ${notificationsEnabled ? 'bg-[#6366F1]' : 'bg-white/20'}`}
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
        <h1 className="text-2xl font-light bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight">
          Settings
        </h1>
        <p className="text-xs text-white/40 mt-0.5 font-light">
          Manage your account preferences
        </p>
      </div>

      <div className="space-y-6">
        {settingsSections.map((section, idx) => (
          <div key={idx} className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center gap-2">
              <section.icon className="w-4 h-4 text-[#6366F1]" />
              <h2 className="text-sm font-light text-white">{section.title}</h2>
            </div>
            <div className="divide-y divide-white/5">
              {section.items.map((item, itemIdx) => (
                <div 
                  key={itemIdx}
                  className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={item.onClick}
                >
                  <div>
                    <p className="text-sm font-light text-white/80">{item.label}</p>
                    <p className="text-xs text-white/40 mt-1">{item.description}</p>
                  </div>
                  {item.component ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      {item.component}
                    </div>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-white/30" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <button
            onClick={handleSavePreferences}
            className="px-6 py-2.5 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-lg text-white text-sm font-light hover:scale-[1.02] transition-all duration-300"
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