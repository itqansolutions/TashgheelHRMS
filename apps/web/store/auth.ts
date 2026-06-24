import { create } from 'zustand';
import { api, setTokenCookie, clearTokenCookie } from '../lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (accessToken: string, user: User) => void;
  logout: () => void;
  fetchProfile: () => Promise<User | null>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: (accessToken, user) => {
    setTokenCookie(accessToken);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    clearTokenCookie();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  fetchProfile: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/auth/me');
      if (response.data?.success) {
        const userData = response.data.data;
        set({ user: userData, isAuthenticated: true, isLoading: false });
        return userData;
      }
    } catch {
      // Clear token if profile fetch fails (invalid/expired token)
      clearTokenCookie();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
    return null;
  },
}));
