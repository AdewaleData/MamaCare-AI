from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.offline_sync import OfflineSync
from app.api.v1.dependencies import get_current_user
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class OfflineSyncRequest(BaseModel):
    """Request to sync offline data"""
    device_id: str
    entity_type: str = Field(..., pattern="^(health_record|appointment|pregnancy|emergency_contact)$")
    entity_id: Optional[str] = None
    client_data: Dict[str, Any]
    client_timestamp: datetime


class OfflineSyncResponse(BaseModel):
    """Response for sync operation"""
    id: str
    status: str
    conflict_resolution: Optional[str]
    server_data: Optional[Dict[str, Any]] = None
    merged_data: Optional[Dict[str, Any]] = None
    synced_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class BulkSyncRequest(BaseModel):
    """Bulk sync request for multiple entities"""
    device_id: str
    syncs: List[OfflineSyncRequest]


class BulkSyncResponse(BaseModel):
    """Bulk sync response"""
    total: int
    successful: int
    failed: int
    conflicts: int
    results: List[OfflineSyncResponse]


@router.post("/sync", response_model=OfflineSyncResponse)
async def sync_offline_data(
    sync_request: OfflineSyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sync a single offline data entity"""
    try:
        # Check for existing sync record
        existing_sync = None
        if sync_request.entity_id:
            existing_sync = db.query(OfflineSync).filter(
                OfflineSync.user_id == current_user.id,
                OfflineSync.entity_id == sync_request.entity_id,
                OfflineSync.status == "pending"
            ).first()
        
        # Check for conflicts by comparing timestamps
        conflict = False
        server_data = None
        
        if sync_request.entity_type == "health_record":
            from app.models.health_record import HealthRecord
            if sync_request.entity_id:
                server_record = db.query(HealthRecord).filter(
                    HealthRecord.id == sync_request.entity_id
                ).first()
                if server_record:
                    server_data = {
                        "id": server_record.id,
                        "pregnancy_id": server_record.pregnancy_id,
                        "systolic_bp": server_record.systolic_bp,
                        "diastolic_bp": server_record.diastolic_bp,
                        "blood_sugar": server_record.blood_sugar,
                        "body_temp": server_record.body_temp,
                        "weight": server_record.weight,
                        "heart_rate": server_record.heart_rate,
                        "bmi": server_record.bmi,
                        "recorded_at": server_record.recorded_at.isoformat() if server_record.recorded_at else None,
                        "created_at": server_record.created_at.isoformat() if server_record.created_at else None,
                    }
                    # Check if server version is newer
                    if server_record.updated_at and sync_request.client_timestamp < server_record.updated_at:
                        conflict = True
        
        # Create sync record
        sync = OfflineSync(
            user_id=current_user.id,
            device_id=sync_request.device_id,
            sync_type="upload",
            entity_type=sync_request.entity_type,
            entity_id=sync_request.entity_id,
            client_data=json.dumps(sync_request.client_data),
            client_timestamp=sync_request.client_timestamp,
            status="conflict" if conflict else "syncing"
        )
        
        if server_data:
            sync.server_data = json.dumps(server_data)
        
        db.add(sync)
        db.commit()
        db.refresh(sync)
        
        # Resolve conflict or sync data
        if conflict:
            # Default: server wins, but return both for client to decide
            sync.status = "conflict"
            sync.conflict_resolution = "pending"
        else:
            # Apply client data (simplified - in production, validate and merge properly)
            sync.status = "completed"
            sync.synced_at = datetime.utcnow()
            sync.conflict_resolution = "client_wins"
        
        db.commit()
        db.refresh(sync)
        
        # Prepare response
        response_data = {
            "id": sync.id,
            "status": sync.status,
            "conflict_resolution": sync.conflict_resolution,
            "synced_at": sync.synced_at
        }
        
        if sync.server_data:
            response_data["server_data"] = json.loads(sync.server_data)
        
        if sync.merged_data:
            response_data["merged_data"] = json.loads(sync.merged_data)
        
        return response_data
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error syncing offline data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sync offline data"
        )


@router.post("/sync/bulk", response_model=BulkSyncResponse)
async def bulk_sync_offline_data(
    bulk_request: BulkSyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Bulk sync multiple offline data entities"""
    try:
        results = []
        successful = 0
        failed = 0
        conflicts = 0
        
        for sync_request in bulk_request.syncs:
            try:
                # Use the single sync endpoint logic
                sync = OfflineSync(
                    user_id=current_user.id,
                    device_id=bulk_request.device_id,
                    sync_type="upload",
                    entity_type=sync_request.entity_type,
                    entity_id=sync_request.entity_id,
                    client_data=json.dumps(sync_request.client_data),
                    client_timestamp=sync_request.client_timestamp,
                    status="syncing"
                )
                
                db.add(sync)
                db.commit()
                db.refresh(sync)
                
                sync.status = "completed"
                sync.synced_at = datetime.utcnow()
                db.commit()
                
                results.append(OfflineSyncResponse(
                    id=sync.id,
                    status=sync.status,
                    conflict_resolution=sync.conflict_resolution,
                    synced_at=sync.synced_at
                ))
                successful += 1
                
            except Exception as e:
                failed += 1
                logger.error(f"Error syncing entity {sync_request.entity_id}: {e}")
        
        return BulkSyncResponse(
            total=len(bulk_request.syncs),
            successful=successful,
            failed=failed,
            conflicts=conflicts,
            results=results
        )
        
    except Exception as e:
        logger.error(f"Error in bulk sync: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to perform bulk sync"
        )


@router.get("/sync/conflicts")
async def get_sync_conflicts(
    device_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get pending sync conflicts for resolution"""
    try:
        query = db.query(OfflineSync).filter(
            OfflineSync.user_id == current_user.id,
            OfflineSync.status == "conflict"
        )
        
        if device_id:
            query = query.filter(OfflineSync.device_id == device_id)
        
        conflicts = query.order_by(OfflineSync.created_at.desc()).all()
        
        results = []
        for conflict in conflicts:
            result = {
                "id": conflict.id,
                "entity_type": conflict.entity_type,
                "entity_id": conflict.entity_id,
                "client_data": json.loads(conflict.client_data) if conflict.client_data else None,
                "server_data": json.loads(conflict.server_data) if conflict.server_data else None,
                "client_timestamp": conflict.client_timestamp,
                "server_timestamp": conflict.server_timestamp,
                "created_at": conflict.created_at
            }
            results.append(result)
        
        return {"conflicts": results, "total": len(results)}
        
    except Exception as e:
        logger.error(f"Error fetching sync conflicts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch sync conflicts"
        )


@router.put("/sync/{sync_id}/resolve")
async def resolve_sync_conflict(
    sync_id: str,
    resolution: str = Query(..., pattern="^(server_wins|client_wins|merged)$"),
    merged_data: Optional[Dict[str, Any]] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resolve a sync conflict"""
    try:
        sync = db.query(OfflineSync).filter(
            OfflineSync.id == sync_id,
            OfflineSync.user_id == current_user.id,
            OfflineSync.status == "conflict"
        ).first()
        
        if not sync:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sync conflict not found"
            )
        
        sync.status = "completed"
        sync.conflict_resolution = resolution
        sync.synced_at = datetime.utcnow()
        
        if resolution == "merged" and merged_data:
            sync.merged_data = json.dumps(merged_data)
        elif resolution == "server_wins":
            sync.merged_data = sync.server_data
        else:  # client_wins
            sync.merged_data = sync.client_data
        
        db.commit()
        
        return {
            "message": "Conflict resolved",
            "sync_id": sync_id,
            "resolution": resolution
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error resolving sync conflict: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resolve sync conflict"
        )


@router.get("/sync/history")
async def get_sync_history(
    device_id: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get sync history for a user/device"""
    try:
        query = db.query(OfflineSync).filter(
            OfflineSync.user_id == current_user.id
        )
        
        if device_id:
            query = query.filter(OfflineSync.device_id == device_id)
        
        syncs = query.order_by(OfflineSync.created_at.desc()).limit(limit).all()
        
        results = []
        for sync in syncs:
            results.append({
                "id": sync.id,
                "device_id": sync.device_id,
                "entity_type": sync.entity_type,
                "entity_id": sync.entity_id,
                "status": sync.status,
                "conflict_resolution": sync.conflict_resolution,
                "created_at": sync.created_at,
                "synced_at": sync.synced_at
            })
        
        return {"syncs": results, "total": len(results)}
        
    except Exception as e:
        logger.error(f"Error fetching sync history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch sync history"
        )

