#!/usr/bin/env python3
"""
Seed script to create sample data for provider dashboard demonstration
"""
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from app.database import SessionLocal, init_db
# Import all models to ensure relationships are set up
from app.models import (
    user as user_model,
    pregnancy as pregnancy_model,
    health_record,
    risk_assessment,
    appointment,
    emergency_contact,
    emergency_alert,
    hospital,
    subscription,
    offline_sync,
    translation
)
from app.models.user import User
from app.models.pregnancy import Pregnancy
from app.models.health_record import HealthRecord
from app.models.risk_assessment import RiskAssessment
from app.models.appointment import Appointment
from datetime import datetime, timedelta, date
import uuid
import hashlib

def hash_password(password: str) -> str:
    """Simple password hashing (use bcrypt in production)"""
    return hashlib.sha256(password.encode()).hexdigest()

def create_sample_data():
    """Create sample data for provider dashboard"""
    db: Session = SessionLocal()
    
    try:
        print("=" * 60)
        print("Seeding Provider Dashboard Data")
        print("=" * 60)
        
        # Initialize database
        init_db()
        
        # Create a provider user if doesn't exist
        provider_email = "doctor@mamacare.ai"
        provider = db.query(User).filter(User.email == provider_email).first()
        if not provider:
            provider = User(
                id=str(uuid.uuid4()),
                email=provider_email,
                password_hash=hash_password("password123"),
                full_name="Dr. Sarah Johnson",
                phone="+1234567890",
                role="provider",
                age=35,
                language_preference="en"
            )
            db.add(provider)
            db.commit()
            print(f"[OK] Created provider: {provider.full_name}")
        else:
            print(f"[OK] Provider exists: {provider.full_name}")
        
        # Create sample patient users
        patients_data = [
            {"name": "Mary Smith", "email": "mary@example.com", "age": 28, "week": 25},
            {"name": "Jane Doe", "email": "jane@example.com", "age": 32, "week": 18},
            {"name": "Alice Brown", "email": "alice@example.com", "age": 29, "week": 32},
            {"name": "Emma Wilson", "email": "emma@example.com", "age": 26, "week": 15},
            {"name": "Olivia Davis", "email": "olivia@example.com", "age": 31, "week": 28},
        ]
        
        created_patients = []
        for patient_data in patients_data:
            patient = db.query(User).filter(User.email == patient_data["email"]).first()
            if not patient:
                patient = User(
                    id=str(uuid.uuid4()),
                    email=patient_data["email"],
                    password_hash=hash_password("password123"),
                    full_name=patient_data["name"],
                    phone=f"+123456789{len(created_patients)}",
                    role="patient",
                    age=patient_data["age"],
                    language_preference="en"
                )
                db.add(patient)
                db.commit()
                print(f"[OK] Created patient: {patient.full_name}")
            else:
                print(f"[OK] Patient exists: {patient.full_name}")
            created_patients.append((patient, patient_data["week"]))
        
        # Create pregnancies and health data
        risk_levels = ["High", "Medium", "Low", "High", "Medium"]
        risk_scores = [85.5, 45.2, 25.8, 78.3, 52.1]
        
        for idx, ((patient, week), risk_level, risk_score) in enumerate(zip(created_patients, risk_levels, risk_scores)):
            # Create or get pregnancy
            pregnancy = db.query(Pregnancy).filter(
                Pregnancy.user_id == patient.id,
                Pregnancy.is_active == True
            ).first()
            
            if not pregnancy:
                due_date = date.today() + timedelta(days=(40 - week) * 7)
                pregnancy = Pregnancy(
                    id=str(uuid.uuid4()),
                    user_id=patient.id,
                    due_date=due_date,
                    current_week=week,
                    trimester=1 if week <= 12 else (2 if week <= 26 else 3),
                    is_active=True,
                    doctor_name=provider.full_name if idx < 3 else None  # First 3 assigned, last 2 unassigned
                )
                db.add(pregnancy)
                db.commit()
                print(f"[OK] Created pregnancy for {patient.full_name} (Week {week})")
            else:
                print(f"[OK] Pregnancy exists for {patient.full_name}")
            
            # Create health records (last 7 days)
            for day_offset in range(7):
                record_date = datetime.utcnow() - timedelta(days=day_offset)
                health_record = HealthRecord(
                    id=str(uuid.uuid4()),
                    pregnancy_id=pregnancy.id,
                    systolic_bp=120 + (day_offset * 2),
                    diastolic_bp=80 + day_offset,
                    blood_sugar=90 + (day_offset * 3),
                    body_temp=36.5 + (day_offset * 0.1),
                    heart_rate=75 + day_offset,
                    bmi=24.5 + (day_offset * 0.2),
                    weight=65 + (day_offset * 0.3),
                    recorded_at=record_date
                )
                db.add(health_record)
            
            # Create risk assessments
            for assessment_offset in range(3):
                assessment_date = datetime.utcnow() - timedelta(days=assessment_offset * 7)
                risk_assessment = RiskAssessment(
                    id=str(uuid.uuid4()),
                    pregnancy_id=pregnancy.id,
                    risk_level=risk_level,
                    risk_score=risk_score - (assessment_offset * 5),
                    risk_factors={
                        "factors": [
                            "High blood pressure" if risk_level == "High" else "Normal",
                            "Gestational diabetes" if idx % 2 == 0 else "None"
                        ]
                    },
                    recommendations="Monitor blood pressure daily\n" + 
                                  "Follow up with doctor weekly\n" +
                                  "Maintain healthy diet" if risk_level == "High" else
                                  "Regular checkups\n" +
                                  "Maintain healthy lifestyle",
                    assessed_at=assessment_date
                )
                db.add(risk_assessment)
            
            # Create appointments (upcoming)
            for apt_offset in range(2):
                appointment_date = datetime.utcnow() + timedelta(days=(apt_offset + 1) * 7)
                appointment = Appointment(
                    id=str(uuid.uuid4()),
                    pregnancy_id=pregnancy.id,
                    appointment_date=appointment_date,
                    appointment_type="Routine Checkup" if apt_offset == 0 else "Ultrasound",
                    clinic_name="MamaCare Clinic",
                    notes=f"Follow-up appointment for {patient.full_name}"
                )
                db.add(appointment)
            
            db.commit()
            print(f"[OK] Created health records, assessments, and appointments for {patient.full_name}")
        
        print("\n" + "=" * 60)
        print("[OK] Sample data created successfully!")
        print("=" * 60)
        print(f"\nProvider Login:")
        print(f"  Email: {provider_email}")
        print(f"  Password: password123")
        print(f"\nPatient Logins:")
        for patient, _ in created_patients:
            print(f"  Email: {patient.email}, Password: password123")
        print("\n" + "=" * 60)
        
    except Exception as e:
        print(f"\n[ERROR] Error creating sample data: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_sample_data()

