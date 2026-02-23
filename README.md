## Project Description

**MamaCare AI** is an intelligent maternal health platform built to tackle the high rate of preventable maternal complications in Africa.  
It combines a modern web app (React + TypeScript), a robust API (FastAPI + SQLAlchemy), and production-ready ML models to:

- **Predict maternal health risk** in real time using machine-learning models  
- **Guide mothers with clear, localized recommendations** based on Nigerian guidelines  
- **Support providers and governments** with dashboards, analytics, and population-level insights  
- **Connect to an IoT device** (MamaCare Health Monitor) that streams vital signs directly into the platform  

The goal of MamaCare AI is to move from *reactive* to *proactive* maternal care: identifying risk early, triggering timely interventions, and giving every mother an intelligent “digital co-pilot” during pregnancy.

### Why This Project Matters (Hackathon Angle)

- **High-impact problem**: Maternal mortality in many African countries is still unacceptably high, often due to late detection of complications and poor follow-up.  
- **Practical, deployable solution**: MamaCare AI is designed to run on low-cost infrastructure, with offline-friendly flows and SMS support.  
- **End-to-end system**: Not just a model — it includes **ML + backend API + frontend dashboards + IoT device firmware**, ready to be piloted in real-world clinics.

## Core Features (What Judges Should Notice)

- **AI Risk Assessment**
  - **Predictive models** trained on maternal health data (Gradient Boosting, specialized predictors)
  - **Risk scoring** (low / medium / high) with explainable risk factors
  - **Automatic emergency escalation** when high-risk patterns are detected

- **Smart Dashboards**
  - **Patient dashboard**: pregnancy overview, upcoming appointments, risk history, recommendations  
  - **Provider dashboard**: list of high-risk patients, recent alerts, appointment management  
  - **Government dashboard**: anonymized statistics, trends, and hotspots for maternal risk

- **Care & Communication**
  - **Chat assistant**: real-time chat channel for guidance and follow-up  
  - **Voice assistant**: talk-to-app experience powered by text-to-speech (multi-language capable)  
  - **Emergency flows**: one-tap alerts, automatic alerting of emergency contacts, SMS notifications

- **IoT & Data Collection**
  - Optional **MamaCare Health Monitor** device (ESP32 + sensors) for:
    - Blood pressure, temperature, heart rate, weight, battery level  
  - Device sends structured JSON data via Bluetooth to be ingested by the platform

## Installation Steps

### 1. Prerequisites
- **Node.js** (recommended LTS version)  
- **Python 3.10+**  
- **Git**  
- (Optional) **Jupyter / VS Code** for ML notebook work  

### 2. Clone the Repository
```bash
git clone <your-repo-url>
cd Mama-Care-AI-backup
```

### 3. Backend Setup (FastAPI)
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt

# Run backend server
python run_server.py
```

By default the API runs on something like `http://localhost:8000` (see `run_server.py`).  
Open `http://localhost:8000/docs` to explore the auto-generated Swagger API docs.

### 4. Frontend Setup (React + Vite)
```bash
cd ../frontend
npm install
npm run dev
```

The frontend will start with Vite (commonly on `http://localhost:5173`).  
Make sure the backend is running so the app can reach the API.

### 5. AI Development (Optional – For ML Track / Research)
To work with or extend the machine learning models:

1. Open the notebook:  
   `AI-development/ml-model/Mama-Care-AI-Hackathon.ipynb` in Jupyter or VS Code.  
2. Ensure your Python environment has ML dependencies (e.g. **pandas**, **numpy**, **scikit-learn**, **seaborn**, etc.).  
3. Use the notebook to:
   - Explore the dataset and features  
   - Retrain or fine-tune models  
   - Export updated `.pkl` model files into the `models` folder used by the backend

## Tech Stack (At a Glance)

- **Frontend**
  - **React 18 + TypeScript**
  - **Vite**, **Tailwind CSS**
  - **React Router**, **React Query**, **React Hook Form**
  - **Recharts** and **Plotly** for data visualization

- **Backend**
  - **FastAPI** (Python)
  - **SQLAlchemy**, **SQLite** (can be swapped to PostgreSQL)
  - **JWT auth**, email + SMS utilities (Twilio)
  - **WebSockets** for chat and live updates

- **AI / ML**
  - **scikit-learn**, **pandas**, **numpy**
  - Trained risk assessment models stored as `.pkl` files

- **IoT (optional)**
  - **ESP32 / Arduino**
  - Sensors: blood pressure, temperature, heart rate, weight

## Team Members

- **Oguntola Adewale** — Lead  
- **Abdulqoyum Olowookere**  
- **Oyeniran Fateemah**  
-


