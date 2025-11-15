import numpy as np
import logging
from typing import Dict, List, Tuple, Optional
from datetime import datetime
from app.ml.model_loader import get_model_loader
from app.schemas.prediction import PredictionRequest

logger = logging.getLogger(__name__)


class SpecializedPredictor:
    """Specialized predictors for specific pregnancy complications"""
    
    def __init__(self):
        self.model_loader = get_model_loader()
    
    def predict_preeclampsia(self, request: PredictionRequest) -> Dict:
        """
        Predict preeclampsia risk with specialized algorithm
        
        Preeclampsia indicators:
        - High blood pressure (systolic > 140 or diastolic > 90)
        - Protein in urine (not available in current data)
        - High BMI
        - Age factors
        - Previous complications
        """
        risk_factors = []
        risk_score = 0.0
        
        # Blood pressure check (primary indicator)
        if request.systolic_bp >= 140 or request.diastolic_bp >= 90:
            risk_factors.append("Elevated Blood Pressure")
            risk_score += 0.4
        
        # Severe hypertension
        if request.systolic_bp >= 160 or request.diastolic_bp >= 110:
            risk_factors.append("Severe Hypertension")
            risk_score += 0.3
        
        # BMI factors
        if request.bmi >= 30:
            risk_factors.append("Obesity (BMI ≥ 30)")
            risk_score += 0.15
        
        # Age factors
        if request.age < 20 or request.age > 35:
            risk_factors.append("Age Risk Factor")
            risk_score += 0.1
        
        # Previous complications
        if request.previous_complications:
            risk_factors.append("Previous Pregnancy Complications")
            risk_score += 0.2
        
        # Diabetes
        if request.preexisting_diabetes or request.gestational_diabetes:
            risk_factors.append("Diabetes")
            risk_score += 0.15
        
        # Determine risk level
        if risk_score >= 0.7:
            risk_level = "High"
        elif risk_score >= 0.4:
            risk_level = "Medium"
        else:
            risk_level = "Low"
        
        # Generate recommendations
        recommendations = []
        if risk_level == "High":
            recommendations.append("Immediate medical consultation required - possible preeclampsia")
            recommendations.append("Monitor blood pressure every 4-6 hours")
            recommendations.append("Consider hospitalization for close monitoring")
            recommendations.append("Restrict sodium intake")
        elif risk_level == "Medium":
            recommendations.append("Schedule appointment with healthcare provider within 24-48 hours")
            recommendations.append("Monitor blood pressure daily")
            recommendations.append("Report any headaches, vision changes, or upper abdominal pain")
        else:
            recommendations.append("Continue regular prenatal care")
            recommendations.append("Monitor blood pressure weekly")
        
        return {
            "condition": "preeclampsia",
            "risk_level": risk_level,
            "risk_score": min(risk_score, 1.0),
            "risk_factors": risk_factors,
            "recommendations": recommendations,
            "confidence": 0.85,  # High confidence for preeclampsia prediction
            "predicted_at": datetime.utcnow()
        }
    
    def predict_preterm_labor(self, request: PredictionRequest, current_week: int) -> Dict:
        """
        Predict preterm labor risk
        
        Preterm labor indicators:
        - Previous preterm birth
        - Multiple pregnancies
        - Infections
        - High blood pressure
        - Age factors
        - Current pregnancy week
        """
        risk_factors = []
        risk_score = 0.0
        
        # Previous complications (especially preterm birth)
        if request.previous_complications:
            risk_factors.append("Previous Pregnancy Complications")
            risk_score += 0.3
        
        # High blood pressure
        if request.systolic_bp >= 140 or request.diastolic_bp >= 90:
            risk_factors.append("Hypertension")
            risk_score += 0.2
        
        # Age factors
        if request.age < 18 or request.age > 40:
            risk_factors.append("Age Risk Factor")
            risk_score += 0.15
        
        # BMI factors
        if request.bmi < 18.5 or request.bmi >= 30:
            risk_factors.append("BMI Risk Factor")
            risk_score += 0.1
        
        # Current week (earlier in pregnancy = higher risk)
        if current_week < 20:
            risk_factors.append("Early Pregnancy Stage")
            risk_score += 0.15
        
        # Diabetes
        if request.gestational_diabetes:
            risk_factors.append("Gestational Diabetes")
            risk_score += 0.15
        
        # Mental health stress
        if request.mental_health:
            risk_factors.append("Mental Health Concerns")
            risk_score += 0.1
        
        # Determine risk level
        if risk_score >= 0.6:
            risk_level = "High"
        elif risk_score >= 0.3:
            risk_level = "Medium"
        else:
            risk_level = "Low"
        
        # Generate recommendations
        recommendations = []
        if risk_level == "High":
            recommendations.append("Immediate medical consultation - preterm labor risk")
            recommendations.append("Monitor for signs of preterm labor (contractions, bleeding)")
            recommendations.append("Consider bed rest and reduced activity")
            recommendations.append("Avoid stress and heavy lifting")
        elif risk_level == "Medium":
            recommendations.append("Schedule appointment with healthcare provider")
            recommendations.append("Monitor for preterm labor signs")
            recommendations.append("Maintain regular prenatal care")
            recommendations.append("Manage stress levels")
        else:
            recommendations.append("Continue regular prenatal care")
            recommendations.append("Maintain healthy lifestyle")
            recommendations.append("Report any unusual symptoms immediately")
        
        return {
            "condition": "preterm_labor",
            "risk_level": risk_level,
            "risk_score": min(risk_score, 1.0),
            "risk_factors": risk_factors,
            "recommendations": recommendations,
            "confidence": 0.80,
            "predicted_at": datetime.utcnow(),
            "current_week": current_week
        }
    
    def predict_gestational_diabetes(self, request: PredictionRequest) -> Dict:
        """
        Predict gestational diabetes risk
        
        Indicators:
        - High blood sugar
        - BMI
        - Age
        - Family history (not available)
        - Previous gestational diabetes
        """
        risk_factors = []
        risk_score = 0.0
        
        # Blood sugar check
        if request.blood_sugar >= 126:
            risk_factors.append("Elevated Blood Sugar")
            risk_score += 0.4
        elif request.blood_sugar >= 100:
            risk_factors.append("Borderline Blood Sugar")
            risk_score += 0.2
        
        # Previous gestational diabetes
        if request.gestational_diabetes:
            risk_factors.append("Previous Gestational Diabetes")
            risk_score += 0.4
        
        # Preexisting diabetes
        if request.preexisting_diabetes:
            risk_factors.append("Preexisting Diabetes")
            risk_score += 0.5
        
        # BMI factors
        if request.bmi >= 30:
            risk_factors.append("Obesity (BMI ≥ 30)")
            risk_score += 0.2
        
        # Age factors
        if request.age >= 35:
            risk_factors.append("Advanced Maternal Age")
            risk_score += 0.15
        
        # Determine risk level
        if risk_score >= 0.6:
            risk_level = "High"
        elif risk_score >= 0.3:
            risk_level = "Medium"
        else:
            risk_level = "Low"
        
        # Generate recommendations
        recommendations = []
        if risk_level == "High":
            recommendations.append("Immediate glucose tolerance test recommended")
            recommendations.append("Consult with endocrinologist or diabetes specialist")
            recommendations.append("Monitor blood sugar levels regularly")
            recommendations.append("Follow diabetic diet plan")
        elif risk_level == "Medium":
            recommendations.append("Schedule glucose screening test")
            recommendations.append("Monitor carbohydrate intake")
            recommendations.append("Maintain healthy diet and exercise")
        else:
            recommendations.append("Continue regular prenatal care")
            recommendations.append("Maintain healthy diet")
            recommendations.append("Regular blood sugar monitoring")
        
        return {
            "condition": "gestational_diabetes",
            "risk_level": risk_level,
            "risk_score": min(risk_score, 1.0),
            "risk_factors": risk_factors,
            "recommendations": recommendations,
            "confidence": 0.82,
            "predicted_at": datetime.utcnow()
        }
    
    def get_comprehensive_assessment(self, request: PredictionRequest, current_week: int = 20) -> Dict:
        """Get comprehensive risk assessment for all conditions"""
        general_prediction = self.model_loader.predictor.predict(request)
        
        preeclampsia = self.predict_preeclampsia(request)
        preterm_labor = self.predict_preterm_labor(request, current_week)
        gestational_diabetes = self.predict_gestational_diabetes(request)
        
        # Overall risk (highest of all)
        all_risks = [
            general_prediction.risk_score,
            preeclampsia["risk_score"],
            preterm_labor["risk_score"],
            gestational_diabetes["risk_score"]
        ]
        overall_risk_score = max(all_risks)
        
        if overall_risk_score >= 0.7:
            overall_risk_level = "High"
        elif overall_risk_score >= 0.4:
            overall_risk_level = "Medium"
        else:
            overall_risk_level = "Low"
        
        return {
            "overall_risk": {
                "risk_level": overall_risk_level,
                "risk_score": overall_risk_score
            },
            "general_assessment": {
                "risk_level": general_prediction.risk_level,
                "risk_score": general_prediction.risk_score,
                "risk_factors": general_prediction.risk_factors,
                "recommendations": general_prediction.recommendations
            },
            "preeclampsia": preeclampsia,
            "preterm_labor": preterm_labor,
            "gestational_diabetes": gestational_diabetes,
            "assessed_at": datetime.utcnow()
        }

