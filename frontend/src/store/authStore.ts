import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  setAuth: (user, token) => {
    try {
      localStorage.setItem('access_token', token);
      localStorage.setItem('user', JSON.stringify(user));
      // Set state synchronously
      set({ user, token });
    } catch (error) {
      console.error('Error saving auth to localStorage:', error);
      // Still set state even if localStorage fails
      set({ user, token });
    }
  },
  logout: () => {
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
    set({ user: null, token: null });
  },
}));

// Helper function to check authentication (use as selector)
export const isAuthenticated = (state: AuthState) => !!state.token;

// Initialize from localStorage on load
try {
  const storedToken = localStorage.getItem('access_token');
  const storedUser = localStorage.getItem('user');
  if (storedToken && storedUser) {
    try {
      const parsedUser = JSON.parse(storedUser);
      useAuthStore.setState({
        token: storedToken,
        user: parsedUser,
      });
    } catch (parseError) {
      // Invalid JSON in localStorage, clear it
      console.error('Error parsing stored user data:', parseError);
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
  }
} catch (error) {
  // localStorage might not be available (e.g., in SSR or private browsing)
  console.error('Error initializing auth from localStorage:', error);
}

