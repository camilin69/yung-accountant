// pages/Community/TrendingSidebar.tsx
import React from 'react';
import { TrendingUp, Users, Hash, Flame, Sparkles } from 'lucide-react';

interface TrendingTopic {
  id: string;
  topic: string;
  posts: number;
  category: string;
}

interface SuggestedUser {
  id: string;
  username: string;
  displayName: string;
  followers: number;
}

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
  onUserClick,
  onTopicClick,
}) => {
  return (
    <div className="space-y-4">
      {/* Trending Section */}
      <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[var(--theme-border-light)]">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--theme-primary)]" />
            <h3 className="text-sm font-light text-[var(--theme-text-primary)]">Trending Now</h3>
          </div>
        </div>
        <div className="divide-y divide-[var(--theme-border-dark)]">
          {trendingTopics.map((topic, idx) => (
            <button
              key={topic.id}
              onClick={() => onTopicClick?.(topic.topic)}
              className="w-full p-4 text-left hover:bg-[var(--theme-background-glass-hover)] transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {idx < 3 ? (
                      <Flame className="w-3 h-3 text-orange-500" />
                    ) : (
                      <Hash className="w-3 h-3 text-[var(--theme-text-tertiary)]/50" />
                    )}
                    <span className="text-xs text-[var(--theme-text-tertiary)]">{topic.category}</span>
                  </div>
                  <p className="text-sm font-light text-[var(--theme-text-primary)] group-hover:text-[var(--theme-primary)] transition-colors">
                    #{topic.topic}
                  </p>
                  <p className="text-[10px] text-[var(--theme-text-tertiary)]/50 mt-1">
                    {topic.posts.toLocaleString()} posts
                  </p>
                </div>
                {idx === 0 && (
                  <Sparkles className="w-3 h-3 text-yellow-500 animate-pulse" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Suggested Users */}
      <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[var(--theme-border-light)]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--theme-primary)]" />
            <h3 className="text-sm font-light text-[var(--theme-text-primary)]">Suggested for you</h3>
          </div>
        </div>
        <div className="divide-y divide-[var(--theme-border-dark)]">
          {suggestedUsers.map((user) => (
            <div key={user.id} className="p-4 flex items-center justify-between">
              <button 
                onClick={() => onUserClick?.(user.id)}
                className="flex items-center gap-3 flex-1 text-left"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-secondary)] flex items-center justify-center">
                  <span className="text-white text-xs font-light">
                    {user.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-light text-[var(--theme-text-primary)] group-hover:text-[var(--theme-primary)] transition-colors">
                    {user.displayName}
                  </p>
                  <p className="text-xs text-[var(--theme-text-tertiary)]">@{user.username}</p>
                  <p className="text-[10px] text-[var(--theme-text-tertiary)]/50 mt-0.5">
                    {user.followers.toLocaleString()} followers
                  </p>
                </div>
              </button>
              <button className="px-3 py-1 bg-[var(--theme-primary)]/20 hover:bg-[var(--theme-primary)]/30 rounded-full text-[var(--theme-primary)] text-xs font-light transition-colors">
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Links */}
      <div className="text-center">
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          <a href="#" className="text-[10px] text-[var(--theme-text-tertiary)]/50 hover:text-[var(--theme-text-tertiary)] transition-colors">Terms</a>
          <span className="text-[10px] text-[var(--theme-text-tertiary)]/30">•</span>
          <a href="#" className="text-[10px] text-[var(--theme-text-tertiary)]/50 hover:text-[var(--theme-text-tertiary)] transition-colors">Privacy</a>
          <span className="text-[10px] text-[var(--theme-text-tertiary)]/30">•</span>
          <a href="#" className="text-[10px] text-[var(--theme-text-tertiary)]/50 hover:text-[var(--theme-text-tertiary)] transition-colors">Cookie Policy</a>
        </div>
        <p className="text-[9px] text-[var(--theme-text-tertiary)]/30 mt-2">© 2024 Yung Accountant</p>
      </div>
    </div>
  );
};