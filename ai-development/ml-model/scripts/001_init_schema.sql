-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  hashed_password VARCHAR(255) NOT NULL,
  age INTEGER,
  bmi FLOAT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create health assessments table
CREATE TABLE IF NOT EXISTS health_assessments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  age INTEGER NOT NULL,
  systolic_bp FLOAT NOT NULL,
  diastolic_bp FLOAT NOT NULL,
  blood_sugar FLOAT NOT NULL,
  body_temp FLOAT NOT NULL,
  bmi FLOAT NOT NULL,
  heart_rate INTEGER NOT NULL,
  previous_complications BOOLEAN DEFAULT FALSE,
  preexisting_diabetes BOOLEAN DEFAULT FALSE,
  gestational_diabetes BOOLEAN DEFAULT FALSE,
  mental_health BOOLEAN DEFAULT FALSE,
  risk_score FLOAT NOT NULL,
  risk_level VARCHAR(50) NOT NULL,
  ml_prediction VARCHAR(100),
  alert_sent BOOLEAN DEFAULT FALSE,
  alert_phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create emergency contacts table
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_name VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  relationship VARCHAR(50) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create SMS logs table for audit trail
CREATE TABLE IF NOT EXISTS sms_logs (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER NOT NULL REFERENCES health_assessments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_phone VARCHAR(20) NOT NULL,
  message VARCHAR(500) NOT NULL,
  status VARCHAR(50) NOT NULL,
  twilio_sid VARCHAR(100),
  error_message VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for optimal query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_assessments_user_id ON health_assessments(user_id);
CREATE INDEX idx_assessments_risk_level ON health_assessments(risk_level);
CREATE INDEX idx_assessments_created ON health_assessments(created_at);
CREATE INDEX idx_emergency_contacts_user_id ON emergency_contacts(user_id);
CREATE INDEX idx_sms_logs_user_id ON sms_logs(user_id);
CREATE INDEX idx_sms_logs_assessment ON sms_logs(assessment_id);
