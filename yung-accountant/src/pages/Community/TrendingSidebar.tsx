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
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#6366F1]" />
            <h3 className="text-sm font-light text-white">Trending Now</h3>
          </div>
        </div>
        <div className="divide-y divide-white/5">
          {trendingTopics.map((topic, idx) => (
            <button
              key={topic.id}
              onClick={() => onTopicClick?.(topic.topic)}
              className="w-full p-4 text-left hover:bg-white/[0.02] transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {idx < 3 ? (
                      <Flame className="w-3 h-3 text-orange-500" />
                    ) : (
                      <Hash className="w-3 h-3 text-white/30" />
                    )}
                    <span className="text-xs text-white/40">{topic.category}</span>
                  </div>
                  <p className="text-sm font-light text-white group-hover:text-[#6366F1] transition-colors">
                    #{topic.topic}
                  </p>
                  <p className="text-[10px] text-white/30 mt-1">
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
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#6366F1]" />
            <h3 className="text-sm font-light text-white">Suggested for you</h3>
          </div>
        </div>
        <div className="divide-y divide-white/5">
          {suggestedUsers.map((user) => (
            <div key={user.id} className="p-4 flex items-center justify-between">
              <button 
                onClick={() => onUserClick?.(user.id)}
                className="flex items-center gap-3 flex-1 text-left"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#EC4899] flex items-center justify-center">
                  <span className="text-white text-xs font-light">
                    {user.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-light text-white group-hover:text-[#6366F1] transition-colors">
                    {user.displayName}
                  </p>
                  <p className="text-xs text-white/40">@{user.username}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">
                    {user.followers.toLocaleString()} followers
                  </p>
                </div>
              </button>
              <button className="px-3 py-1 bg-[#6366F1]/20 hover:bg-[#6366F1]/30 rounded-full text-[#6366F1] text-xs font-light transition-colors">
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Links */}
      <div className="text-center">
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          <a href="#" className="text-[10px] text-white/30 hover:text-white/60 transition-colors">Terms</a>
          <span className="text-[10px] text-white/20">•</span>
          <a href="#" className="text-[10px] text-white/30 hover:text-white/60 transition-colors">Privacy</a>
          <span className="text-[10px] text-white/20">•</span>
          <a href="#" className="text-[10px] text-white/30 hover:text-white/60 transition-colors">Cookie Policy</a>
        </div>
        <p className="text-[9px] text-white/20 mt-2">© 2024 Yung Accountant</p>
      </div>
    </div>
  );
};