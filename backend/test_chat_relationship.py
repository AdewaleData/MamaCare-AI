#!/usr/bin/env python3
"""Quick test to verify chat relationship"""

import sys
import os
from pathlib import Path

backend_dir = Path(__file__).parent.absolute()
sys.path.insert(0, str(backend_dir))
os.chdir(backend_dir)

# Import all models FIRST
from app.models import user as user_model
from app.models import (
    pregnancy as pregnancy_model,
    health_record,
    risk_assessment,
    appointment,
    emergency_alert,
    hospital,
    subscription,
    offline_sync,
    translation,
    emergency_contact,
    message
)

_ = user_model.User
_ = pregnancy_model.Pregnancy
_ = emergency_contact.EmergencyContact

from app.database import SessionLocal
from app.models.user import User
from app.models.pregnancy import Pregnancy

db = SessionLocal()
try:
    doctor = db.query(User).filter(User.email == "doctor@mamacare.ai").first()
    aishat = db.query(User).filter(User.email == "aishat@mamacare.ai").first()
    
    print("=" * 60)
    print("Chat Relationship Test")
    print("=" * 60)
    
    if doctor:
        print(f"\nDoctor:")
        print(f"  ID: {doctor.id}")
        print(f"  Name: '{doctor.full_name}'")
        print(f"  Email: {doctor.email}")
        print(f"  Role: {doctor.role}")
    else:
        print("\n✗ Doctor not found!")
    
    if aishat:
        print(f"\nPatient:")
        print(f"  ID: {aishat.id}")
        print(f"  Name: '{aishat.full_name}'")
        print(f"  Email: {aishat.email}")
        print(f"  Role: {aishat.role}")
    else:
        print("\n✗ Aishat not found!")
    
    if doctor and aishat:
        # Check pregnancies
        pregnancies = db.query(Pregnancy).filter(
            Pregnancy.user_id == aishat.id,
            Pregnancy.is_active == True
        ).all()
        
        print(f"\nPregnancies for Aishat: {len(pregnancies)}")
        for p in pregnancies:
            print(f"  - Doctor Name in DB: '{p.doctor_name}'")
            print(f"  - Doctor Full Name: '{doctor.full_name}'")
            print(f"  - Match: {'✓ YES' if p.doctor_name == doctor.full_name else '✗ NO'}")
            
            if p.doctor_name != doctor.full_name:
                print(f"  ⚠️  FIXING: Updating doctor_name...")
                p.doctor_name = doctor.full_name
                db.commit()
                print(f"  ✓ Fixed!")
        
        # Test provider query
        print(f"\nTesting Provider Query:")
        provider_pregnancies = db.query(Pregnancy).filter(
            Pregnancy.doctor_name == doctor.full_name,
            Pregnancy.is_active == True
        ).all()
        print(f"  Found {len(provider_pregnancies)} pregnancies with doctor_name='{doctor.full_name}'")
        
        if provider_pregnancies:
            patient_ids = [p.user_id for p in provider_pregnancies]
            patients = db.query(User).filter(
                User.id.in_(patient_ids),
                User.role == "patient"
            ).all()
            print(f"  Found {len(patients)} patients")
            for patient in patients:
                print(f"    - {patient.full_name} ({patient.email})")
        else:
            print("  ✗ No pregnancies found!")
            print(f"  Trying case-insensitive search...")
            all_pregnancies = db.query(Pregnancy).filter(Pregnancy.is_active == True).all()
            for p in all_pregnancies:
                if p.doctor_name and doctor.full_name.lower() in p.doctor_name.lower():
                    print(f"    Found similar: '{p.doctor_name}' (patient: {p.user_id})")
    
    print("\n" + "=" * 60)
finally:
    db.close()

