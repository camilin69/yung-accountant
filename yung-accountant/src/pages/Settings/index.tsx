// pages/Settings/index.tsx
import React, { useState, useEffect } from 'react';
import { User, Bell, Palette, Shield, ChevronRight, Moon, Sun, Monitor, Sparkles, Download } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useTheme } from '../../hooks/useTheme';
import ToastNotification from '../../components/common/ToastNotification';
import { pwaService } from '../../services/pwa.service';

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { currentRole, currentMode, setMode, toggleMode } = useTheme();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [currency, setCurrency] = useState('USD');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [hasPrompt, setHasPrompt] = useState(!!pwaService.getPrompt());
  const [isInstalled, setIsInstalled] = useState(pwaService.isInstalled());

  useDocumentTitle(t('settings.title'));

  // Subscribe to pwaService changes
  useEffect(() => {
    const installed = pwaService.isInstalled();
    const prompt = pwaService.getPrompt();

    if (installed) {
      setIsInstalled(true);
    }
    if (prompt) {
      setHasPrompt(true);
    }

    return pwaService.subscribe(() => {
      const p = pwaService.getPrompt();
      const i = pwaService.isInstalled();
      setHasPrompt(!!p);
      setIsInstalled(i);
    });
  }, []);

  const handleInstallClick = async () => {
    const prompt = pwaService.getPrompt();

    if (!prompt) {
      setToastMessage(t('settings.installNotAvailable'));
      setToastType('warning');
      setShowToast(true);
      return;
    }

    try {
      const accepted = await pwaService.install();

      if (accepted) {
        setToastMessage(t('settings.installSuccess'));
        setToastType('success');
        setShowToast(true);
        setIsInstalled(true);
        setHasPrompt(false);
      } else {
        setToastMessage(t('settings.installCancelled'));
        setToastType('info');
        setShowToast(true);
      }
    } catch (err: any) {
      setToastMessage(t('settings.installFailed') + ': ' + (err.message || 'unknown error'));
      setToastType('error');
      setShowToast(true);
    }
  };

  const handleSavePreferences = () => {
    setToastMessage(t('settings.preferencesSaved'));
    setToastType('success');
    setShowToast(true);
  };

  const getRoleDisplayName = () => t(`theme.${currentRole}`);

  const getRoleDescription = () => t(`theme.${currentRole}Desc`);

  const settingsSections = [
    {
      title: t('settings.appearance'),
      icon: Palette,
      items: [
        { 
          label: t('settings.themeMode'),
          description: `${t('settings.themeModeDesc')} ${currentMode === 'dark' ? t('settings.darkMode') : t('settings.lightMode')}`,
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
                title={t('settings.darkMode')}
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
                title={t('settings.lightMode')}
              >
                <Sun className="w-4 h-4" style={{ color: currentMode === 'light' ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)' }} />
              </button>
              <button 
                onClick={toggleMode}
                className="p-2.5 rounded-2xl transition-all duration-500 hover:-translate-y-0.5 glass-sm"
                style={{ color: 'var(--theme-text-tertiary)' }}
                title={t('settings.toggleMode')}
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>
          )
        },
        { 
          label: t('settings.currentTheme'),
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
          label: t('settings.currency'),
          description: t('settings.currencyDesc'),
          component: (
            <select 
              value={currency} 
              onChange={(e) => setCurrency(e.target.value)}
              className="px-4 py-2.5 rounded-2xl text-sm font-medium focus:outline-none transition-all duration-500 glass-sm"
              style={{ color: 'var(--theme-text-primary)' }}
            >
              <option value="USD">{t('settings.currencyUsd')}</option>
              <option value="EUR">{t('settings.currencyEur')}</option>
              <option value="GBP">{t('settings.currencyGbp')}</option>
              <option value="COP">{t('settings.currencyCop')}</option>
            </select>
          )
        },
      ]
    },
    {
      title: t('settings.account'),
      icon: User,
      items: [
        { label: t('settings.profileInformation'), description: t('settings.profileInformationDesc'), onClick: () => {} },
        { label: t('settings.changePassword'), description: t('settings.changePasswordDesc'), onClick: () => {} },
        { label: t('settings.emailPreferences'), description: t('settings.emailPreferencesDesc'), onClick: () => {} },
      ]
    },
    {
      title: t('settings.notifications'),
      icon: Bell,
      items: [
        {
          label: t('settings.pushNotifications'),
          description: t('settings.pushNotificationsDesc'),
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
        { label: t('settings.emailDigest'), description: t('settings.emailDigestDesc'), onClick: () => {} },
        { label: t('settings.goalReminders'), description: t('settings.goalRemindersDesc'), onClick: () => {} },
      ]
    },
    {
      title: t('settings.installApp'),
      icon: Download,
      items: [
        // Always show iOS / manual install instructions (applies to all mobile browsers)
        {
          label: t('settings.installOnIOS'),
          description: t('settings.installOnIOSDesc'),
          onClick: () => {},
        },
        // Show one-click install button when available (Chrome/Edge/Android)
        ...(hasPrompt && !isInstalled ? [{
          label: t('settings.installNow'),
          description: t('settings.installAppDesc'),
          component: (
            <button
              onClick={handleInstallClick}
              className="glass-btn-primary px-4 py-2 text-xs"
            >
              {t('settings.installNow')}
            </button>
          ),
        }] : []),
        // Show installed badge
        ...(isInstalled ? [{
          label: t('settings.installed'),
          description: t('settings.installedDesc'),
          component: (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'var(--semantic-income)', opacity: 0.15 }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--semantic-income)' }} />
              <span className="text-[11px] font-medium" style={{ color: 'var(--semantic-income)' }}>{t('settings.installedCheck')}</span>
            </div>
          ),
        }] : []),
      ],
    },
    {
      title: t('settings.privacySecurity'),
      icon: Shield,
      items: [
        { label: t('settings.twoFactor'), description: t('settings.twoFactorDesc'), onClick: () => {} },
        { label: t('settings.dataExport'), description: t('settings.dataExportDesc'), onClick: () => {} },
        { label: t('settings.connectedApps'), description: t('settings.connectedAppsDesc'), onClick: () => {} },
      ]
    },
  ];

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-10 pt-4 animate-fade-in-down">
        <h1 className="text-[34px] font-light tracking-[-0.03em]" style={{ color: 'var(--theme-text-primary)' }}>
          {t('settings.title')}
        </h1>
        <p className="text-[14px] mt-1.5 tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)' }}>
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Theme Preview Card */}
      <div className="mb-8 p-6 rounded-[1.75rem] glass-md animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[15px] font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>{t('settings.currentThemePreview')}</p>
            <p className="text-[12px] tracking-[0.03em] mt-1" style={{ color: 'var(--theme-text-tertiary)' }}>
              {t('settings.currentThemePreviewDesc', { mode: currentMode === 'dark' ? t('settings.darkMode') : t('settings.lightMode'), role: getRoleDisplayName() })}
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
            {t('common.saveChanges')}
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