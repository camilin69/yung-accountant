// pages/Community/TrendingSidebar.tsx
import React from 'react';
import { TrendingUp, Users, Hash, Flame, Sparkles } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface TrendingTopic { id: string; topic: string; posts: number; category: string; }
interface SuggestedUser { id: string; username: string; displayName: string; followers: number; }

interface TrendingSidebarProps {
  trendingTopics?: TrendingTopic[];
  suggestedUsers?: SuggestedUser[];
  onUserClick?: (userId: string) => void;
  onTopicClick?: (topic: string) => void;
}

export const TrendingSidebar: React.FC<TrendingSidebarProps> = ({ 
  trendingTopics = [
    { id: '1', topic: 'SavingsTips', posts: 1234, category: 'Finance' },
    { id: '2', topic: 'DebtFree', posts: 892, category: 'Debt' },
    { id: '3', topic: 'Investing101', posts: 756, category: 'Investing' },
    { id: '4', topic: 'Budgeting', posts: 645, category: 'Budget' },
    { id: '5', topic: 'FinancialFreedom', posts: 523, category: 'Goals' },
  ],
  suggestedUsers = [
    { id: '2', username: 'finance_guru', displayName: 'Finance Guru', followers: 1234 },
    { id: '3', username: 'saving_master', displayName: 'Saving Master', followers: 892 },
    { id: '4', username: 'debt_free', displayName: 'Debt Free Journey', followers: 756 },
  ],
  onUserClick, onTopicClick,
}) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="rounded-2xl overflow-hidden glass-sm">
        <div className="p-4" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
            <h3 className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Trending Now</h3>
          </div>
        </div>
        <div>
          {trendingTopics.map((topic, idx) => (
            <button key={topic.id} onClick={() => onTopicClick?.(topic.topic)}
              className="w-full p-4 text-left transition-colors group hover:bg-[var(--theme-background-glass-hover)]" style={{ borderBottom: idx < trendingTopics.length - 1 ? '1px solid var(--theme-border-dark)' : 'none' }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {idx < 3 ? <Flame className="w-3 h-3 text-orange-500" /> : <Hash className="w-3 h-3" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.4 }} />}
                    <span className="text-xs" style={{ color: 'var(--theme-text-tertiary)' }}>{topic.category}</span>
                  </div>
                  <p className="text-sm font-medium transition-colors" style={{ color: 'var(--theme-text-primary)' }}>#{topic.topic}</p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>{topic.posts.toLocaleString()} {t('community.posts')}</p>
                </div>
                {idx === 0 && <Sparkles className="w-3 h-3 text-yellow-500 animate-pulse" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden glass-sm">
        <div className="p-4" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
            <h3 className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Suggested for you</h3>
          </div>
        </div>
        <div>
          {suggestedUsers.map((user, idx) => (
            <div key={user.id} className="p-4 flex items-center justify-between" style={{ borderBottom: idx < suggestedUsers.length - 1 ? '1px solid var(--theme-border-dark)' : 'none' }}>
              <button onClick={() => onUserClick?.(user.id)} className="flex items-center gap-3 flex-1 text-left">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--theme-gradient-primary)' }}>
                  <span className="text-white text-xs font-medium">{user.displayName.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-medium transition-colors" style={{ color: 'var(--theme-text-primary)' }}>{user.displayName}</p>
                  <p className="text-xs" style={{ color: 'var(--theme-text-tertiary)' }}>@{user.username}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>{user.followers.toLocaleString()} followers</p>
                </div>
              </button>
              <button className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 hover:-translate-y-0.5 glass-sm" style={{ color: 'var(--theme-primary)' }}>Follow</button>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          <a href="#" className="text-[10px] transition-colors" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.4 }}>Terms</a>
          <span className="text-[10px]" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.2 }}>•</span>
          <a href="#" className="text-[10px] transition-colors" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.4 }}>Privacy</a>
          <span className="text-[10px]" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.2 }}>•</span>
          <a href="#" className="text-[10px] transition-colors" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.4 }}>Cookie Policy</a>
        </div>
        <p className="text-[9px] mt-2" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.2 }}>© 2024 Yung Accountant</p>
      </div>
    </div>
  );
};