#!/usr/bin/env python3
"""
Demo Data Seeding Script for MamaCare AI Hackathon
Creates sample data for demonstration purposes
"""

import sys
import os
from pathlib import Path
from datetime import datetime, date, timedelta
import random

# Add backend directory to path
backend_dir = Path(__file__).parent.absolute()
sys.path.insert(0, str(backend_dir))
os.chdir(backend_dir)

from app.database import SessionLocal, init_db
from app.models.user import User
from app.models.pregnancy import Pregnancy
from app.models.health_record import HealthRecord
from app.models.risk_assessment import RiskAssessment
from app.models.appointment import Appointment
from app.models.emergency_contact import EmergencyContact
from app.utils.security import hash_password

def create_demo_users(db):
    """Create demo users"""
    print("Creating demo users...")
    
    users_data = [
        {
            "email": "demo@mamacare.ai",
            "full_name": "Amina Hassan",
            "phone": "+2348012345678",
            "age": 28,
            "password": "demo123",
            "language_preference": "en",
            "role": "patient"
        },
        {
            "email": "chioma@mamacare.ai",
            "full_name": "Chioma Okonkwo",
            "phone": "+2348023456789",
            "age": 32,
            "password": "demo123",
            "language_preference": "ig",
            "role": "patient"
        },
        {
            "email": "fatima@mamacare.ai",
            "full_name": "Fatima Usman",
            "phone": "+2348034567890",
            "age": 25,
            "password": "demo123",
            "language_preference": "ha",
            "role": "patient"
        },
        # Add more demo patients for better testing
        {
            "email": "adunni@mamacare.ai",
            "full_name": "Adunni Adebayo",
            "phone": "+2348067890123",
            "age": 30,
            "password": "demo123",
            "language_preference": "yo",
            "role": "patient"
        },
        {
            "email": "nkechi@mamacare.ai",
            "full_name": "Nkechi Okafor",
            "phone": "+2348078901234",
            "age": 27,
            "password": "demo123",
            "language_preference": "ig",
            "role": "patient"
        },
        {
            "email": "hauwa@mamacare.ai",
            "full_name": "Hauwa Ibrahim",
            "phone": "+2348089012345",
            "age": 29,
            "password": "demo123",
            "language_preference": "ha",
            "role": "patient"
        },
        {
            "email": "blessing@mamacare.ai",
            "full_name": "Blessing Eze",
            "phone": "+2348090123456",
            "age": 26,
            "password": "demo123",
            "language_preference": "en",
            "role": "patient"
        },
        {
            "email": "zainab@mamacare.ai",
            "full_name": "Zainab Mohammed",
            "phone": "+2348101234567",
            "age": 31,
            "password": "demo123",
            "language_preference": "ha",
            "role": "patient"
        },
        {
            "email": "provider@mamacare.ai",
            "full_name": "Dr. Sarah Johnson",
            "phone": "+2348045678901",
            "age": 45,
            "password": "demo123",
            "language_preference": "en",
            "role": "provider"
        },
        {
            "email": "government@mamacare.ai",
            "full_name": "Ministry of Health",
            "phone": "+2348056789012",
            "age": None,
            "password": "demo123",
            "language_preference": "en",
            "role": "government"
        }
    ]
    
    users = []
    for idx, user_data in enumerate(users_data):
        # Check if user exists
        existing = db.query(User).filter(User.email == user_data["email"]).first()
        if existing:
            print(f"  User {user_data['email']} already exists, skipping...")
            users.append(existing)
            continue
        
        # Spread user creation dates over last 60 days for realistic trends
        days_ago = random.randint(0, 60) if user_data.get("role") == "patient" else random.randint(0, 90)
        created_at = datetime.utcnow() - timedelta(days=days_ago)
        
        user = User(
            email=user_data["email"],
            full_name=user_data["full_name"],
            phone=user_data["phone"],
            age=user_data["age"],
            password_hash=hash_password(user_data["password"]),
            language_preference=user_data["language_preference"],
            role=user_data.get("role", "patient"),
            is_active=True,
            created_at=created_at
        )
        db.add(user)
        users.append(user)
        print(f"  Created user: {user_data['email']}")
    
    db.commit()
    return users

def create_demo_pregnancies(db, users):
    """Create demo pregnancies"""
    print("\nCreating demo pregnancies...")
    
    pregnancies = []
    for user in users:
        # Check if user already has active pregnancy
        existing = db.query(Pregnancy).filter(
            Pregnancy.user_id == user.id,
            Pregnancy.is_active == True
        ).first()
        
        if existing:
            print(f"  User {user.email} already has active pregnancy, skipping...")
            pregnancies.append(existing)
            continue
        
        # Create due date (3-6 months from now)
        days_ahead = random.randint(90, 180)
        due_date = date.today() + timedelta(days=days_ahead)
        
        # Calculate current week
        lmp_date = due_date - timedelta(days=280)
        days_pregnant = (date.today() - lmp_date).days
        current_week = max(1, min(40, days_pregnant // 7))
        
        if current_week <= 12:
            trimester = 1
        elif current_week <= 26:
            trimester = 2
        else:
            trimester = 3
        
        # Set pregnancy creation date to LMP date (when pregnancy started)
        pregnancy_created_at = datetime.combine(lmp_date, datetime.min.time())
        
        pregnancy = Pregnancy(
            user_id=user.id,
            due_date=due_date,
            pregnancy_stage=f"trimester{trimester}",
            current_week=current_week,
            trimester=trimester,
            is_active=True,
            doctor_name=f"Dr. {user.full_name.split()[0]}'s Doctor",
            hospital_name="Lagos General Hospital",
            blood_type=random.choice(["A+", "B+", "O+", "AB+"]),
            notes="Regular checkups scheduled",
            created_at=pregnancy_created_at
        )
        db.add(pregnancy)
        pregnancies.append(pregnancy)
        print(f"  Created pregnancy for {user.email} - Week {current_week}, Trimester {trimester}")
    
    db.commit()
    return pregnancies

def create_demo_health_records(db, pregnancies):
    """Create demo health records with realistic trends over pregnancy duration"""
    print("\nCreating demo health records with realistic trends...")
    
    for pregnancy in pregnancies:
        # Calculate pregnancy start date (LMP)
        due_date = pregnancy.due_date
        lmp_date = due_date - timedelta(days=280)
        days_pregnant = (date.today() - lmp_date).days
        current_week = pregnancy.current_week
        
        # Create 15-25 health records spread over the pregnancy
        num_records = random.randint(15, 25)
        
        # Base values for this pregnancy (consistent baseline)
        base_weight = round(random.uniform(55.0, 75.0), 1)  # Starting weight in kg
        base_bmi = round(base_weight / (1.6 ** 2), 1)  # Assuming height ~1.6m
        base_systolic = random.randint(110, 125)
        base_diastolic = random.randint(70, 80)
        base_heart_rate = random.randint(70, 85)
        
        # Determine if this pregnancy has complications
        has_complications = random.random() < 0.3  # 30% chance
        has_gestational_diabetes = random.random() < 0.15  # 15% chance
        has_preexisting_diabetes = random.random() < 0.1  # 10% chance
        has_mental_health_issues = random.random() < 0.2  # 20% chance
        
        # Generate records spread over pregnancy timeline
        for i in range(num_records):
            # Distribute records over pregnancy weeks (from week 4 to current week)
            week_number = random.randint(4, min(current_week, 40))
            days_from_start = (week_number - 1) * 7 + random.randint(0, 6)
            record_date = lmp_date + timedelta(days=days_from_start)
            
            # Only create records in the past
            if record_date > date.today():
                record_date = date.today() - timedelta(days=random.randint(1, 7))
            
            # Convert to datetime
            recorded_at = datetime.combine(record_date, datetime.min.time())
            
            # Calculate weight progression (typically 0.5-1kg per month, more in 2nd/3rd trimester)
            weeks_pregnant = week_number
            if weeks_pregnant <= 12:
                weight_gain = (weeks_pregnant - 4) * 0.15  # ~0.5kg/month in 1st trimester
            elif weeks_pregnant <= 28:
                weight_gain = 1.2 + (weeks_pregnant - 12) * 0.4  # ~1.5kg/month in 2nd trimester
            else:
                weight_gain = 7.6 + (weeks_pregnant - 28) * 0.5  # ~1.5kg/month in 3rd trimester
            
            weight = round(base_weight + weight_gain + random.uniform(-0.5, 0.5), 1)
            bmi = round(base_bmi + (weight_gain / (1.6 ** 2)) + random.uniform(-0.3, 0.3), 1)
            
            # Blood pressure trends (slightly increases in 2nd/3rd trimester, can spike if complications)
            bp_variation = random.uniform(-5, 5)
            if has_complications and weeks_pregnant > 20:
                bp_variation += random.uniform(5, 15)  # Higher BP with complications
            
            systolic_bp = max(90, min(160, base_systolic + int(bp_variation) + (weeks_pregnant - 12) // 10))
            diastolic_bp = max(60, min(100, base_diastolic + int(bp_variation * 0.7) + (weeks_pregnant - 12) // 15))
            
            # Heart rate increases during pregnancy (normal: 10-20 bpm increase)
            heart_rate = base_heart_rate + random.randint(5, 15) + (weeks_pregnant // 10)
            heart_rate = max(65, min(100, heart_rate))
            
            # Blood sugar (higher if diabetes, otherwise normal)
            if has_gestational_diabetes and weeks_pregnant > 20:
                blood_sugar = round(random.uniform(100, 140), 1)
            elif has_preexisting_diabetes:
                blood_sugar = round(random.uniform(90, 130), 1)
            else:
                blood_sugar = round(random.uniform(70, 100), 1)
            
            # Body temperature (slightly elevated during pregnancy)
            body_temp = round(random.uniform(36.6, 37.2), 1)
            
            health_record = HealthRecord(
                pregnancy_id=pregnancy.id,
                systolic_bp=systolic_bp,
                diastolic_bp=diastolic_bp,
                blood_sugar=blood_sugar,
                body_temp=body_temp,
                heart_rate=heart_rate,
                weight=weight,
                bmi=bmi,
                previous_complications=1 if has_complications and random.random() < 0.3 else 0,
                preexisting_diabetes=1 if has_preexisting_diabetes else 0,
                gestational_diabetes=1 if has_gestational_diabetes and weeks_pregnant > 20 else 0,
                mental_health=1 if has_mental_health_issues and random.random() < 0.3 else 0,
                recorded_at=recorded_at,
                notes=f"Week {week_number} checkup" if random.random() < 0.3 else None
            )
            db.add(health_record)
        
        print(f"  Created {num_records} health records for pregnancy {pregnancy.id} (Week {current_week})")
    
    db.commit()

def calculate_risk_from_health_record(health_record, pregnancy_week):
    """Calculate risk score based on health record data"""
    risk_score = 0.0
    risk_factors = []
    
    # Blood pressure risk (hypertension)
    if health_record.systolic_bp:
        if health_record.systolic_bp >= 140 or (health_record.diastolic_bp and health_record.diastolic_bp >= 90):
            risk_score += 0.35
            risk_factors.append("High Blood Pressure (Hypertension)")
        elif health_record.systolic_bp >= 130:
            risk_score += 0.15
            risk_factors.append("Elevated Blood Pressure")
    
    # Blood sugar risk (diabetes)
    if health_record.blood_sugar:
        if health_record.blood_sugar >= 140:
            risk_score += 0.30
            risk_factors.append("High Blood Sugar")
        elif health_record.blood_sugar >= 100:
            risk_score += 0.10
            risk_factors.append("Elevated Blood Sugar")
    
    # BMI risk (underweight or overweight)
    if health_record.bmi:
        if health_record.bmi < 18.5:
            risk_score += 0.15
            risk_factors.append("Underweight (Low BMI)")
        elif health_record.bmi >= 30:
            risk_score += 0.20
            risk_factors.append("Obesity (High BMI)")
        elif health_record.bmi >= 25:
            risk_score += 0.10
            risk_factors.append("Overweight")
    
    # Heart rate risk
    if health_record.heart_rate:
        if health_record.heart_rate >= 100:
            risk_score += 0.10
            risk_factors.append("Elevated Heart Rate")
        elif health_record.heart_rate < 60:
            risk_score += 0.05
            risk_factors.append("Low Heart Rate")
    
    # Medical history risks
    if health_record.previous_complications:
        risk_score += 0.20
        risk_factors.append("Previous Pregnancy Complications")
    
    if health_record.preexisting_diabetes:
        risk_score += 0.25
        risk_factors.append("Preexisting Diabetes")
    
    if health_record.gestational_diabetes:
        risk_score += 0.20
        risk_factors.append("Gestational Diabetes")
    
    if health_record.mental_health:
        risk_score += 0.15
        risk_factors.append("Mental Health Concerns")
    
    # Pregnancy week risk (advanced maternal age proxy, complications more common in 3rd trimester)
    if pregnancy_week >= 35:
        risk_score += 0.05
    
    # Normalize risk score (0.0 to 1.0)
    risk_score = min(1.0, risk_score)
    
    # Determine risk level
    if risk_score >= 0.6:
        risk_level = "High"
    elif risk_score >= 0.35:
        risk_level = "Medium"
    else:
        risk_level = "Low"
    
    # Generate recommendations based on risk
    recommendations = []
    if risk_score >= 0.6:
        recommendations.append("URGENT: Schedule immediate consultation with healthcare provider")
        recommendations.append("Monitor vital signs daily")
        recommendations.append("Follow up within 48 hours")
    elif risk_score >= 0.35:
        recommendations.append("Schedule follow-up appointment within 1 week")
        recommendations.append("Continue monitoring health metrics")
        recommendations.append("Maintain regular checkups")
    else:
        recommendations.append("Continue regular prenatal care")
        recommendations.append("Maintain healthy lifestyle")
    
    if "High Blood Pressure" in " ".join(risk_factors):
        recommendations.append("Reduce sodium intake and monitor BP regularly")
    if "Blood Sugar" in " ".join(risk_factors):
        recommendations.append("Follow diabetic diet plan and monitor glucose levels")
    if "BMI" in " ".join(risk_factors):
        recommendations.append("Consult nutritionist for appropriate weight management")
    
    return risk_level, round(risk_score, 3), risk_factors, "\n".join(recommendations)


def create_demo_risk_assessments(db, pregnancies):
    """Create demo risk assessments based on actual health record data with 60% High, 30% Medium, 10% Low distribution"""
    print("\nCreating demo risk assessments based on health records...")
    
    all_assessments = []
    
    for pregnancy in pregnancies:
        # Get health records for this pregnancy, ordered by date
        health_records = db.query(HealthRecord).filter(
            HealthRecord.pregnancy_id == pregnancy.id
        ).order_by(HealthRecord.recorded_at.asc()).all()
        
        if not health_records:
            continue
        
        # Create assessments for key health records (every 3-4 records, plus recent ones)
        for idx, health_record in enumerate(health_records):
            # Assess every 3rd record, or if it's in the last 5 records
            should_assess = (idx % 3 == 0) or (idx >= len(health_records) - 5)
            
            if should_assess:
                # Calculate pregnancy week at time of record
                lmp_date = pregnancy.due_date - timedelta(days=280)
                days_pregnant = (health_record.recorded_at.date() - lmp_date).days
                record_week = max(1, min(40, days_pregnant // 7))
                
                # Calculate risk based on actual health data
                risk_level, risk_score, risk_factors, recommendations = calculate_risk_from_health_record(
                    health_record, record_week
                )
                
                all_assessments.append({
                    "pregnancy_id": pregnancy.id,
                    "health_record_id": health_record.id,
                    "risk_level": risk_level,
                    "risk_score": risk_score,
                    "risk_factors": risk_factors,
                    "recommendations": recommendations,
                    "assessed_at": health_record.recorded_at
                })
    
    # Now adjust to ensure 60% High, 30% Medium, 10% Low distribution
    if all_assessments:
        total = len(all_assessments)
        target_high = int(total * 0.6)
        target_medium = int(total * 0.3)
        target_low = total - target_high - target_medium
        
        # Sort by risk score (highest first)
        all_assessments.sort(key=lambda x: x["risk_score"], reverse=True)
        
        # Assign risk levels to match distribution
        for idx, assessment in enumerate(all_assessments):
            if idx < target_high:
                assessment["risk_level"] = "High"
                # Ensure risk score is high enough
                if assessment["risk_score"] < 0.6:
                    assessment["risk_score"] = round(random.uniform(0.6, 0.95), 3)
                    # Add more risk factors for high risk
                    if not assessment["risk_factors"]:
                        assessment["risk_factors"] = ["High Blood Pressure", "Elevated Blood Sugar"]
                    assessment["recommendations"] = "URGENT: Schedule immediate consultation with healthcare provider\nMonitor vital signs daily\nFollow up within 48 hours"
            elif idx < target_high + target_medium:
                assessment["risk_level"] = "Medium"
                # Ensure risk score is in medium range
                if assessment["risk_score"] < 0.35 or assessment["risk_score"] >= 0.6:
                    assessment["risk_score"] = round(random.uniform(0.35, 0.59), 3)
                    if not assessment["risk_factors"]:
                        assessment["risk_factors"] = ["Elevated Blood Pressure"]
                    assessment["recommendations"] = "Schedule follow-up appointment within 1 week\nContinue monitoring health metrics\nMaintain regular checkups"
            else:
                assessment["risk_level"] = "Low"
                # Ensure risk score is low
                if assessment["risk_score"] >= 0.35:
                    assessment["risk_score"] = round(random.uniform(0.1, 0.34), 3)
                    if assessment["risk_factors"]:
                        assessment["risk_factors"] = []
                    assessment["recommendations"] = "Continue regular prenatal care\nMaintain healthy lifestyle"
        
        # Now create the risk assessment records
        for assessment_data in all_assessments:
            risk_assessment = RiskAssessment(
                pregnancy_id=assessment_data["pregnancy_id"],
                health_record_id=assessment_data["health_record_id"],
                risk_level=assessment_data["risk_level"],
                risk_score=assessment_data["risk_score"],
                risk_factors={"factors": assessment_data["risk_factors"]} if assessment_data["risk_factors"] else {},
                recommendations=assessment_data["recommendations"],
                assessed_at=assessment_data["assessed_at"]
            )
            db.add(risk_assessment)
        
        print(f"  Created {len(all_assessments)} risk assessments with distribution: {target_high} High ({target_high/total*100:.1f}%), {target_medium} Medium ({target_medium/total*100:.1f}%), {target_low} Low ({target_low/total*100:.1f}%)")
    
    db.commit()

def create_demo_appointments(db, pregnancies):
    """Create demo appointments"""
    print("\nCreating demo appointments...")
    
    for pregnancy in pregnancies:
        # Create 2-3 appointments
        num_appointments = random.randint(2, 3)
        
        for i in range(num_appointments):
            days_ahead = random.randint(7, 60)
            appointment_date = datetime.utcnow() + timedelta(days=days_ahead)
            
            appointment = Appointment(
                pregnancy_id=pregnancy.id,
                appointment_date=appointment_date,
                clinic_name="Lagos General Hospital",
                clinic_address="123 Medical Street, Lagos",
                appointment_type=random.choice(["Routine Checkup", "Ultrasound", "Lab Test"]),
                status="scheduled"
            )
            db.add(appointment)
        
        print(f"  Created {num_appointments} appointments for pregnancy {pregnancy.id}")
    
    db.commit()

def create_demo_emergency_contacts(db, users):
    """Create demo emergency contacts"""
    print("\nCreating demo emergency contacts...")
    
    for user in users:
        contacts_data = [
            {
                "name": f"{user.full_name.split()[0]}'s Husband",
                "phone": f"+234{random.randint(8000000000, 8999999999)}",
                "relationship_type": "Spouse",  # Updated to relationship_type
                "is_primary": True
            },
            {
                "name": f"{user.full_name.split()[0]}'s Mother",
                "phone": f"+234{random.randint(8000000000, 8999999999)}",
                "relationship_type": "Parent",  # Updated to relationship_type
                "is_primary": False
            }
        ]
        
        for contact_data in contacts_data:
            contact = EmergencyContact(
                user_id=user.id,
                **contact_data
            )
            db.add(contact)
        
        print(f"  Created emergency contacts for {user.email}")
    
    db.commit()

def main():
    print("=" * 60)
    print("MamaCare AI - Demo Data Seeding Script")
    print("=" * 60)
    
    # Initialize database
    print("\nInitializing database...")
    init_db()
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Clear existing demo data (optional - uncomment to reset data)
        print("\nClearing existing demo data...")
        from app.models.risk_assessment import RiskAssessment
        from app.models.appointment import Appointment
        from app.models.emergency_contact import EmergencyContact
        
        db.query(RiskAssessment).delete()
        db.query(HealthRecord).delete()
        db.query(Appointment).delete()
        db.query(EmergencyContact).delete()
        db.query(Pregnancy).delete()
        # Keep users to preserve login credentials
        db.commit()
        print("  Cleared existing demo data")
        
        # Create demo data
        users = create_demo_users(db)
        pregnancies = create_demo_pregnancies(db, users)
        create_demo_health_records(db, pregnancies)
        create_demo_risk_assessments(db, pregnancies)
        create_demo_appointments(db, pregnancies)
        create_demo_emergency_contacts(db, users)
        
        print("\n" + "=" * 60)
        print("✅ Demo data seeding completed successfully!")
        print("=" * 60)
        print("\nDemo Credentials:")
        print("\n👤 Patient Accounts:")
        print("  Email: demo@mamacare.ai")
        print("  Email: chioma@mamacare.ai")
        print("  Email: fatima@mamacare.ai")
        print("  Password: demo123")
        print("\n👨‍⚕️ Healthcare Provider Account:")
        print("  Email: provider@mamacare.ai")
        print("  Password: demo123")
        print("\n🏛️ Government Account:")
        print("  Email: government@mamacare.ai")
        print("  Password: demo123")
        print("\nYou can now use these credentials to login and explore the platform.")
        print("=" * 60)
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error seeding demo data: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()

