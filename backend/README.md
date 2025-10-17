# MamaCare AI Backend

Production-ready FastAPI backend for maternal health risk assessment.

## Setup

### 1. Install Dependencies
\`\`\`bash
cd backend
pip install -r requirements.txt
\`\`\`

### 2. Configure Environment
\`\`\`bash
cp .env.example .env
# Edit .env with your configuration
\`\`\`

### 3. Initialize Database
\`\`\`bash
python -m alembic upgrade head
\`\`\`

### 4. Run Server
\`\`\`bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
\`\`\`

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user

### Health Records
- `POST /api/v1/health/records` - Create health record
- `GET /api/v1/health/records/{pregnancy_id}` - Get health history

### Risk Predictions
- `POST /api/v1/predictions/assess` - Assess maternal health risk
- `GET /api/v1/predictions/latest/{pregnancy_id}` - Get latest assessment
- `GET /api/v1/predictions/history/{pregnancy_id}` - Get assessment history

### Appointments
- `POST /api/v1/appointments/` - Create appointment
- `GET /api/v1/appointments/{pregnancy_id}` - Get appointments

### Emergency
- `POST /api/v1/emergency/{user_id}` - Add emergency contact
- `GET /api/v1/emergency/{user_id}` - Get emergency contacts

## ML Model Integration

The backend automatically loads pre-trained models:
- `model_hackathon.pkl` - Trained Random Forest classifier
- `label_encoder_hackathon.pkl` - Label encoder for risk levels
- `feature_names_hackathon.pkl` - Feature names used in training

Models are loaded on startup and cached in memory for fast predictions.

## Documentation

Visit `http://localhost:8000/docs` for interactive API documentation.
