// store/user.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Client, Role } from '../types';

const generateId = () => Date.now().toString();

interface UserStore {
  user: User | null;
  users: User[];
  clients: Client[];
  roles: Role[];
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setUsers: (users: User[]) => void;
  setClients: (clients: Client[]) => void;
  setRoles: (roles: Role[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  followUser: (userId: string, targetUserId: string) => void;
  searchUsers: (query: string) => User[];
  getClientById: (clientId: string) => Client | undefined;
  getRoleById: (roleId: string) => Role | undefined;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: Omit<User, 'id' | 'createdAt' | 'accessToken' | 'refreshToken'>) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateProfilePic: (userId: string, profilePicUrl: string) => void;
}

// Clients predefinidos
const defaultClients: Client[] = [
  { id: 'alcaldia-duitama', name: 'Alcaldía de Duitama', description: 'Municipio de Duitama, Boyacá' },
  { id: 'alcaldia-sogamoso', name: 'Alcaldía de Sogamoso', description: 'Municipio de Sogamoso, Boyacá' },
  { id: 'alcaldia-tunja', name: 'Alcaldía de Tunja', description: 'Municipio de Tunja, Boyacá' },
];

// Roles predefinidos
const defaultRoles: Role[] = [
  { id: 'estudiante', name: 'Estudiante', description: 'Estudiante de instituciones educativas' },
  { id: 'ama-de-casa', name: 'Ama de Casa', description: 'Trabajo del hogar' },
  { id: 'trabajador', name: 'Trabajador', description: 'Trabajador independiente o asalariado' },
];

const mockUsers: User[] = [
  {
    id: '1',
    email: 'yung@example.com',
    firstName: 'Yung',
    lastName: 'Nigga',
    age: 25,
    clientId: 'alcaldia-duitama',
    role: 'ama de casa',
    username: 'yung_nigga',
    displayName: 'Yung Nigga',
    password: '123',
    plan: 'free',
    bio: 'Financial enthusiast and goal setter',
    location: 'Colombia',
    website: 'https://yung-accountant.com',
    followers: ['2', '3'],
    following: ['2', '4'],
    joinedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  },
  {
    id: '2',
    email: 'guru@example.com',
    firstName: 'Finance',
    lastName: 'Guru',
    age: 35,
    clientId: 'alcaldia-sogamoso',
    role: 'trabajador',
    username: 'finance_guru',
    displayName: 'Finance Guru',
    password: '123',
    plan: 'free',
    bio: 'Helping you achieve financial freedom',
    location: 'USA',
    followers: ['1'],
    following: ['1'],
    joinedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    email: 'saving@example.com',
    firstName: 'Saving',
    lastName: 'Master',
    age: 28,
    clientId: 'alcaldia-tunja',
    role: 'estudiante',
    username: 'saving_master',
    displayName: 'Saving Master',
    password: '123',
    plan: 'free',
    bio: 'Savings tips and tricks',
    location: 'Canada',
    followers: ['1'],
    following: [],
    joinedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    email: 'debtfree@example.com',
    firstName: 'Debt',
    lastName: 'Free',
    age: 42,
    clientId: 'alcaldia-duitama',
    role: 'ama-de-casa',
    username: 'debt_free',
    displayName: 'Debt Free Journey',
    password: '123',
    plan: 'free',
    bio: 'Getting out of debt one step at a time',
    location: 'UK',
    followers: [],
    following: ['1'],
    joinedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      users: mockUsers,
      clients: defaultClients,
      roles: defaultRoles,
      isLoading: false,
      error: null,
      
      setUser: (user) => set({ user }),
      
      setUsers: (users) => set({ users }),
      
      setClients: (clients) => set({ clients }),
      
      setRoles: (roles) => set({ roles }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      followUser: (userId, targetUserId) => {
        set((state) => ({
          users: state.users.map((u) => {
            if (u.id === targetUserId) {
              return {
                ...u,
                followers: u.followers?.includes(userId)
                  ? u.followers.filter(id => id !== userId)
                  : [...(u.followers || []), userId],
              };
            }
            if (u.id === userId) {
              return {
                ...u,
                following: u.following?.includes(targetUserId)
                  ? u.following.filter(id => id !== targetUserId)
                  : [...(u.following || []), targetUserId],
              };
            }
            return u;
          }),
        }));
      },
      
      searchUsers: (query) => {
        const { users } = get();
        return users.filter(u =>
          u.email.toLowerCase().includes(query.toLowerCase()) ||
          u.firstName.toLowerCase().includes(query.toLowerCase()) ||
          u.lastName.toLowerCase().includes(query.toLowerCase()) ||
          u.username?.toLowerCase().includes(query.toLowerCase())
        );
      },
      
      getClientById: (clientId) => {
        const { clients } = get();
        return clients.find(c => c.id === clientId);
      },
      
      getRoleById: (roleId) => {
        const { roles } = get();
        return roles.find(r => r.id === roleId);
      },
      
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          // Simular llamada a API
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const user = mockUsers.find(u => u.email === email && u.password === password);
          if (!user) throw new Error('Invalid credentials');
          
          set({ 
            user: { 
              ...user, 
              accessToken: 'new-access-token', 
              refreshToken: 'new-refresh-token' 
            },
            isLoading: false 
          });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },
      
      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const { users, clients, roles } = get();
          
          // Validar clientId
          const validClient = clients.find(c => c.id === userData.clientId);
          if (!validClient) {
            throw new Error('Invalid client selected');
          }
          
          // Validar role
          const validRole = roles.find(r => r.id === userData.role);
          if (!validRole) {
            throw new Error('Invalid role selected');
          }
          
          // Verificar si el email ya existe
          const existingEmail = users.find(u => u.email === userData.email);
          if (existingEmail) {
            throw new Error('User already exists with this email');
          }
          
          // Crear nuevo usuario
          const newUser: User = {
            id: generateId(),
            ...userData,
            username: userData.email.split('@')[0],
            displayName: `${userData.firstName} ${userData.lastName}`,
            password: userData.password,
            plan: 'free',
            followers: [],
            following: [],
            joinedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
          };
          
          // Simular llamada a API
          await new Promise(resolve => setTimeout(resolve, 500));
          
          set({
            users: [...users, newUser],
            user: newUser,
            isLoading: false
          });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },
      
      logout: () => {
        set({ user: null });
      },
      
      refreshToken: async () => {
        set({ isLoading: true });
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
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

      updateProfilePic: (userId, profilePicUrl) => {
        set((state) => ({
          users: state.users.map((u) =>
            u.id === userId ? { ...u, profilePic: profilePicUrl } : u
          ),
          user: state.user?.id === userId ? { ...state.user, profilePic: profilePicUrl } : state.user,
        }));
      },
    }),
    { 
      name: 'yung-accountant-user',
      partialize: (state) => ({ 
        user: state.user,
        users: state.users,
        clients: state.clients,
        roles: state.roles
      })
    }
  )
);