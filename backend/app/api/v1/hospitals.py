from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from app.database import get_db
from app.models.hospital import Hospital
from app.api.v1.dependencies import get_current_user
from app.models.user import User
from pydantic import BaseModel, Field
from typing import Optional, List
import math
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class HospitalResponse(BaseModel):
    id: str
    name: str
    type: str
    category: Optional[str]
    address: str
    city: str
    state: str
    country: str
    latitude: Optional[float]
    longitude: Optional[float]
    phone: Optional[str]
    email: Optional[str]
    website: Optional[str]
    has_emergency: bool
    has_maternity: bool
    has_ambulance: bool
    has_24hour: bool
    total_beds: Optional[int]
    available_beds: Optional[int]
    is_available: bool
    distance_km: Optional[float] = None
    
    class Config:
        from_attributes = True


class HospitalCreate(BaseModel):
    name: str
    type: str = Field(..., pattern="^(general|maternity|clinic|emergency)$")
    category: Optional[str] = Field(None, pattern="^(public|private|teaching)$")
    address: str
    city: str
    state: str
    country: str = "Nigeria"
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    has_emergency: bool = False
    has_maternity: bool = False
    has_ambulance: bool = False
    has_24hour: bool = False
    total_beds: Optional[int] = None
    available_beds: Optional[int] = None
    description: Optional[str] = None
    operating_hours: Optional[str] = None


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two coordinates in kilometers using Haversine formula"""
    R = 6371  # Earth radius in kilometers
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c


@router.get("/find", response_model=List[HospitalResponse])
async def find_hospitals(
    latitude: Optional[float] = Query(None, ge=-90, le=90),
    longitude: Optional[float] = Query(None, ge=-180, le=180),
    radius_km: float = Query(50, ge=1, le=500),
    city: Optional[str] = None,
    state: Optional[str] = None,
    has_emergency: Optional[bool] = None,
    has_maternity: Optional[bool] = None,
    has_ambulance: Optional[bool] = None,
    has_24hour: Optional[bool] = None,
    hospital_type: Optional[str] = Query(None, alias="type"),
    limit: int = Query(20, ge=1, le=100),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Find hospitals near a location or by filters"""
    try:
        query = db.query(Hospital).filter(Hospital.is_available == True)
        
        # Filter by city
        if city:
            query = query.filter(Hospital.city.ilike(f"%{city}%"))
        
        # Filter by state
        if state:
            query = query.filter(Hospital.state.ilike(f"%{state}%"))
        
        # Filter by services
        if has_emergency is not None:
            query = query.filter(Hospital.has_emergency == has_emergency)
        
        if has_maternity is not None:
            query = query.filter(Hospital.has_maternity == has_maternity)
        
        if has_ambulance is not None:
            query = query.filter(Hospital.has_ambulance == has_ambulance)
        
        if has_24hour is not None:
            query = query.filter(Hospital.has_24hour == has_24hour)
        
        # Filter by type
        if hospital_type:
            query = query.filter(Hospital.type == hospital_type)
        
        hospitals = query.limit(limit * 2).all()  # Get more to filter by distance
        
        # Calculate distances if coordinates provided
        if latitude and longitude:
            hospitals_with_distance = []
            for hospital in hospitals:
                if hospital.latitude and hospital.longitude:
                    distance = calculate_distance(
                        latitude, longitude,
                        hospital.latitude, hospital.longitude
                    )
                    if distance <= radius_km:
                        hospitals_with_distance.append((hospital, distance))
            
            # Sort by distance
            hospitals_with_distance.sort(key=lambda x: x[1])
            
            # Return top results with distance
            results = []
            for hospital, distance in hospitals_with_distance[:limit]:
                hospital_response = HospitalResponse.model_validate(hospital)
                hospital_dict = hospital_response.model_dump()
                hospital_dict['distance_km'] = round(distance, 2)
                results.append(hospital_dict)
            
            return results
        else:
            # Return without distance calculation
            return [HospitalResponse.model_validate(h) for h in hospitals[:limit]]
        
    except Exception as e:
        logger.error(f"Error finding hospitals: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to find hospitals"
        )


@router.get("/nearby", response_model=List[HospitalResponse])
async def find_nearby_hospitals(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(25, ge=1, le=100),
    limit: int = Query(10, ge=1, le=50),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Find nearest hospitals to a location (optimized for emergency use)"""
    try:
        # Get all hospitals with coordinates
        hospitals = db.query(Hospital).filter(
            Hospital.is_available == True,
            Hospital.latitude.isnot(None),
            Hospital.longitude.isnot(None)
        ).all()
        
        # Calculate distances and filter
        hospitals_with_distance = []
        for hospital in hospitals:
            distance = calculate_distance(
                latitude, longitude,
                hospital.latitude, hospital.longitude
            )
            if distance <= radius_km:
                hospitals_with_distance.append((hospital, distance))
        
        # Sort by distance (nearest first)
        hospitals_with_distance.sort(key=lambda x: x[1])
        
        # Return top results
        results = []
        for hospital, distance in hospitals_with_distance[:limit]:
            hospital_response = HospitalResponse.model_validate(hospital)
            hospital_dict = hospital_response.model_dump()
            hospital_dict['distance_km'] = round(distance, 2)
            results.append(hospital_dict)
        
        return results
        
    except Exception as e:
        logger.error(f"Error finding nearby hospitals: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to find nearby hospitals"
        )


@router.get("/{hospital_id}", response_model=HospitalResponse)
async def get_hospital(
    hospital_id: str,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get hospital details by ID"""
    try:
        hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
        
        if not hospital:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hospital not found"
            )
        
        return hospital
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching hospital: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch hospital"
        )


@router.post("/", response_model=HospitalResponse)
async def create_hospital(
    hospital_data: HospitalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new hospital (admin/provider only)"""
    try:
        # Only providers and government can add hospitals
        if current_user.role not in ["provider", "government"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only healthcare providers and government can add hospitals"
            )
        
        hospital = Hospital(**hospital_data.model_dump())
        db.add(hospital)
        db.commit()
        db.refresh(hospital)
        
        logger.info(f"Hospital created: {hospital.id} by user {current_user.id}")
        return hospital
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating hospital: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create hospital"
        )


@router.get("/states/{state}/hospitals", response_model=List[HospitalResponse])
async def get_hospitals_by_state(
    state: str,
    limit: int = Query(50, ge=1, le=200),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all hospitals in a state"""
    try:
        hospitals = db.query(Hospital).filter(
            Hospital.state.ilike(f"%{state}%"),
            Hospital.is_available == True
        ).limit(limit).all()
        
        return [HospitalResponse.model_validate(h) for h in hospitals]
        
    except Exception as e:
        logger.error(f"Error fetching hospitals by state: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch hospitals"
        )

