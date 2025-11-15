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
        """Make risk prediction for a patient - MUST use ML model"""
        # Check if model is ready - if not, raise error (no fallback)
        if not self.model_loader.is_ready():
            error_msg = "ML model not loaded. Please ensure model files exist in ai-development/ml-model/models/"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        
        # Prepare features
        features = self._prepare_features(request)
        logger.info(f"Prepared features shape: {features.shape}")
            
        # Get prediction from model - MUST succeed
        try:
            logger.info("Calling model.predict_proba and model.predict...")
            prediction_proba = self.model_loader.model.predict_proba(features)[0]
            prediction = self.model_loader.model.predict(features)[0]
            logger.info(f"Model prediction (encoded): {prediction}, probabilities: {prediction_proba}")
            
            # Decode prediction
            logger.info("Decoding prediction with label encoder...")
            risk_level = self.model_loader.label_encoder.inverse_transform([prediction])[0]
            
            # For BINARY classification: ['High', 'Low']
            # Risk score = probability of HIGH class (regardless of prediction)
            # This makes sense: P(High) = 0.85 means 85% risk score
            classes = self.model_loader.label_encoder.classes_
            logger.info(f"Model classes: {classes}, Class indices: {dict(enumerate(classes))}")
            logger.info(f"Prediction index: {prediction}, Prediction probabilities: {prediction_proba}")
            
            if len(classes) == 2:
                # Binary classification - find High class index
                # Classes are ['High', 'Low'], so index 0 = High, index 1 = Low
                # prediction_proba[0] = P(High), prediction_proba[1] = P(Low)
                high_class_idx = None
                for idx, cls in enumerate(classes):
                    if 'high' in str(cls).lower():
                        high_class_idx = idx
                        break
                
                if high_class_idx is not None:
                    # Risk score = probability of High class
                    risk_score = float(prediction_proba[high_class_idx])
                    logger.info(f"✓ Binary classification detected: {classes}")
                    logger.info(f"✓ High class index: {high_class_idx} (class: '{classes[high_class_idx]}')")
                    logger.info(f"✓ Using P(High) = prediction_proba[{high_class_idx}] = {risk_score}")
                    logger.info(f"✓ P(Low) = prediction_proba[{1-high_class_idx}] = {prediction_proba[1-high_class_idx]}")
                else:
                    # Fallback: use max probability
                    risk_score = float(max(prediction_proba))
                    logger.warning(f"Could not find 'High' class, using max probability: {risk_score}")
            else:
                # Multi-class: use probability of predicted class or max
                risk_score = float(prediction_proba[prediction])
                logger.info(f"Multi-class classification ({len(classes)} classes), using predicted class probability")
            
            # Ensure it's between 0 and 1 (in case model outputs percentages)
            if risk_score > 1.0:
                risk_score = risk_score / 100.0
            # Clamp to valid range [0, 1]
            risk_score = max(0.0, min(1.0, risk_score))
            logger.info(f"Decoded risk level: '{risk_level}', risk score (P(High)): {risk_score}, probabilities: {dict(zip(classes, prediction_proba))}, predicted class: {prediction}")
        except Exception as model_error:
            logger.error(f"ML model prediction failed: {model_error}", exc_info=True)
            logger.error(f"Features shape: {features.shape}, dtype: {features.dtype}")
            logger.error(f"Model type: {type(self.model_loader.model)}")
            raise RuntimeError(f"ML model prediction failed: {str(model_error)}")
        
        # CLASSIFY INTO 3-TIER SYSTEM: Low, Medium, High
        # Based on P(High) from binary classification model:
        # - Low: P(High) < 0.4 (model confident it's Low risk)
        # - Medium: 0.4 <= P(High) < 0.7 (uncertain, moderate risk)
        # - High: P(High) >= 0.7 (model confident it's High risk)
        risk_score_percentage = risk_score * 100
        if risk_score_percentage < 40:
            classified_risk_level = "Low"
        elif risk_score_percentage < 70:
            classified_risk_level = "Medium"
        else:
            classified_risk_level = "High"
        
        logger.info(f"3-Tier Classification: P(High)={risk_score_percentage:.2f}% → {classified_risk_level} Risk")
        logger.info(f"Original binary prediction: {risk_level}, Classified: {classified_risk_level}")
        
        # Detect risk factors
        risk_factors = self._detect_risk_factors(request)
        
        # Generate recommendations based on classified risk level
        recommendations = self._generate_recommendations(classified_risk_level, risk_factors)
        
        # Calculate confidence
        confidence = float(max(prediction_proba))
        
        # Use classified risk level for display
        risk_level_capitalized = classified_risk_level
        
        logger.info(f"Final prediction - Risk: {risk_level_capitalized}, Score: {risk_score_percentage:.2f}%")
        
        # Return risk score as percentage (0-100)
        # Note: P(High) can be very high (99%+) but we keep the actual value
        # Frontend will handle display formatting to avoid misleading 100%
        final_risk_score = risk_score * 100
        
        return PredictionResponse(
            risk_level=risk_level_capitalized,
            overall_risk=risk_level_capitalized,  # Alias for frontend compatibility
            risk_score=final_risk_score,  # P(High) as percentage (0-100)
            confidence=confidence,
            risk_factors=risk_factors,
            recommendations=recommendations,
            predicted_at=datetime.utcnow(),
            specialized_assessments=None  # Will be added by API endpoint
        )
    
    def _prepare_features(self, request: PredictionRequest) -> np.ndarray:
        """Prepare features in the correct order for the model - MUST match training order"""
        # Get base values
        age = float(request.age or 28)
        systolic_bp = float(request.systolic_bp or 120)
        diastolic_bp = float(request.diastolic_bp or 80)
        blood_sugar = float(request.blood_sugar or 90.0)
        body_temp = float(request.body_temp or 37.0)
        bmi = float(request.bmi or 25.0)
        previous_complications = int(request.previous_complications or 0)
        preexisting_diabetes = int(request.preexisting_diabetes or 0)
        gestational_diabetes = int(request.gestational_diabetes or 0)
        mental_health = int(request.mental_health or 0)
        heart_rate = int(request.heart_rate or 75)
        
        # Calculate derived features (matching the notebook)
        # MAP (Mean Arterial Pressure)
        MAP = (2 * diastolic_bp + systolic_bp) / 3.0
        
        # Pulse Pressure
        Pulse_Pressure = systolic_bp - diastolic_bp
        
        # Has_Hypertension (systolic >= 140 or diastolic >= 90)
        Has_Hypertension = 1 if (systolic_bp >= 140 or diastolic_bp >= 90) else 0
        
        # Has_Diabetes (from notebook: bs >= 7.0)
        # The notebook uses: df['Has_Diabetes'] = (df['bs'] >= 7.0).astype(int)
        # Note: blood sugar in notebook is in mmol/L, but we might have mg/dL
        # If blood_sugar > 126 (mg/dL), that's > 7.0 mmol/L
        # For now, use >= 7.0 if value is low (mmol/L) or >= 126 if high (mg/dL)
        # Most likely our values are in mg/dL, so use >= 126
        Has_Diabetes = 1 if (blood_sugar >= 126.0) else 0  # 126 mg/dL = 7.0 mmol/L
        
        # Has_Fever (body temp > 37.5)
        Has_Fever = 1 if body_temp > 37.5 else 0
        
        # Has_Tachycardia (heart rate > 100)
        Has_Tachycardia = 1 if heart_rate > 100 else 0
        
        # Risk_Factor_Count (from notebook: Has_Hypertension + Has_Diabetes + Has_Tachycardia)
        # The notebook uses: df['Risk_Factor_Count'] = df['Has_Hypertension'] + df['Has_Diabetes'] + df['Has_Tachycardia']
        Risk_Factor_Count = Has_Hypertension + Has_Diabetes + Has_Tachycardia
        
        # Age_Risk (age < 20 or age > 35)
        Age_Risk = 1 if (age < 20 or age > 35) else 0
        
        # BMI_Risk (BMI < 18.5 or BMI > 30)
        BMI_Risk = 1 if (bmi < 18.5 or bmi > 30) else 0
        
        # Prepare features in EXACT order as model was trained
        # Order: age, systolic_bp, diastolic, bs, body_temp, bmi, previous_complications,
        #        preexisting_diabetes, gestational_diabetes, mental_health, heart_rate,
        #        MAP, Pulse_Pressure, Has_Hypertension, Has_Diabetes, Has_Fever,
        #        Has_Tachycardia, Risk_Factor_Count, Age_Risk, BMI_Risk
        features = [
            age,                           # 0: age
            systolic_bp,                   # 1: systolic_bp
            diastolic_bp,                  # 2: diastolic
            blood_sugar,                   # 3: bs
            body_temp,                     # 4: body_temp
            bmi,                           # 5: bmi
            float(previous_complications), # 6: previous_complications
            float(preexisting_diabetes),   # 7: preexisting_diabetes
            float(gestational_diabetes),    # 8: gestational_diabetes
            float(mental_health),          # 9: mental_health
            float(heart_rate),             # 10: heart_rate
            MAP,                           # 11: MAP
            Pulse_Pressure,                # 12: Pulse_Pressure
            float(Has_Hypertension),      # 13: Has_Hypertension
            float(Has_Diabetes),           # 14: Has_Diabetes
            float(Has_Fever),              # 15: Has_Fever
            float(Has_Tachycardia),        # 16: Has_Tachycardia
            float(Risk_Factor_Count),      # 17: Risk_Factor_Count
            float(Age_Risk),               # 18: Age_Risk
            float(BMI_Risk),               # 19: BMI_Risk
        ]
        
        logger.info(f"Prepared {len(features)} features (model expects 20)")
        logger.debug(f"Features: {features}")
        
        # Convert to float array
        features_array = np.array(features, dtype=float).reshape(1, -1)
        logger.info(f"Features array shape: {features_array.shape}, dtype: {features_array.dtype}")
        
        # Validate feature count
        if features_array.shape[1] != 20:
            raise RuntimeError(f"Feature count mismatch! Expected 20, got {features_array.shape[1]}")
        
        # Scale features using the trained scaler - REQUIRED
        if self.model_loader._scaler is None:
            raise RuntimeError("Scaler not loaded. Cannot prepare features for ML model.")
        
        try:
            features_array = self.model_loader.scaler.transform(features_array)
            logger.info(f"Scaled features shape: {features_array.shape}")
        except Exception as e:
            logger.error(f"Error scaling features: {e}", exc_info=True)
            raise RuntimeError(f"Failed to scale features for ML model: {str(e)}")
        
        return features_array
    
    def _detect_risk_factors(self, request: PredictionRequest) -> List[str]:
        """Detect individual risk factors based on medical thresholds"""
        risk_factors = []
        
        # Blood pressure check (handle None values)
        systolic = request.systolic_bp or 120
        diastolic = request.diastolic_bp or 80
        if systolic > 140 or diastolic > 90:
            risk_factors.append("High Blood Pressure (Hypertension)")
        
        # Blood sugar check
        blood_sugar = request.blood_sugar or 90.0
        if blood_sugar > 126:
            risk_factors.append("High Blood Sugar (Hyperglycemia)")
        
        # BMI check
        bmi = request.bmi or 25.0
        if bmi > 30:
            risk_factors.append("Obesity (BMI > 30)")
        elif bmi < 18.5:
            risk_factors.append("Underweight (BMI < 18.5)")
        
        # Heart rate check
        heart_rate = request.heart_rate or 75
        if heart_rate > 100:
            risk_factors.append("Elevated Heart Rate (Tachycardia)")
        elif heart_rate < 60:
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
    
    def _fallback_prediction(self, request: PredictionRequest) -> PredictionResponse:
        """Fallback rule-based prediction when ML model is not available"""
        risk_factors = self._detect_risk_factors(request)
        
        # Calculate risk score based on risk factors
        risk_score = 0.0
        
        # High blood pressure
        if request.systolic_bp and request.systolic_bp > 140:
            risk_score += 0.3
        if request.diastolic_bp and request.diastolic_bp > 90:
            risk_score += 0.2
        
        # High blood sugar
        if request.blood_sugar and request.blood_sugar > 126:
            risk_score += 0.25
        
        # BMI issues
        if request.bmi:
            if request.bmi > 30:
                risk_score += 0.15
            elif request.bmi < 18.5:
                risk_score += 0.1
        
        # Heart rate issues
        if request.heart_rate:
            if request.heart_rate > 100 or request.heart_rate < 60:
                risk_score += 0.1
        
        # Medical history
        if request.preexisting_diabetes:
            risk_score += 0.2
        if request.gestational_diabetes:
            risk_score += 0.2
        if request.previous_complications:
            risk_score += 0.15
        if request.mental_health:
            risk_score += 0.1
        
        # Determine risk level
        if risk_score >= 0.7:
            risk_level = "High"
        elif risk_score >= 0.4:
            risk_level = "Medium"
        else:
            risk_level = "Low"
        
        # Generate recommendations
        recommendations = self._generate_recommendations(risk_level, risk_factors)
        
        return PredictionResponse(
            risk_level=risk_level,
            overall_risk=risk_level,
            risk_score=risk_score * 100,  # Convert to percentage
            confidence=0.75,  # Lower confidence for fallback
            risk_factors=risk_factors,
            recommendations=recommendations,
            predicted_at=datetime.utcnow(),
            specialized_assessments=None
        )
    
    def _generate_recommendations(self, risk_level: str, risk_factors: List[str]) -> List[str]:
        """Generate clinical recommendations based on risk level and factors"""
        recommendations = []
        
        risk_level_lower = risk_level.lower() if risk_level else "low"
        
        if "high" in risk_level_lower:
            recommendations.append("Immediate medical consultation required")
            recommendations.append("Schedule urgent appointment with healthcare provider")
            recommendations.append("Monitor vital signs daily")
            recommendations.append("Consider hospitalization for close monitoring")
        
        elif "medium" in risk_level_lower:
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
