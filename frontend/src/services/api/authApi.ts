import { apiClient } from './apiClient';
import { User, RegisterData } from '../../store/authStore';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterResponse extends User {}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>('/auth/login', { email, password });
  },

  register: async (userData: RegisterData): Promise<RegisterResponse> => {
    return apiClient.post<RegisterResponse>('/auth/register', userData);
  },

  getCurrentUser: async (): Promise<User> => {
    return apiClient.get<User>('/users/me');
  },

  updateProfile: async (userData: Partial<User>): Promise<User> => {
    return apiClient.put<User>('/users/me', userData);
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    return apiClient.post('/users/me/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  forgotPassword: async (email: string): Promise<void> => {
    return apiClient.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    return apiClient.post('/auth/reset-password', {
      token,
      new_password: newPassword,
    });
  },
};
