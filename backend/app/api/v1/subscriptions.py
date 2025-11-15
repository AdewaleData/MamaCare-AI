from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.database import get_db
from app.models.user import User
from app.models.subscription import SubscriptionPlan, UserSubscription, Payment
from app.api.v1.dependencies import get_current_user
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date, timedelta
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class SubscriptionPlanResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    price_monthly: float
    price_yearly: Optional[float]
    currency: str
    max_pregnancies: int
    max_health_records: Optional[int]
    has_ai_predictions: bool
    has_emergency_features: bool
    has_telemedicine: bool
    has_priority_support: bool
    has_advanced_analytics: bool
    
    class Config:
        from_attributes = True


class UserSubscriptionResponse(BaseModel):
    id: str
    user_id: str
    plan_id: Optional[str]
    plan_name: Optional[str]
    status: str
    billing_cycle: str
    start_date: date
    end_date: Optional[date]
    trial_end_date: Optional[date]
    auto_renew: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class PaymentResponse(BaseModel):
    id: str
    user_id: str
    subscription_id: Optional[str]
    amount: float
    currency: str
    payment_method: str
    payment_provider: Optional[str]
    status: str
    transaction_reference: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class CreateSubscriptionRequest(BaseModel):
    plan_id: str
    billing_cycle: str = Field(..., pattern="^(monthly|yearly)$")
    payment_method: str = Field(..., pattern="^(card|bank_transfer|mobile_money)$")
    payment_provider: Optional[str] = None  # paystack, flutterwave, etc.


class PaymentRequest(BaseModel):
    amount: float
    currency: str = "NGN"
    payment_method: str = Field(..., pattern="^(card|bank_transfer|mobile_money)$")
    payment_provider: Optional[str] = None
    description: Optional[str] = None


# Initialize default subscription plans
def initialize_default_plans(db: Session):
    """Initialize default subscription plans if they don't exist"""
    plans = [
        {
            "name": "Basic",
            "description": "Free tier with basic features",
            "price_monthly": 0.0,
            "price_yearly": 0.0,
            "max_pregnancies": 1,
            "max_health_records": 50,
            "has_ai_predictions": True,
            "has_emergency_features": True,
            "has_telemedicine": False,
            "has_priority_support": False,
            "has_advanced_analytics": False,
        },
        {
            "name": "Premium",
            "description": "Premium features for expectant mothers",
            "price_monthly": 2000.0,
            "price_yearly": 20000.0,
            "max_pregnancies": 3,
            "max_health_records": None,  # unlimited
            "has_ai_predictions": True,
            "has_emergency_features": True,
            "has_telemedicine": True,
            "has_priority_support": True,
            "has_advanced_analytics": True,
        },
        {
            "name": "Family",
            "description": "Family plan for multiple users",
            "price_monthly": 5000.0,
            "price_yearly": 50000.0,
            "max_pregnancies": 10,
            "max_health_records": None,
            "has_ai_predictions": True,
            "has_emergency_features": True,
            "has_telemedicine": True,
            "has_priority_support": True,
            "has_advanced_analytics": True,
        }
    ]
    
    for plan_data in plans:
        existing = db.query(SubscriptionPlan).filter(
            SubscriptionPlan.name == plan_data["name"]
        ).first()
        
        if not existing:
            plan = SubscriptionPlan(**plan_data)
            db.add(plan)
    
    db.commit()


@router.get("/plans", response_model=List[SubscriptionPlanResponse])
async def get_subscription_plans(
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all available subscription plans"""
    try:
        # Initialize default plans if needed
        initialize_default_plans(db)
        
        plans = db.query(SubscriptionPlan).filter(
            SubscriptionPlan.is_active == True
        ).all()
        
        return plans
        
    except Exception as e:
        logger.error(f"Error fetching subscription plans: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch subscription plans"
        )


@router.get("/plans/{plan_id}", response_model=SubscriptionPlanResponse)
async def get_subscription_plan(
    plan_id: str,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific subscription plan"""
    try:
        plan = db.query(SubscriptionPlan).filter(
            SubscriptionPlan.id == plan_id,
            SubscriptionPlan.is_active == True
        ).first()
        
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription plan not found"
            )
        
        return plan
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching subscription plan: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch subscription plan"
        )


@router.post("/subscribe", response_model=UserSubscriptionResponse)
async def create_subscription(
    subscription_data: CreateSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new subscription"""
    try:
        # Get plan
        plan = db.query(SubscriptionPlan).filter(
            SubscriptionPlan.id == subscription_data.plan_id,
            SubscriptionPlan.is_active == True
        ).first()
        
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription plan not found"
            )
        
        # Check for existing active subscription
        existing = db.query(UserSubscription).filter(
            UserSubscription.user_id == current_user.id,
            UserSubscription.status == "active"
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has an active subscription"
            )
        
        # Calculate pricing
        if subscription_data.billing_cycle == "yearly" and plan.price_yearly:
            amount = plan.price_yearly
        else:
            amount = plan.price_monthly
        
        # Calculate dates
        start_date = date.today()
        if subscription_data.billing_cycle == "yearly":
            end_date = start_date + timedelta(days=365)
        else:
            end_date = start_date + timedelta(days=30)
        
        # Free plan - no payment needed
        if amount == 0:
            subscription = UserSubscription(
                user_id=current_user.id,
                plan_id=plan.id,
                status="active",
                billing_cycle=subscription_data.billing_cycle,
                start_date=start_date,
                end_date=end_date,
                amount_paid=0.0
            )
            db.add(subscription)
            db.commit()
            db.refresh(subscription)
            
            return UserSubscriptionResponse(
                id=subscription.id,
                user_id=subscription.user_id,
                plan_id=subscription.plan_id,
                plan_name=plan.name,
                status=subscription.status,
                billing_cycle=subscription.billing_cycle,
                start_date=subscription.start_date,
                end_date=subscription.end_date,
                trial_end_date=subscription.trial_end_date,
                auto_renew=subscription.auto_renew,
                created_at=subscription.created_at
            )
        
        # Paid plan - create payment record
        payment = Payment(
            user_id=current_user.id,
            amount=amount,
            currency=plan.currency,
            payment_method=subscription_data.payment_method,
            payment_provider=subscription_data.payment_provider,
            status="pending",
            description=f"Subscription to {plan.name} plan"
        )
        db.add(payment)
        db.flush()
        
        # Create subscription (will be activated after payment confirmation)
        subscription = UserSubscription(
            user_id=current_user.id,
            plan_id=plan.id,
            status="pending",
            billing_cycle=subscription_data.billing_cycle,
            start_date=start_date,
            end_date=end_date,
            payment_reference=payment.id,
            amount_paid=amount
        )
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
        
        logger.info(f"Subscription created: {subscription.id} for user {current_user.id}")
        
        return UserSubscriptionResponse(
            id=subscription.id,
            user_id=subscription.user_id,
            plan_id=subscription.plan_id,
            plan_name=plan.name,
            status=subscription.status,
            billing_cycle=subscription.billing_cycle,
            start_date=subscription.start_date,
            end_date=subscription.end_date,
            trial_end_date=subscription.trial_end_date,
            auto_renew=subscription.auto_renew,
            created_at=subscription.created_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create subscription"
        )


@router.get("/current", response_model=Optional[UserSubscriptionResponse])
async def get_current_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current active subscription for user"""
    try:
        subscription = db.query(UserSubscription).filter(
            UserSubscription.user_id == current_user.id,
            UserSubscription.status == "active"
        ).first()
        
        if not subscription:
            return None
        
        plan = db.query(SubscriptionPlan).filter(
            SubscriptionPlan.id == subscription.plan_id
        ).first()
        
        return UserSubscriptionResponse(
            id=subscription.id,
            user_id=subscription.user_id,
            plan_id=subscription.plan_id,
            plan_name=plan.name if plan else None,
            status=subscription.status,
            billing_cycle=subscription.billing_cycle,
            start_date=subscription.start_date,
            end_date=subscription.end_date,
            trial_end_date=subscription.trial_end_date,
            auto_renew=subscription.auto_renew,
            created_at=subscription.created_at
        )
        
    except Exception as e:
        logger.error(f"Error fetching current subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch current subscription"
        )


@router.put("/cancel")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel current subscription"""
    try:
        subscription = db.query(UserSubscription).filter(
            UserSubscription.user_id == current_user.id,
            UserSubscription.status == "active"
        ).first()
        
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active subscription found"
            )
        
        subscription.status = "cancelled"
        subscription.auto_renew = False
        subscription.cancelled_at = datetime.utcnow()
        db.commit()
        
        return {"message": "Subscription cancelled successfully", "subscription_id": subscription.id}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error cancelling subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel subscription"
        )


@router.post("/payment", response_model=PaymentResponse)
async def create_payment(
    payment_data: PaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a payment record (for subscription or other services)"""
    try:
        payment = Payment(
            user_id=current_user.id,
            amount=payment_data.amount,
            currency=payment_data.currency,
            payment_method=payment_data.payment_method,
            payment_provider=payment_data.payment_provider,
            status="pending",
            description=payment_data.description
        )
        
        db.add(payment)
        db.commit()
        db.refresh(payment)
        
        logger.info(f"Payment created: {payment.id} for user {current_user.id}")
        return payment
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating payment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create payment"
        )


@router.put("/payment/{payment_id}/confirm")
async def confirm_payment(
    payment_id: str,
    transaction_reference: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Confirm payment completion (called by payment provider webhook)"""
    try:
        payment = db.query(Payment).filter(
            Payment.id == payment_id,
            Payment.user_id == current_user.id
        ).first()
        
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        
        payment.status = "completed"
        payment.transaction_reference = transaction_reference
        db.commit()
        
        # Activate subscription if payment was for subscription
        if payment.subscription_id:
            subscription = db.query(UserSubscription).filter(
                UserSubscription.id == payment.subscription_id
            ).first()
            if subscription:
                subscription.status = "active"
                db.commit()
        
        return {"message": "Payment confirmed", "payment_id": payment_id}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error confirming payment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to confirm payment"
        )


@router.get("/payment/history")
async def get_payment_history(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get payment history for user"""
    try:
        payments = db.query(Payment).filter(
            Payment.user_id == current_user.id
        ).order_by(Payment.created_at.desc()).limit(limit).all()
        
        return {"payments": payments, "total": len(payments)}
        
    except Exception as e:
        logger.error(f"Error fetching payment history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch payment history"
        )

