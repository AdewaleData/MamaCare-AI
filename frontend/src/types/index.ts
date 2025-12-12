export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  age?: number;
  language_preference: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface UserCreate {
  email: string;
  full_name: string;
  phone?: string;
  age?: number;
  language_preference: string;
  role: string;
  password: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user?: User;
}

export interface Pregnancy {
  id: string;
  user_id: string;
  due_date: string;
  doctor_name?: string;
  hospital_name?: string;
  blood_type?: string;
  notes?: string;
  pregnancy_stage?: string;
  current_week?: number;
  trimester?: number;
  is_active: boolean;
  provider_confirmed?: boolean;
  provider_confirmed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PregnancyCreate {
  due_date: string;
  doctor_name?: string;
  hospital_name?: string;
  blood_type?: string;
  notes?: string;
}

export interface PregnancyUpdate {
  due_date?: string;
  doctor_name?: string;
  hospital_name?: string;
  blood_type?: string;
  notes?: string;
}

export interface HealthRecord {
  id: string;
  pregnancy_id: string;
  systolic_bp?: number;
  diastolic_bp?: number;
  blood_sugar?: number;
  body_temp?: number;
  heart_rate?: number;
  weight?: number;
  bmi?: number;
  previous_complications: number;
  preexisting_diabetes: number;
  gestational_diabetes: number;
  mental_health: number;
  notes?: string;
  recorded_at: string;
  created_at: string;
}

export interface HealthRecordCreate {
  pregnancy_id: string;
  systolic_bp?: number;
  diastolic_bp?: number;
  blood_sugar?: number;
  body_temp?: number;
  heart_rate?: number;
  weight?: number;
  bmi?: number;
  previous_complications?: number;
  preexisting_diabetes?: number;
  gestational_diabetes?: number;
  mental_health?: number;
  notes?: string;
}

export interface HealthRecordHistory {
  records: HealthRecord[];
  total: number;
}

export interface RiskAssessment {
  overall_risk: string;
  risk_level?: string; // Alias for overall_risk
  risk_score: number;
  recommendations: string[];
  risk_factors?: string[];
  specialized_assessments?: {
    preeclampsia?: {
      risk: string;
      probability: number;
    };
    preterm_labor?: {
      risk: string;
      probability: number;
    };
    gestational_diabetes?: {
      risk: string;
      probability: number;
    };
  };
}

export interface EmergencyAlert {
  id: string;
  user_id: string;
  pregnancy_id?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  emergency_type: string;
  severity: string;
  status: string;
  contacts_notified: boolean;
  healthcare_provider_notified: boolean;
  ambulance_called: boolean;
  created_at: string;
}

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
}

