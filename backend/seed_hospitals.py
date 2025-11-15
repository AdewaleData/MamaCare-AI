#!/usr/bin/env python
"""Seed database with sample hospitals in Nigeria"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import init_db, SessionLocal
from app.models.hospital import Hospital
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Sample hospitals in major Nigerian cities
SAMPLE_HOSPITALS = [
    {
        "name": "Lagos University Teaching Hospital (LUTH)",
        "type": "general",
        "category": "public",
        "address": "Idi-Araba, Surulere",
        "city": "Lagos",
        "state": "Lagos",
        "latitude": 6.5244,
        "longitude": 3.3792,
        "phone": "+234-1-774-7426",
        "has_emergency": True,
        "has_maternity": True,
        "has_ambulance": True,
        "has_24hour": True,
        "total_beds": 500,
        "available_beds": 300,
    },
    {
        "name": "National Hospital Abuja",
        "type": "general",
        "category": "public",
        "address": "Plot 132, Central Business District",
        "city": "Abuja",
        "state": "FCT",
        "latitude": 9.0765,
        "longitude": 7.3986,
        "phone": "+234-9-523-1000",
        "has_emergency": True,
        "has_maternity": True,
        "has_ambulance": True,
        "has_24hour": True,
        "total_beds": 600,
        "available_beds": 400,
    },
    {
        "name": "Eko Hospital",
        "type": "general",
        "category": "private",
        "address": "31 Mobolaji Bank Anthony Way",
        "city": "Lagos",
        "state": "Lagos",
        "latitude": 6.5244,
        "longitude": 3.3792,
        "phone": "+234-1-497-2000",
        "has_emergency": True,
        "has_maternity": True,
        "has_ambulance": True,
        "has_24hour": True,
        "total_beds": 200,
        "available_beds": 150,
    },
    {
        "name": "Ahmadu Bello University Teaching Hospital",
        "type": "general",
        "category": "teaching",
        "address": "Shika, Zaria",
        "city": "Zaria",
        "state": "Kaduna",
        "latitude": 11.1114,
        "longitude": 7.7223,
        "phone": "+234-69-664-0000",
        "has_emergency": True,
        "has_maternity": True,
        "has_ambulance": True,
        "has_24hour": True,
        "total_beds": 400,
        "available_beds": 250,
    },
    {
        "name": "University of Nigeria Teaching Hospital",
        "type": "general",
        "category": "teaching",
        "address": "Ituku-Ozalla",
        "city": "Enugu",
        "state": "Enugu",
        "latitude": 6.4474,
        "longitude": 7.5026,
        "phone": "+234-42-770-0000",
        "has_emergency": True,
        "has_maternity": True,
        "has_ambulance": True,
        "has_24hour": True,
        "total_beds": 450,
        "available_beds": 300,
    },
    {
        "name": "Lagoon Hospital",
        "type": "general",
        "category": "private",
        "address": "8 Bourdillon Road, Ikoyi",
        "city": "Lagos",
        "state": "Lagos",
        "latitude": 6.4474,
        "longitude": 3.4286,
        "phone": "+234-1-271-5000",
        "has_emergency": True,
        "has_maternity": True,
        "has_ambulance": True,
        "has_24hour": False,
        "total_beds": 100,
        "available_beds": 80,
    },
    {
        "name": "St. Nicholas Hospital",
        "type": "general",
        "category": "private",
        "address": "57 Campbell Street, Lagos Island",
        "city": "Lagos",
        "state": "Lagos",
        "latitude": 6.4541,
        "longitude": 3.3947,
        "phone": "+234-1-263-2000",
        "has_emergency": True,
        "has_maternity": True,
        "has_ambulance": True,
        "has_24hour": True,
        "total_beds": 150,
        "available_beds": 120,
    },
    {
        "name": "Aminu Kano Teaching Hospital",
        "type": "general",
        "category": "teaching",
        "address": "Zaria Road",
        "city": "Kano",
        "state": "Kano",
        "latitude": 12.0022,
        "longitude": 8.5919,
        "phone": "+234-64-633-0000",
        "has_emergency": True,
        "has_maternity": True,
        "has_ambulance": True,
        "has_24hour": True,
        "total_beds": 500,
        "available_beds": 350,
    },
]


def seed_hospitals():
    """Seed hospitals into database"""
    db = SessionLocal()
    try:
        init_db()
        
        count = 0
        for hospital_data in SAMPLE_HOSPITALS:
            # Check if hospital already exists
            existing = db.query(Hospital).filter(
                Hospital.name == hospital_data["name"],
                Hospital.city == hospital_data["city"]
            ).first()
            
            if not existing:
                hospital = Hospital(**hospital_data)
                db.add(hospital)
                count += 1
                logger.info(f"Added hospital: {hospital.name}")
            else:
                logger.info(f"Hospital already exists: {hospital_data['name']}")
        
        db.commit()
        logger.info(f"✅ Seeded {count} hospitals successfully")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding hospitals: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_hospitals()

