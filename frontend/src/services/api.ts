import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import type {
  User,
  UserCreate,
  UserLogin,
  AuthResponse,
  Pregnancy,
  PregnancyCreate,
  PregnancyUpdate,
  HealthRecord,
  HealthRecordCreate,
  HealthRecordHistory,
  RiskAssessment,
  EmergencyAlert,
  EmergencyContact,
} from '../types';

const API_BASE_URL = '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect if:
      // 1. Already on login/register page
      // 2. This is a login/register request (they can fail with 401)
      // 3. This is a getCurrentUser request during login flow
      // 4. This is a translations request (it's public)
      const isAuthEndpoint = error.config?.url?.includes('/auth/login') || 
                            error.config?.url?.includes('/auth/register');
      const isGetCurrentUser = error.config?.url?.includes('/auth/users/me');
      const isTranslations = error.config?.url?.includes('/translations');
      const isLoginPage = window.location.pathname === '/login' || 
                         window.location.pathname === '/register';
      
      // Only clear auth and redirect if it's a real 401 (not during login flow or public endpoints)
      if (!isAuthEndpoint && !isGetCurrentUser && !isTranslations && !isLoginPage) {
        console.log('401 Unauthorized - clearing auth and redirecting to login');
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
        useAuthStore.getState().logout();
        // Use replace to avoid adding to history
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: async (data: UserCreate): Promise<User> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (data: UserLogin): Promise<AuthResponse> => {
    try {
      const response = await api.post('/auth/login', data);
      console.log('Login response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Login API error:', error);
      console.error('Error response:', error.response?.data);
      throw error;
    }
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/users/me');
    return response.data;
  },

  updateUser: async (data: Partial<User>): Promise<User> => {
    const response = await api.put('/auth/users/me', data);
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/users/me/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },
};

// Pregnancy API
export const pregnancyApi = {
  create: async (data: PregnancyCreate): Promise<Pregnancy> => {
    const response = await api.post('/pregnancy', data);
    return response.data;
  },

  getCurrent: async (): Promise<Pregnancy | null> => {
    try {
      const response = await api.get('/pregnancy/current');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  update: async (id: string, data: PregnancyUpdate): Promise<Pregnancy> => {
    const response = await api.put(`/pregnancy/${id}`, data);
    return response.data;
  },

  deactivate: async (id: string): Promise<void> => {
    await api.delete(`/pregnancy/${id}`);
  },
};

// Health Records API
export const healthApi = {
  create: async (data: HealthRecordCreate): Promise<HealthRecord> => {
    const response = await api.post('/health/records', data);
    return response.data;
  },

  getAll: async (): Promise<HealthRecordHistory> => {
    const response = await api.get('/health/records');
    return response.data;
  },

  getById: async (id: string): Promise<HealthRecord> => {
    const response = await api.get(`/health/records/${id}`);
    return response.data;
  },

  getByPregnancy: async (pregnancyId: string, limit: number = 10): Promise<HealthRecordHistory> => {
    const response = await api.get(`/health/records/pregnancy/${pregnancyId}`, { params: { limit } });
    return response.data;
  },
};

// Predictions API
export const predictionApi = {
  assessRisk: async (pregnancyId: string): Promise<RiskAssessment> => {
    // Backend will automatically use latest health record if no data provided
    const response = await api.post('/predictions/assess', { 
      pregnancy_id: pregnancyId 
      // Don't send health data - backend will use latest health record
    });
    return response.data;
  },

  getLatest: async (pregnancyId: string): Promise<RiskAssessment | null> => {
    try {
      const response = await api.get(`/predictions/latest/${pregnancyId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  getHistory: async (pregnancyId: string): Promise<{assessments: RiskAssessment[], total: number} | RiskAssessment[]> => {
    const response = await api.get(`/predictions/history/${pregnancyId}`);
    return response.data;
  },
};

// Emergency API
export const emergencyApi = {
  triggerAlert: async (data: {
    pregnancy_id?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    emergency_type: string;
    severity: string;
  }): Promise<EmergencyAlert> => {
    const response = await api.post('/emergency/alert', data);
    return response.data;
  },

  getAlert: async (id: string): Promise<EmergencyAlert> => {
    const response = await api.get(`/emergency/alert/${id}`);
    return response.data;
  },

  getHistory: async (): Promise<EmergencyAlert[]> => {
    const response = await api.get('/emergency/history');
    return response.data;
  },

  resolveAlert: async (id: string): Promise<void> => {
    await api.post(`/emergency/alert/${id}/resolve`);
  },
};

// Emergency Contacts API
export const emergencyContactsApi = {
  getAll: async (): Promise<EmergencyContact[]> => {
    const response = await api.get('/emergency/contacts');
    return response.data;
  },

  create: async (data: Omit<EmergencyContact, 'id' | 'user_id'>): Promise<EmergencyContact> => {
    const response = await api.post('/emergency/contacts', data);
    return response.data;
  },

  update: async (id: string, data: Partial<EmergencyContact>): Promise<EmergencyContact> => {
    const response = await api.put(`/emergency/contacts/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/emergency/contacts/${id}`);
  },
};

// Recommendations API
export const recommendationsApi = {
  getPersonalized: async (): Promise<any> => {
    const response = await api.get('/recommendations');
    return response.data;
  },
};

// Appointments API
export interface Appointment {
  id: string;
  pregnancy_id: string;
  appointment_date: string;
  clinic_name: string;
  clinic_address: string;
  appointment_type: string;
  status: string;
}

export interface AppointmentCreate {
  pregnancy_id: string;
  appointment_date: string;
  clinic_name: string;
  clinic_address: string;
  appointment_type: string;
}

export const appointmentsApi = {
  create: async (data: AppointmentCreate): Promise<Appointment> => {
    const response = await api.post('/appointments/', data);
    return response.data;
  },

  getByPregnancy: async (pregnancyId: string): Promise<{ appointments: Appointment[]; total: number }> => {
    const response = await api.get(`/appointments/${pregnancyId}`);
    return response.data;
  },
};

// Hospitals API
export interface Hospital {
  id: string;
  name: string;
  type: string;
  category?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  website?: string;
  has_emergency: boolean;
  has_maternity: boolean;
  has_ambulance: boolean;
  has_24hour: boolean;
  total_beds?: number;
  available_beds?: number;
  is_available: boolean;
  distance_km?: number;
}

export interface HospitalSearchParams {
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  city?: string;
  state?: string;
  has_emergency?: boolean;
  has_maternity?: boolean;
  has_ambulance?: boolean;
  has_24hour?: boolean;
  type?: string;
  limit?: number;
}

export const hospitalsApi = {
  find: async (params: HospitalSearchParams): Promise<Hospital[]> => {
    const response = await api.get('/hospitals/find', { params });
    return response.data;
  },

  findNearby: async (latitude: number, longitude: number, radius_km: number = 25, limit: number = 10): Promise<Hospital[]> => {
    const response = await api.get('/hospitals/nearby', {
      params: { latitude, longitude, radius_km, limit },
    });
    return response.data;
  },

  getById: async (hospitalId: string): Promise<Hospital> => {
    const response = await api.get(`/hospitals/${hospitalId}`);
    return response.data;
  },

  getByState: async (state: string, limit: number = 50): Promise<Hospital[]> => {
    const response = await api.get(`/hospitals/states/${state}/hospitals`, { params: { limit } });
    return response.data;
  },

  create: async (data: any): Promise<Hospital> => {
    const response = await api.post('/hospitals/', data);
    return response.data;
  },
};

// Statistics API
export const statisticsApi = {
  getDashboard: async (): Promise<any> => {
    const response = await api.get('/statistics/dashboard');
    return response.data;
  },

  getUserStats: async (): Promise<any> => {
    const response = await api.get('/statistics/user-stats');
    return response.data;
  },
};

// Translations API
export interface Translation {
  key: string;
  value: string;
  language: string;
  category?: string;
}

export const translationsApi = {
  getAll: async (language: string, category?: string): Promise<Record<string, string>> => {
    const response = await api.get('/translations/', { params: { language, category } });
    return response.data;
  },

  getByKey: async (key: string, language: string): Promise<Translation> => {
    const response = await api.get(`/translations/key/${key}`, { params: { language } });
    return response.data;
  },

  getLocalizedContent: async (language: string, contentType: 'health_tips' | 'recommendations' | 'education'): Promise<any> => {
    const response = await api.get('/translations/localized/content', {
      params: { language, content_type: contentType },
    });
    return response.data;
  },
};

// Subscriptions API
export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price_monthly: number;
  price_yearly?: number;
  currency: string;
  max_pregnancies: number;
  max_health_records?: number;
  has_ai_predictions: boolean;
  has_emergency_features: boolean;
  has_telemedicine: boolean;
  has_priority_support: boolean;
  has_advanced_analytics: boolean;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id?: string;
  plan_name?: string;
  status: string;
  billing_cycle: string;
  start_date: string;
  end_date?: string;
  trial_end_date?: string;
  auto_renew: boolean;
  created_at: string;
}

export const subscriptionsApi = {
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    const response = await api.get('/subscriptions/plans');
    return response.data;
  },

  getPlan: async (planId: string): Promise<SubscriptionPlan> => {
    const response = await api.get(`/subscriptions/plans/${planId}`);
    return response.data;
  },

  subscribe: async (planId: string, billingCycle: 'monthly' | 'yearly', paymentMethod: string, paymentProvider?: string): Promise<UserSubscription> => {
    const response = await api.post('/subscriptions/subscribe', {
      plan_id: planId,
      billing_cycle: billingCycle,
      payment_method: paymentMethod,
      payment_provider: paymentProvider,
    });
    return response.data;
  },

  getCurrent: async (): Promise<UserSubscription | null> => {
    try {
      const response = await api.get('/subscriptions/current');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  cancel: async (): Promise<{ message: string; subscription_id: string }> => {
    const response = await api.put('/subscriptions/cancel');
    return response.data;
  },

  createPayment: async (amount: number, currency: string, paymentMethod: string, paymentProvider?: string, description?: string): Promise<any> => {
    const response = await api.post('/subscriptions/payment', {
      amount,
      currency,
      payment_method: paymentMethod,
      payment_provider: paymentProvider,
      description,
    });
    return response.data;
  },

  confirmPayment: async (paymentId: string, transactionReference: string): Promise<any> => {
    const response = await api.put(`/subscriptions/payment/${paymentId}/confirm`, null, {
      params: { transaction_reference: transactionReference },
    });
    return response.data;
  },

  getPaymentHistory: async (limit: number = 20): Promise<any> => {
    const response = await api.get('/subscriptions/payment/history', { params: { limit } });
    return response.data;
  },
};

// Offline Sync API
export interface OfflineSyncRequest {
  device_id: string;
  entity_type: 'health_record' | 'appointment' | 'pregnancy' | 'emergency_contact';
  entity_id?: string;
  client_data: Record<string, any>;
  client_timestamp: string;
}

export interface OfflineSyncResponse {
  id: string;
  status: string;
  conflict_resolution?: string;
  server_data?: Record<string, any>;
  merged_data?: Record<string, any>;
  synced_at?: string;
}

export const offlineApi = {
  sync: async (data: OfflineSyncRequest): Promise<OfflineSyncResponse> => {
    const response = await api.post('/offline/sync', data);
    return response.data;
  },

  bulkSync: async (deviceId: string, syncs: OfflineSyncRequest[]): Promise<any> => {
    const response = await api.post('/offline/sync/bulk', { device_id: deviceId, syncs });
    return response.data;
  },

  getConflicts: async (deviceId?: string): Promise<any> => {
    const response = await api.get('/offline/sync/conflicts', { params: { device_id: deviceId } });
    return response.data;
  },

  resolveConflict: async (syncId: string, resolution: 'server_wins' | 'client_wins' | 'merged', mergedData?: Record<string, any>): Promise<any> => {
    const response = await api.put(`/offline/sync/${syncId}/resolve`, mergedData, {
      params: { resolution },
    });
    return response.data;
  },

  getHistory: async (deviceId?: string, limit: number = 50): Promise<any> => {
    const response = await api.get('/offline/sync/history', { params: { device_id: deviceId, limit } });
    return response.data;
  },
};

// Dashboard API - Add regional endpoint
export const dashboardApi = {
  getProvider: async (): Promise<any> => {
    const response = await api.get('/dashboards/provider');
    return response.data;
  },

  getGovernment: async (): Promise<any> => {
    const response = await api.get('/dashboards/government');
    return response.data;
  },

  getPatientDetails: async (patientId: string): Promise<any> => {
    const response = await api.get(`/dashboards/provider/patient/${patientId}`);
    return response.data;
  },

  getRegionalStats: async (region?: string): Promise<any> => {
    const response = await api.get('/dashboards/government/regional', { params: { region } });
    return response.data;
  },
};

export default api;

