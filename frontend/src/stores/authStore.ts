import { create } from 'zustand';
import axios from 'axios';
import API_BASE from '../utils/apiBase';

type Role = 'super_admin' | 'admin' | 'team_leader' | 'relationship_mgr' | 'financial_manager' | '';

interface AuthState {
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  role: Role;
  userId: string;
  displayName: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: sessionStorage.getItem('isAuthenticated') === 'true',
  role: (sessionStorage.getItem('role')?.toLowerCase() as Role) || '',
  userId: sessionStorage.getItem('userId') || '',
  displayName: sessionStorage.getItem('displayName') || '',
  loading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post(`${API_BASE}/login`, { email, password });
      const { user } = res.data;

      // ✅ Block login if user is inactive
      if (user.status?.toLowerCase() !== 'active') {
        set({
          loading: false,
          error: 'User is inactive. Please contact the administrator.'
        });
        return;
      }

      sessionStorage.setItem('isAuthenticated', 'true');
      sessionStorage.setItem('role', user.role);
      sessionStorage.setItem('userId', user.id);
      sessionStorage.setItem('displayName', user.displayName);

      set({
        isAuthenticated: true,
        role: user.role,
        userId: user.id,
        displayName: user.displayName,
        loading: false,
        error: null
      });
    } catch (err: any) {
      set({
        loading: false,
        error: err.response?.data?.message || 'Login failed'
      });
    }
  },

  logout: () => {
    sessionStorage.clear();
    set({
      isAuthenticated: false,
      role: '',
      userId: '',
      displayName: '',
      loading: false,
      error: null
    });
  },

  checkAuth: () => {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    const role = (sessionStorage.getItem('role')?.toLowerCase() as Role) || '';
    const userId = sessionStorage.getItem('userId') || '';
    const displayName = sessionStorage.getItem('displayName') || '';

    set({
      isAuthenticated,
      role,
      userId,
      displayName
    });
  }
}));
