import numpy as np
import logging
from typing import Dict, List, Tuple
from app.ml.model_loader import get_model_loader
from app.schemas.prediction import PredictionRequest, PredictionResponse
from datetime import datetime

logger = logging.getLogger(__name__)


class RiskPredictor:
    """Handles risk prediction using trained ML model"""
    
    # Medical reference ranges for risk factor detection
    NORMAL_RANGES = {
        "systolic_bp": (90, 120),
        "diastolic_bp": (60, 80),
        "blood_sugar": (70, 100),
        "body_temp": (36.5, 37.5),
        "bmi": (18.5, 24.9),
        "heart_rate": (60, 100),
    }
    
    # Risk factor thresholds
    RISK_THRESHOLDS = {
        "high": 0.7,
        "medium": 0.4,
        "low": 0.0,
    }
    
    def __init__(self):
        self.model_loader = get_model_loader()
    
    def predict(self, request: PredictionRequest) -> PredictionResponse:
        """Make risk prediction for a patient"""
        try:
            # Prepare features
            features = self._prepare_features(request)
            
            # Get prediction from model
            prediction_proba = self.model_loader.model.predict_proba([features])[0]
            prediction = self.model_loader.model.predict([features])[0]
            
            # Decode prediction
            risk_level = self.model_loader.label_encoder.inverse_transform([prediction])[0]
            risk_score = float(max(prediction_proba))
            
            # Detect risk factors
            risk_factors = self._detect_risk_factors(request)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(risk_level, risk_factors)
            
            # Calculate confidence
            confidence = float(max(prediction_proba))
            
            return PredictionResponse(
                risk_level=risk_level,
                risk_score=risk_score,
                confidence=confidence,
                risk_factors=risk_factors,
                recommendations=recommendations,
                predicted_at=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error(f"Error during prediction: {e}")
            raise
    
    def _prepare_features(self, request: PredictionRequest) -> np.ndarray:
        """Prepare features in the correct order for the model"""
        features = [
            request.age,
            request.systolic_bp,
            request.diastolic_bp,
            request.blood_sugar,
            request.body_temp,
            request.bmi,
            request.previous_complications,
            request.preexisting_diabetes,
            request.gestational_diabetes,
            request.mental_health,
            request.heart_rate,
        ]
        return np.array(features).reshape(1, -1)
    
    def _detect_risk_factors(self, request: PredictionRequest) -> List[str]:
        """Detect individual risk factors based on medical thresholds"""
        risk_factors = []
        
        # Blood pressure check
        if request.systolic_bp > 140 or request.diastolic_bp > 90:
            risk_factors.append("High Blood Pressure (Hypertension)")
        
        # Blood sugar check
        if request.blood_sugar > 126:
            risk_factors.append("High Blood Sugar (Hyperglycemia)")
        
        # BMI check
        if request.bmi > 30:
            risk_factors.append("Obesity (BMI > 30)")
        elif request.bmi < 18.5:
            risk_factors.append("Underweight (BMI < 18.5)")
        
        # Heart rate check
        if request.heart_rate > 100:
            risk_factors.append("Elevated Heart Rate (Tachycardia)")
        elif request.heart_rate < 60:
            risk_factors.append("Low Heart Rate (Bradycardia)")
        
        # Medical history
        if request.preexisting_diabetes:
            risk_factors.append("Preexisting Diabetes")
        
        if request.gestational_diabetes:
            risk_factors.append("Gestational Diabetes")
        
        if request.previous_complications:
            risk_factors.append("Previous Pregnancy Complications")
        
        if request.mental_health:
            risk_factors.append("Mental Health Concerns")
        
        return risk_factors
    
    def _generate_recommendations(self, risk_level: str, risk_factors: List[str]) -> List[str]:
        """Generate clinical recommendations based on risk level and factors"""
        recommendations = []
        
        if risk_level == "High":
            recommendations.append("Immediate medical consultation required")
            recommendations.append("Schedule urgent appointment with healthcare provider")
            recommendations.append("Monitor vital signs daily")
            recommendations.append("Consider hospitalization for close monitoring")
        
        elif risk_level == "Medium":
            recommendations.append("Schedule appointment with healthcare provider within 1 week")
            recommendations.append("Monitor vital signs regularly (2-3 times per week)")
            recommendations.append("Maintain healthy diet and exercise routine")
            recommendations.append("Reduce stress and get adequate rest")
        
        else:  # Low risk
            recommendations.append("Continue regular prenatal checkups")
            recommendations.append("Maintain healthy lifestyle habits")
            recommendations.append("Monitor vital signs weekly")
            recommendations.append("Report any unusual symptoms immediately")
        
        # Add specific recommendations based on risk factors
        if "High Blood Pressure" in risk_factors:
            recommendations.append("Reduce sodium intake and manage stress")
        
        if "High Blood Sugar" in risk_factors:
            recommendations.append("Monitor carbohydrate intake and consult nutritionist")
        
        if "Obesity" in risk_factors:
            recommendations.append("Consult with healthcare provider about safe exercise")
        
        if "Preexisting Diabetes" in risk_factors or "Gestational Diabetes" in risk_factors:
            recommendations.append("Regular blood sugar monitoring and insulin management")
        
        return recommendations
