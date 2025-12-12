#!/usr/bin/env python3
"""
Setup script to ensure Aishat and Doctor can chat
Verifies and sets up the patient-provider relationship for chat testing
"""

import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.absolute()
sys.path.insert(0, str(backend_dir))
os.chdir(backend_dir)

from app.database import SessionLocal, init_db
from app.utils.security import hash_password
from datetime import date, timedelta

# Import all models FIRST to resolve relationships
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

# Force relationship configuration
_ = user_model.User
_ = pregnancy_model.Pregnancy
_ = emergency_contact.EmergencyContact

# Now import the classes we need
from app.models.user import User
from app.models.pregnancy import Pregnancy

def setup_chat_test():
    """Setup chat relationship between Aishat and Doctor"""
    db = SessionLocal()
    try:
        print("=" * 60)
        print("Setting up chat test: Aishat <-> Doctor")
        print("=" * 60)
        
        # Get or create Aishat (patient)
        aishat = db.query(User).filter(User.email == "aishat@mamacare.ai").first()
        if not aishat:
            print("Creating Aishat user...")
            aishat = User(
                email="aishat@mamacare.ai",
                full_name="Aishat Adeyemi",
                phone="+2348045678901",
                age=35,
                password_hash=hash_password("Test123!"),
                language_preference="en",
                role="patient",
                is_active=True
            )
            db.add(aishat)
            db.commit()
            db.refresh(aishat)
            print(f"  ✓ Created Aishat: {aishat.id}")
        else:
            print(f"  ✓ Aishat exists: {aishat.id} ({aishat.full_name})")
        
        # Get or create Doctor (provider)
        doctor = db.query(User).filter(User.email == "doctor@mamacare.ai").first()
        if not doctor:
            print("Creating Doctor user...")
            doctor = User(
                email="doctor@mamacare.ai",
                full_name="Dr. Eze Okafor",
                phone="+2348067890123",
                age=45,
                password_hash=hash_password("Test123!"),
                language_preference="en",
                role="provider",
                is_active=True
            )
            db.add(doctor)
            db.commit()
            db.refresh(doctor)
            print(f"  ✓ Created Doctor: {doctor.id}")
        else:
            print(f"  ✓ Doctor exists: {doctor.id} ({doctor.full_name})")
        
        # Ensure Aishat has a pregnancy with Doctor assigned
        pregnancy = db.query(Pregnancy).filter(
            Pregnancy.user_id == aishat.id,
            Pregnancy.is_active == True
        ).first()
        
        if not pregnancy:
            print("Creating pregnancy for Aishat...")
            due_date = date.today() + timedelta(days=190)  # ~27 weeks from now
            pregnancy = Pregnancy(
                user_id=aishat.id,
                due_date=due_date,
                pregnancy_stage="trimester2",
                current_week=13,
                trimester=2,
                is_active=True,
                doctor_name=doctor.full_name,  # This is the key for chat permission
                hospital_name="Lagos General Hospital",
                blood_type="O+",
                notes="Regular checkups scheduled"
            )
            db.add(pregnancy)
            db.commit()
            db.refresh(pregnancy)
            print(f"  ✓ Created pregnancy for Aishat with Doctor assigned")
        else:
            # Update doctor_name if not set correctly
            if pregnancy.doctor_name != doctor.full_name:
                print(f"  Updating pregnancy doctor_name from '{pregnancy.doctor_name}' to '{doctor.full_name}'...")
                pregnancy.doctor_name = doctor.full_name
                db.commit()
                print(f"  ✓ Updated pregnancy doctor_name")
            else:
                print(f"  ✓ Pregnancy already has Doctor assigned: {pregnancy.doctor_name}")
        
        # Verify the relationship
        print("\n" + "=" * 60)
        print("Verification:")
        print("=" * 60)
        print(f"Patient: {aishat.full_name} ({aishat.email})")
        print(f"Provider: {doctor.full_name} ({doctor.email})")
        print(f"Pregnancy Doctor: {pregnancy.doctor_name}")
        print(f"Match: {'✓ YES - They can chat!' if pregnancy.doctor_name == doctor.full_name else '✗ NO - Need to fix'}")
        
        print("\n" + "=" * 60)
        print("Chat Test Setup Complete!")
        print("=" * 60)
        print("\nLogin credentials:")
        print(f"  Patient: aishat@mamacare.ai / Test123!")
        print(f"  Provider: doctor@mamacare.ai / Test123!")
        print("\nTo test:")
        print("  1. Login as Aishat and go to MamaCare Chat")
        print("  2. Click 'New Chat' and you should see Dr. Eze Okafor")
        print("  3. Login as Doctor and go to MamaCare Chat")
        print("  4. Click 'New Chat' and you should see Aishat Adeyemi")
        print("=" * 60)
        
    except Exception as e:
        db.rollback()
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
    setup_chat_test()

