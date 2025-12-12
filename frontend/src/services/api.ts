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

  confirmProvider: async (id: string): Promise<{ message: string; provider_confirmed: boolean }> => {
    const response = await api.post(`/pregnancy/${id}/confirm-provider`);
    return response.data;
  },
};

// Providers API
export interface Provider {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  organization_name?: string;
  license_number?: string;
  verification_status?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  distance_km?: number;
}

export interface ProviderSearchParams {
  search?: string;
  organization?: string;
  verified_only?: boolean;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  sort_by?: 'name' | 'distance';
}

export const providersApi = {
  list: async (params?: ProviderSearchParams): Promise<Provider[]> => {
    try {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.append('search', params.search);
      if (params?.organization) searchParams.append('organization', params.organization);
      if (params?.latitude !== undefined) searchParams.append('latitude', params.latitude.toString());
      if (params?.longitude !== undefined) searchParams.append('longitude', params.longitude.toString());
      if (params?.radius_km !== undefined) searchParams.append('radius_km', params.radius_km.toString());
      // Always include sort_by, default to 'name' if not specified
      searchParams.append('sort_by', params?.sort_by || 'name');
      // Always include verified_only, default to false to show all providers
      searchParams.append('verified_only', (params?.verified_only ?? false).toString());
      
      const url = `/providers?${searchParams.toString()}`;
      console.log('[providersApi] Calling:', url);
      const response = await api.get(url);
      console.log('[providersApi] Response:', response.status, response.data?.length || 0, 'providers');
      return response.data;
    } catch (error: any) {
      console.error('[providersApi] Error:', error);
      console.error('[providersApi] Error response:', error.response?.status, error.response?.data);
      console.error('[providersApi] Error URL:', error.config?.url);
      throw error;
    }
  },

  get: async (id: string): Promise<Provider> => {
    const response = await api.get(`/providers/${id}`);
    return response.data;
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

// Chat API
export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  sender_name?: string;
  receiver_name?: string;
}

export interface Conversation {
  other_user_id: string;
  other_user_name: string;
  other_user_role: string;
  last_message: Message | null;
  unread_count: number;
  updated_at: string;
}

export interface MessageCreate {
  receiver_id: string;
  content: string;
}

export const chatApi = {
  sendMessage: async (data: MessageCreate): Promise<Message> => {
    const response = await api.post('/chat/send', data);
    return response.data;
  },

  getConversations: async (limit = 50, offset = 0): Promise<{ conversations: Conversation[]; total: number }> => {
    try {
      console.log('[Chat API] Fetching conversations with limit:', limit, 'offset:', offset);
      const response = await api.get('/chat/conversations', {
        params: { limit, offset },
      });
      console.log('[Chat API] Conversations response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[Chat API] Error fetching conversations:', error);
      console.error('[Chat API] Error response:', error.response?.data);
      console.error('[Chat API] Error status:', error.response?.status);
      throw error;
    }
  },

  getConversation: async (otherUserId: string, limit = 50, offset = 0): Promise<Message[]> => {
    const response = await api.get(`/chat/conversation/${otherUserId}`, {
      params: { limit, offset },
    });
    return response.data;
  },

  markMessageRead: async (messageId: string): Promise<void> => {
    await api.post(`/chat/mark-read/${messageId}`);
  },

  getAvailableUsers: async (): Promise<{ users: Array<{ id: string; name: string; role: string; email: string }>; total: number }> => {
    try {
      console.log('[Chat API] Fetching available users...');
      const response = await api.get('/chat/available-users');
      console.log('[Chat API] Available users response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[Chat API] Error fetching available users:', error);
      console.error('[Chat API] Error response:', error.response?.data);
      throw error;
    }
  },

  getOnlineUsers: async (): Promise<{ online_user_ids: string[] }> => {
    const response = await api.get('/chat/online-users');
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
  notes?: string | null;
  provider_notes?: string | null;
  patient_name?: string;
  patient_id?: string;
  patient?: {
    id: string;
    name: string;
    email: string;
  };
  pregnancy?: {
    id: string;
    due_date: string;
    current_week: number;
  };
}

export interface AppointmentCreate {
  pregnancy_id: string;
  appointment_date: string;
  clinic_name: string;
  clinic_address: string;
  appointment_type: string;
}

export interface AppointmentStatusUpdate {
  status: string;
  provider_notes?: string | null;
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

  // Provider endpoints
  getPending: async (): Promise<{ appointments: Appointment[]; total: number }> => {
    const response = await api.get('/appointments/provider/pending');
    return response.data;
  },

  getAll: async (statusFilter?: string): Promise<{ appointments: Appointment[]; total: number }> => {
    const response = await api.get('/appointments/provider/all', {
      params: statusFilter ? { status_filter: statusFilter } : {},
    });
    return response.data;
  },

  getDetails: async (appointmentId: string): Promise<Appointment> => {
    const response = await api.get(`/appointments/provider/${appointmentId}`);
    return response.data;
  },

  accept: async (appointmentId: string, data: AppointmentStatusUpdate): Promise<Appointment> => {
    const response = await api.post(`/appointments/provider/${appointmentId}/accept`, data);
    return response.data;
  },

  decline: async (appointmentId: string, data: AppointmentStatusUpdate): Promise<Appointment> => {
    const response = await api.post(`/appointments/provider/${appointmentId}/decline`, data);
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

  getBankDetails: async (): Promise<{
    account_number: string;
    account_name: string;
    bank_name: string;
    support_email: string;
    support_phone: string;
  }> => {
    const response = await api.get('/subscriptions/bank-details');
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
    try {
    const response = await api.get('/dashboards/provider');
      console.log('[Dashboard API] Provider dashboard response:', response.data);
    return response.data;
    } catch (error: any) {
      console.error('[Dashboard API] Error fetching provider dashboard:', error);
      console.error('[Dashboard API] Error response:', error.response?.data);
      throw error;
    }
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

// Voice Assistant API
export const voiceApi = {
  getSummary: async (useLlm: boolean = false, language?: string, pageType?: string): Promise<{
    summary: string;
    language: string;
    page_type: string;
    cached: boolean;
    timestamp: string;
    source: string;
    cloud_tts_available?: boolean;
  }> => {
    const params: any = {};
    if (useLlm) params.use_llm = 'true';
    if (language) params.language = language;
    // Always include page_type, default to 'dashboard' if not provided
    params.page_type = pageType || 'dashboard';
    
    console.log('[API] Calling voice/summarize with params:', params);
    const response = await api.get('/voice/summarize', { params });
    console.log('[API] Voice summary response:', response.data);
    return response.data;
  },
  
  generateSpeech: async (text: string, language: string): Promise<Blob> => {
    const response = await api.post('/voice/speak', null, {
      params: { text, language },
      responseType: 'blob'
    });
    return response.data;
  },
  
  getTtsStatus: async (): Promise<{
    available: boolean;
    supported_languages: string[];
  }> => {
    const response = await api.get('/voice/tts-status');
    return response.data;
  },
};

export default api;

