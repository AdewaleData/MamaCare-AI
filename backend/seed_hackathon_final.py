#!/usr/bin/env python3
"""
Hackathon Final Seed Script for MamaCare AI
Creates 5 pregnant users with different risk profiles, 1 provider, and 1 government account
"""

import sys
import os
from pathlib import Path
from datetime import datetime, date, timedelta

# Add backend directory to path
backend_dir = Path(__file__).parent.absolute()
sys.path.insert(0, str(backend_dir))
os.chdir(backend_dir)

from app.database import SessionLocal, init_db
from app.models.user import User
from app.models.pregnancy import Pregnancy
from app.models.health_record import HealthRecord
from app.models.risk_assessment import RiskAssessment
# Import all models to ensure relationships are properly initialized
from app.models import (
    user,
    pregnancy,
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
from app.utils.security import hash_password
from app.schemas.prediction import PredictionRequest
from app.services.prediction_service import PredictionService

def clear_all_data(db):
    """Clear all existing data"""
    print("=" * 60)
    print("Clearing all existing data...")
    print("=" * 60)
    
    # Delete in order to respect foreign key constraints
    db.query(RiskAssessment).delete()
    db.query(HealthRecord).delete()
    db.query(Pregnancy).delete()
    db.query(User).delete()
    
    db.commit()
    print("[OK] All data cleared\n")

def create_users(db):
    """Create users with specific data"""
    print("Creating users...")
    
    users_data = [
        {
            "email": "amara@mamacare.ai",
            "full_name": "Amara Okafor",
            "phone": "+2348012345678",
            "age": 28,
            "password": "Test123!",
            "role": "patient"
        },
        {
            "email": "zainab@mamacare.ai",
            "full_name": "Zainab Hassan",
            "phone": "+2348023456789",
            "age": 32,
            "password": "Test123!",
            "role": "patient"
        },
        {
            "email": "chioma@mamacare.ai",
            "full_name": "Chioma Nwosu",
            "phone": "+2348034567890",
            "age": 26,
            "password": "Test123!",
            "role": "patient"
        },
        {
            "email": "aishat@mamacare.ai",
            "full_name": "Aishat Adeyemi",
            "phone": "+2348045678901",
            "age": 35,
            "password": "Test123!",
            "role": "patient"
        },
        {
            "email": "ngozi@mamacare.ai",
            "full_name": "Ngozi Obi",
            "phone": "+2348056789012",
            "age": 29,
            "password": "Test123!",
            "role": "patient"
        },
        {
            "email": "doctor@mamacare.ai",
            "full_name": "Dr. Eze Okafor",
            "phone": "+2348067890123",
            "age": 45,
            "password": "Test123!",
            "role": "provider"
        },
        {
            "email": "government@mamacare.ai",
            "full_name": "Health Agency",
            "phone": "+2348078901234",
            "age": None,
            "password": "Test123!",
            "role": "government"
        }
    ]
    
    users = []
    for user_data in users_data:
        user = User(
            email=user_data["email"],
            full_name=user_data["full_name"],
            phone=user_data["phone"],
            age=user_data["age"],
            password_hash=hash_password(user_data["password"]),
            language_preference="en",
            role=user_data["role"],
            is_active=True,
            created_at=datetime.utcnow()
        )
        db.add(user)
        users.append(user)
        print(f"  [OK] Created {user_data['role']}: {user_data['email']} ({user_data['full_name']})")
    
    db.commit()
    return users

def create_pregnancies(db, patient_users, provider):
    """Create pregnancies for all patient users"""
    print("\nCreating pregnancies...")
    
    pregnancies = []
    start_date = date.today() - timedelta(days=90)  # 90 days ago
    due_date = start_date + timedelta(days=280)  # 280 days from start
    
    # Calculate current week
    days_pregnant = (date.today() - start_date).days
    current_week = max(1, min(40, days_pregnant // 7))
    
    if current_week <= 12:
        trimester = 1
        stage = "trimester1"
    elif current_week <= 26:
        trimester = 2
        stage = "trimester2"
    else:
        trimester = 3
        stage = "trimester3"
    
    for user in patient_users:
        pregnancy = Pregnancy(
            user_id=user.id,
            due_date=due_date,
            pregnancy_stage=stage,
            current_week=current_week,
            trimester=trimester,
            is_active=True,
            doctor_name=provider.full_name,
            hospital_name="Lagos General Hospital",
            blood_type="O+",
            notes="Regular checkups scheduled",
            created_at=datetime.combine(start_date, datetime.min.time())
        )
        db.add(pregnancy)
        pregnancies.append(pregnancy)
        print(f"  [OK] Created pregnancy for {user.email} - Week {current_week}, Trimester {trimester}")
    
    db.commit()
    return pregnancies

def create_health_records(db, pregnancies):
    """Create 3 health records per pregnancy with specific trends"""
    print("\nCreating health records...")
    
    # Health record data for each user (3 records per user)
    health_data = {
        "amara@mamacare.ai": [
            # Record 1 (30 days ago) - LOW RISK
            {
                "days_ago": 30,
                "weight": 65.0,
                "systolic_bp": 115,
                "diastolic_bp": 75,
                "bs": 92.0,
                "temp": 36.8,
                "hr": 72,
                "bmi": 23.5
            },
            # Record 2 (15 days ago)
            {
                "days_ago": 15,
                "weight": 66.0,
                "systolic_bp": 118,
                "diastolic_bp": 76,
                "bs": 93.0,
                "temp": 36.8,
                "hr": 73,
                "bmi": 23.8
            },
            # Record 3 (today)
            {
                "days_ago": 0,
                "weight": 67.0,
                "systolic_bp": 120,
                "diastolic_bp": 78,
                "bs": 94.0,
                "temp": 36.9,
                "hr": 74,
                "bmi": 24.1
            }
        ],
        "zainab@mamacare.ai": [
            # Record 1 (30 days ago) - MEDIUM RISK
            {
                "days_ago": 30,
                "weight": 70.0,
                "systolic_bp": 125,
                "diastolic_bp": 82,
                "bs": 100.0,
                "temp": 36.9,
                "hr": 76,
                "bmi": 25.2
            },
            # Record 2 (15 days ago)
            {
                "days_ago": 15,
                "weight": 72.0,
                "systolic_bp": 132,
                "diastolic_bp": 85,
                "bs": 108.0,
                "temp": 36.9,
                "hr": 79,
                "bmi": 25.8
            },
            # Record 3 (today)
            {
                "days_ago": 0,
                "weight": 74.0,
                "systolic_bp": 138,
                "diastolic_bp": 88,
                "bs": 115.0,
                "temp": 37.0,
                "hr": 82,
                "bmi": 26.5
            }
        ],
        "chioma@mamacare.ai": [
            # Record 1 (30 days ago) - MEDIUM RISK (Different)
            {
                "days_ago": 30,
                "weight": 63.0,
                "systolic_bp": 118,
                "diastolic_bp": 75,
                "bs": 95.0,
                "temp": 36.8,
                "hr": 70,
                "bmi": 22.8
            },
            # Record 2 (15 days ago)
            {
                "days_ago": 15,
                "weight": 64.0,
                "systolic_bp": 122,
                "diastolic_bp": 78,
                "bs": 98.0,
                "temp": 36.9,
                "hr": 72,
                "bmi": 23.1
            },
            # Record 3 (today)
            {
                "days_ago": 0,
                "weight": 65.0,
                "systolic_bp": 128,
                "diastolic_bp": 82,
                "bs": 102.0,
                "temp": 36.9,
                "hr": 75,
                "bmi": 23.5
            }
        ],
        "aishat@mamacare.ai": [
            # Record 1 (30 days ago) - HIGH RISK
            {
                "days_ago": 30,
                "weight": 78.0,
                "systolic_bp": 130,
                "diastolic_bp": 85,
                "bs": 118.0,
                "temp": 37.0,
                "hr": 80,
                "bmi": 28.1
            },
            # Record 2 (15 days ago)
            {
                "days_ago": 15,
                "weight": 80.0,
                "systolic_bp": 140,
                "diastolic_bp": 90,
                "bs": 128.0,
                "temp": 37.1,
                "hr": 86,
                "bmi": 28.8
            },
            # Record 3 (today)
            {
                "days_ago": 0,
                "weight": 82.0,
                "systolic_bp": 148,
                "diastolic_bp": 95,
                "bs": 138.0,
                "temp": 37.2,
                "hr": 92,
                "bmi": 29.6
            }
        ],
        "ngozi@mamacare.ai": [
            # Record 1 (30 days ago) - MEDIUM-HIGH RISK
            {
                "days_ago": 30,
                "weight": 69.0,
                "systolic_bp": 124,
                "diastolic_bp": 80,
                "bs": 105.0,
                "temp": 36.8,
                "hr": 75,
                "bmi": 24.9
            },
            # Record 2 (15 days ago)
            {
                "days_ago": 15,
                "weight": 71.0,
                "systolic_bp": 130,
                "diastolic_bp": 84,
                "bs": 115.0,
                "temp": 36.9,
                "hr": 79,
                "bmi": 25.6
            },
            # Record 3 (today)
            {
                "days_ago": 0,
                "weight": 73.0,
                "systolic_bp": 136,
                "diastolic_bp": 87,
                "bs": 122.0,
                "temp": 37.0,
                "hr": 83,
                "bmi": 26.3
            }
        ]
    }
    
    all_health_records = []
    
    for pregnancy in pregnancies:
        user = db.query(User).filter(User.id == pregnancy.user_id).first()
        user_email = user.email
        
        if user_email not in health_data:
            print(f"  [WARNING] No health data defined for {user_email}, skipping...")
            continue
        
        records_data = health_data[user_email]
        
        for record_data in records_data:
            record_date = date.today() - timedelta(days=record_data["days_ago"])
            recorded_at = datetime.combine(record_date, datetime.min.time())
            
            health_record = HealthRecord(
                pregnancy_id=pregnancy.id,
                systolic_bp=record_data["systolic_bp"],
                diastolic_bp=record_data["diastolic_bp"],
                blood_sugar=record_data["bs"],
                body_temp=record_data["temp"],
                heart_rate=record_data["hr"],
                weight=record_data["weight"],
                bmi=record_data["bmi"],
                previous_complications=0,
                preexisting_diabetes=0,
                gestational_diabetes=0,
                mental_health=0,
                recorded_at=recorded_at
            )
            db.add(health_record)
            all_health_records.append(health_record)
        
        print(f"  [OK] Created 3 health records for {user_email}")
    
    db.commit()
    return all_health_records

def generate_risk_assessments(db, pregnancies, prediction_service):
    """Generate risk assessments for each health record using ML model"""
    print("\nGenerating risk assessments using ML model...")
    
    for pregnancy in pregnancies:
        user = db.query(User).filter(User.id == pregnancy.user_id).first()
        
        # Get all health records for this pregnancy, ordered by date
        health_records = db.query(HealthRecord).filter(
            HealthRecord.pregnancy_id == pregnancy.id
        ).order_by(HealthRecord.recorded_at.asc()).all()
        
        if not health_records:
            print(f"  [WARNING] No health records found for {user.email}, skipping...")
            continue
        
        # Generate assessment for each health record
        for health_record in health_records:
            try:
                # Create prediction request from health record
                request = PredictionRequest(
                    pregnancy_id=pregnancy.id,
                    age=user.age,
                    systolic_bp=health_record.systolic_bp,
                    diastolic_bp=health_record.diastolic_bp,
                    blood_sugar=float(health_record.blood_sugar) if health_record.blood_sugar else None,
                    body_temp=float(health_record.body_temp) if health_record.body_temp else None,
                    heart_rate=health_record.heart_rate,
                    bmi=float(health_record.bmi) if health_record.bmi else None,
                    previous_complications=health_record.previous_complications or 0,
                    preexisting_diabetes=health_record.preexisting_diabetes or 0,
                    gestational_diabetes=health_record.gestational_diabetes or 0,
                    mental_health=health_record.mental_health or 0
                )
                
                # Get prediction from ML model
                prediction = prediction_service.predictor.predict(request)
                
                # Create risk assessment
                risk_factors_dict = {"factors": prediction.risk_factors} if prediction.risk_factors else {}
                recommendations_text = "\n".join(prediction.recommendations) if prediction.recommendations else ""
                
                risk_assessment = RiskAssessment(
                    pregnancy_id=pregnancy.id,
                    health_record_id=health_record.id,
                    risk_level=prediction.risk_level,
                    risk_score=float(prediction.risk_score),  # Already percentage (0-100)
                    risk_factors=risk_factors_dict,
                    recommendations=recommendations_text,
                    assessed_at=health_record.recorded_at
                )
                db.add(risk_assessment)
                
            except Exception as e:
                print(f"  [WARNING] Error generating assessment for {user.email} record {health_record.id}: {e}")
                continue
        
        # Get latest assessment to show
        latest_assessment = db.query(RiskAssessment).filter(
            RiskAssessment.pregnancy_id == pregnancy.id
        ).order_by(RiskAssessment.assessed_at.desc()).first()
        
        if latest_assessment:
            print(f"  [OK] Generated assessments for {user.email} - Latest: {latest_assessment.risk_level} ({latest_assessment.risk_score:.1f}%)")
        else:
            print(f"  [WARNING] No assessments generated for {user.email}")
    
    db.commit()

def print_summary(db, users, pregnancies):
    """Print login credentials and summary"""
    print("\n" + "=" * 60)
    print("SEEDING COMPLETE - LOGIN CREDENTIALS")
    print("=" * 60)
    
    print("\n👤 PATIENT ACCOUNTS:")
    print("-" * 60)
    patient_users = [u for u in users if u.role == "patient"]
    
    # Get latest risk assessments for each patient
    summary_data = []
    for user in patient_users:
        pregnancy = db.query(Pregnancy).filter(
            Pregnancy.user_id == user.id,
            Pregnancy.is_active == True
        ).first()
        
        latest_assessment = None
        if pregnancy:
            latest_assessment = db.query(RiskAssessment).filter(
                RiskAssessment.pregnancy_id == pregnancy.id
            ).order_by(RiskAssessment.assessed_at.desc()).first()
        
        risk_level = latest_assessment.risk_level if latest_assessment else "N/A"
        risk_score = f"{latest_assessment.risk_score:.1f}%" if latest_assessment else "N/A"
        
        summary_data.append({
            "username": user.full_name,
            "email": user.email,
            "role": user.role,
            "risk_level": risk_level,
            "risk_score": risk_score
        })
        
        print(f"  {user.full_name:25} | {user.email:25} | {risk_level:10} | {risk_score:8}")
    
    print("\n👨‍⚕️ PROVIDER ACCOUNT:")
    print("-" * 60)
    provider = [u for u in users if u.role == "provider"][0]
    print(f"  {provider.full_name:25} | {provider.email:25} | Password: Test123!")
    
    print("\n🏛️ GOVERNMENT ACCOUNT:")
    print("-" * 60)
    government = [u for u in users if u.role == "government"][0]
    print(f"  {government.full_name:25} | {government.email:25} | Password: Test123!")
    
    print("\n" + "=" * 60)
    print("PROVIDER DASHBOARD PREVIEW")
    print("=" * 60)
    print(f"\nProvider: {provider.full_name}")
    print(f"Total Patients: {len(patient_users)}")
    print("\nPatient Risk Summary:")
    print("-" * 60)
    print(f"{'Patient Name':<25} | {'Email':<25} | {'Risk Level':<12} | {'Risk Score':<10}")
    print("-" * 60)
    
    for data in summary_data:
        print(f"{data['username']:<25} | {data['email']:<25} | {data['risk_level']:<12} | {data['risk_score']:<10}")
    
    # Count risk levels
    risk_counts = {}
    for data in summary_data:
        level = data['risk_level']
        risk_counts[level] = risk_counts.get(level, 0) + 1
    
    print("\nRisk Distribution:")
    for level, count in sorted(risk_counts.items()):
        print(f"  {level}: {count} patient(s)")
    
    print("\n" + "=" * 60)
    print("GOVERNMENT DASHBOARD PREVIEW")
    print("=" * 60)
    print(f"\nTotal Active Pregnancies: {len(pregnancies)}")
    print(f"Total Patients: {len(patient_users)}")
    print(f"Assigned Provider: {provider.full_name}")
    
    print("\nPopulation Statistics:")
    print("-" * 60)
    print(f"  High Risk:     {risk_counts.get('High', 0)} patient(s)")
    print(f"  Medium Risk:   {risk_counts.get('Medium', 0)} patient(s)")
    print(f"  Low Risk:      {risk_counts.get('Low', 0)} patient(s)")
    
    # Calculate average risk score
    total_score = 0
    count = 0
    for data in summary_data:
        if data['risk_score'] != 'N/A':
            total_score += float(data['risk_score'].replace('%', ''))
            count += 1
    
    if count > 0:
        avg_score = total_score / count
        print(f"  Average Risk Score: {avg_score:.1f}%")
    
    print("\n" + "=" * 60)
    print("ALL PASSWORDS: Test123!")
    print("=" * 60)
    print("\n[SUCCESS] Seed script completed successfully!")
    print("You can now login with any of the accounts above.\n")

def main():
    print("=" * 60)
    print("MamaCare AI - Hackathon Final Seed Script")
    print("=" * 60)
    
    # Initialize database
    print("\nInitializing database...")
    init_db()
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Clear all existing data
        clear_all_data(db)
        
        # Create users
        users = create_users(db)
        
        # Separate users by role
        patient_users = [u for u in users if u.role == "patient"]
        provider = [u for u in users if u.role == "provider"][0]
        
        # Create pregnancies
        pregnancies = create_pregnancies(db, patient_users, provider)
        
        # Create health records
        health_records = create_health_records(db, pregnancies)
        
        # Initialize prediction service
        print("\nInitializing ML prediction service...")
        prediction_service = PredictionService()
        
        # Generate risk assessments using ML model
        generate_risk_assessments(db, pregnancies, prediction_service)
        
        # Print summary
        print_summary(db, users, pregnancies)
        
    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Error seeding data: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()

