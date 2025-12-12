from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.user import User
from app.api.v1.dependencies import get_current_user
from typing import List, Optional
from pydantic import BaseModel
import logging
import math

logger = logging.getLogger(__name__)
router = APIRouter()


class ProviderResponse(BaseModel):
    id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    organization_name: Optional[str] = None
    license_number: Optional[str] = None
    verification_status: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance_km: Optional[float] = None  # Distance from user location if provided
    
    class Config:
        from_attributes = True


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two coordinates in kilometers using Haversine formula"""
    R = 6371  # Earth radius in kilometers
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c


@router.get("/providers", response_model=List[ProviderResponse])
async def list_providers(
    search: Optional[str] = Query(None, description="Search by name, email, or organization"),
    organization: Optional[str] = Query(None, description="Filter by organization name"),
    verified_only: bool = Query(False, description="Only show verified providers"),
    latitude: Optional[float] = Query(None, ge=-90, le=90, description="User latitude for distance calculation"),
    longitude: Optional[float] = Query(None, ge=-180, le=180, description="User longitude for distance calculation"),
    radius_km: Optional[float] = Query(None, ge=1, le=500, description="Maximum distance in kilometers"),
    sort_by: str = Query("name", description="Sort by: name, distance"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all available healthcare providers.
    Patients can use this to find and select their provider.
    Supports location-based sorting and filtering.
    """
    try:
        query = db.query(User).filter(User.role == "provider")
        
        logger.info(f"Provider search - verified_only: {verified_only}, search: {search}, organization: {organization}")
        
        # Filter by verification status
        # Show all providers (verified, pending, or null) - let patients see all available providers
        # Only filter out rejected providers
        if verified_only:
            # Show only verified providers
            query = query.filter(User.verification_status == "verified")
            logger.info("Provider search - Filtering for verified providers only")
        else:
            # Show all except rejected (verified, pending, or null)
            # Don't filter by verification_status at all - show everyone
            logger.info("Provider search - Showing all providers (no verification filter)")
        
        # Count before search filters
        total_before_filters = query.count()
        logger.info(f"Provider search - Total providers before search filters: {total_before_filters}")
        
        # Search filter
        if search:
            search_term = f"%{search.lower()}%"
            query = query.filter(
                or_(
                    User.full_name.ilike(search_term),
                    User.email.ilike(search_term),
                    User.organization_name.ilike(search_term)
                )
            )
        
        # Organization filter
        if organization:
            query = query.filter(User.organization_name.ilike(f"%{organization}%"))
        
        providers = query.all()
        logger.info(f"Provider search - Found {len(providers)} providers after all filters")
        
        # Calculate distances if location provided
        providers_with_distance = []
        for provider in providers:
            distance = None
            if latitude is not None and longitude is not None and provider.latitude and provider.longitude:
                distance = calculate_distance(
                    latitude, longitude,
                    provider.latitude, provider.longitude
                )
                # Filter by radius if specified
                if radius_km and distance > radius_km:
                    continue
            
            providers_with_distance.append((provider, distance))
        
        # Sort providers
        # Normalize sort_by to lowercase for comparison
        sort_by_lower = (sort_by or "name").lower()
        
        if sort_by_lower == "distance" and latitude is not None and longitude is not None:
            # Sort by distance (nearest first), providers without location go to end
            providers_with_distance.sort(key=lambda x: x[1] if x[1] is not None else float('inf'))
        else:
            # Sort by name (case-insensitive, handle None values)
            # Always sort by name if distance sorting is not available or not requested
            providers_with_distance.sort(key=lambda x: (x[0].full_name or '').lower() or 'zzz')
        
        # Build response
        results = []
        for provider, distance in providers_with_distance:
            provider_data = ProviderResponse(
                id=str(provider.id),
                full_name=provider.full_name,
                email=provider.email,
                phone=provider.phone,
                organization_name=provider.organization_name,
                license_number=provider.license_number,
                verification_status=provider.verification_status,
                address=provider.address,
                city=provider.city,
                state=provider.state,
                country=provider.country,
                latitude=provider.latitude,
                longitude=provider.longitude,
                distance_km=round(distance, 2) if distance is not None else None
            )
            results.append(provider_data)
        
        return results
        
    except Exception as e:
        logger.error(f"Error listing providers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch providers"
        )


@router.get("/providers/{provider_id}", response_model=ProviderResponse)
async def get_provider(
    provider_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a specific provider"""
    try:
        provider = db.query(User).filter(
            User.id == provider_id,
            User.role == "provider"
        ).first()
        
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found"
            )
        
        return ProviderResponse(
            id=str(provider.id),
            full_name=provider.full_name,
            email=provider.email,
            phone=provider.phone,
            organization_name=provider.organization_name,
            license_number=provider.license_number,
            verification_status=provider.verification_status,
            address=provider.address,
            city=provider.city,
            state=provider.state,
            country=provider.country,
            latitude=provider.latitude,
            longitude=provider.longitude
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching provider: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch provider"
        )

