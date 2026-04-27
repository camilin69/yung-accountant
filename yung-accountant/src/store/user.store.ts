// store/user.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface UserStore {
  user: User | null;
  users: User[];
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setUsers: (users: User[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  followUser: (userId: string, targetUserId: string) => void;
  searchUsers: (query: string) => User[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const mockUsers: User[] = [
  {
    id: '1',
    username: 'yung_nigga',
    displayName: 'Yung Nigga',
    email: 'yung@example.com',
    password: '123',
    plan: 'free',
    bio: 'Financial enthusiast and goal setter',
    location: 'Colombia',
    website: 'https://yung-accountant.com',
    followers: ['2', '3'],
    following: ['2', '4'],
    joinedAt: new Date().toISOString(),
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  },
  {
    id: '2',
    username: 'finance_guru',
    displayName: 'Finance Guru',
    email: 'guru@example.com',
    password: '123',
    plan: 'free',
    bio: 'Helping you achieve financial freedom',
    location: 'USA',
    followers: ['1'],
    following: ['1'],
    joinedAt: new Date().toISOString(),
  },
  {
    id: '3',
    username: 'saving_master',
    displayName: 'Saving Master',
    email: 'saving@example.com',
    password: '123',
    plan: 'free',
    bio: 'Savings tips and tricks',
    location: 'Canada',
    followers: ['1'],
    following: [],
    joinedAt: new Date().toISOString(),
  },
  {
    id: '4',
    username: 'debt_free',
    displayName: 'Debt Free Journey',
    email: 'debtfree@example.com',
    password: '123',
    plan: 'free',
    bio: 'Getting out of debt one step at a time',
    location: 'UK',
    followers: [],
    following: ['1'],
    joinedAt: new Date().toISOString(),
  },
];

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: mockUsers[0],
      users: mockUsers,
      isLoading: false,
      error: null,
      
      setUser: (user) => set({ user }),
      
      setUsers: (users) => set({ users }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      followUser: (userId, targetUserId) => {
        set((state) => ({
          users: state.users.map((u) => {
            if (u.id === targetUserId) {
              return {
                ...u,
                followers: u.followers.includes(userId)
                  ? u.followers.filter(id => id !== userId)
                  : [...u.followers, userId],
              };
            }
            if (u.id === userId) {
              return {
                ...u,
                following: u.following.includes(targetUserId)
                  ? u.following.filter(id => id !== targetUserId)
                  : [...u.following, targetUserId],
              };
            }
            return u;
          }),
        }));
      },
      
      searchUsers: (query) => {
        const { users } = get();
        return users.filter(u =>
          u.username.toLowerCase().includes(query.toLowerCase()) ||
          u.displayName.toLowerCase().includes(query.toLowerCase())
        );
      },
      
      login: async (email, _password) => {
        set({ isLoading: true, error: null });
        try {
          // Simular login API
          const user = mockUsers.find(u => u.email === email);
          if (!user) throw new Error('Invalid credentials');
          
          set({ 
            user: { ...user, accessToken: 'new-access-token', refreshToken: 'new-refresh-token' },
            isLoading: false 
          });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },
      
      logout: () => {
        set({ user: null });
      },
      
      refreshToken: async () => {
        set({ isLoading: true });
        try {
          // Simular refresh token API
          const currentUser = get().user;
          if (currentUser) {
            set({ 
              user: { ...currentUser, accessToken: 'refreshed-access-token' },
              isLoading: false 
            });
          }
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },
    }),
    { 
      name: 'yung-accountant-user',
      partialize: (state) => ({ 
        user: state.user,
        users: state.users 
      })
    }
  )
);