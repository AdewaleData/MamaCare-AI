from sqlalchemy import Column, String, DateTime, ForeignKey, Float, Boolean, Integer, Date
from sqlalchemy.orm import relationship
from datetime import datetime, date
import uuid
from app.database import Base


class SubscriptionPlan(Base):
    """Subscription plan definitions"""
    __tablename__ = "subscription_plans"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    name = Column(String(100), nullable=False)  # Basic, Premium, Family
    description = Column(String(500), nullable=True)
    price_monthly = Column(Float, nullable=False)
    price_yearly = Column(Float, nullable=True)
    currency = Column(String(10), default="NGN")
    
    # Features
    max_pregnancies = Column(Integer, default=1)
    max_health_records = Column(Integer, nullable=True)  # null = unlimited
    has_ai_predictions = Column(Boolean, default=True)
    has_emergency_features = Column(Boolean, default=True)
    has_telemedicine = Column(Boolean, default=False)
    has_priority_support = Column(Boolean, default=False)
    has_advanced_analytics = Column(Boolean, default=False)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<SubscriptionPlan {self.name}>"


class UserSubscription(Base):
    """User subscription records"""
    __tablename__ = "user_subscriptions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    plan_id = Column(String(36), ForeignKey("subscription_plans.id", ondelete="SET NULL"), nullable=True)
    
    # Subscription details
    status = Column(String(20), default="active")  # active, cancelled, expired, trial
    billing_cycle = Column(String(20), default="monthly")  # monthly, yearly
    start_date = Column(Date, default=date.today)
    end_date = Column(Date, nullable=True)
    trial_end_date = Column(Date, nullable=True)
    
    # Payment information
    amount_paid = Column(Float, nullable=True)
    payment_method = Column(String(50), nullable=True)
    payment_reference = Column(String(255), nullable=True)
    
    # Auto-renewal
    auto_renew = Column(Boolean, default=True)
    cancelled_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="subscriptions")
    plan = relationship("SubscriptionPlan", backref="user_subscriptions")
    
    def __repr__(self):
        return f"<UserSubscription {self.user_id} - {self.status}>"


class Payment(Base):
    """Payment transaction records"""
    __tablename__ = "payments"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subscription_id = Column(String(36), ForeignKey("user_subscriptions.id", ondelete="SET NULL"), nullable=True)
    
    # Payment details
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="NGN")
    payment_method = Column(String(50), nullable=False)  # card, bank_transfer, mobile_money
    payment_provider = Column(String(50), nullable=True)  # paystack, flutterwave, stripe
    
    # Transaction tracking
    status = Column(String(20), default="pending")  # pending, completed, failed, refunded
    transaction_reference = Column(String(255), nullable=True, unique=True)
    provider_reference = Column(String(255), nullable=True)
    
    # Metadata
    description = Column(String(500), nullable=True)
    payment_metadata = Column(String(1000), nullable=True)  # JSON string (renamed from 'metadata' - reserved name)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="payments")
    subscription = relationship("UserSubscription", backref="payments")
    
    def __repr__(self):
        return f"<Payment {self.transaction_reference} - {self.status}>"

