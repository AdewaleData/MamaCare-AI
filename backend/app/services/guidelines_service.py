"""
Nigerian Clinical Guidelines Service
Loads and applies Nigerian clinical guidelines for risk assessment and recommendations
"""
import json
import os
from typing import Dict, Any, Optional, Tuple
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class GuidelinesService:
    """Service for loading and applying Nigerian clinical guidelines"""
    
    def __init__(self):
        self.guidelines: Optional[Dict[str, Any]] = None
        self._load_guidelines()
    
    def _load_guidelines(self):
        """Load guidelines from JSON configuration file"""
        try:
            # Get the path to the config directory
            current_dir = Path(__file__).parent.parent
            config_path = current_dir / "config" / "nigerian_guidelines.json"
            
            if not config_path.exists():
                logger.warning(f"Guidelines file not found at {config_path}. Using default values.")
                self.guidelines = self._get_default_guidelines()
                return
            
            with open(config_path, 'r', encoding='utf-8') as f:
                self.guidelines = json.load(f)
            
            logger.info(f"Loaded Nigerian clinical guidelines version {self.guidelines.get('version', 'unknown')}")
            
        except Exception as e:
            logger.error(f"Error loading guidelines: {e}. Using default values.")
            self.guidelines = self._get_default_guidelines()
    
    def _get_default_guidelines(self) -> Dict[str, Any]:
        """Return default guidelines if file cannot be loaded"""
        return {
            "version": "default",
            "normal_ranges": {
                "blood_pressure": {
                    "systolic": {"normal_min": 90, "normal_max": 120},
                    "diastolic": {"normal_min": 60, "normal_max": 80}
                },
                "blood_sugar": {
                    "fasting": {"normal_min": 70, "normal_max": 100}
                },
                "bmi": {"normal_min": 18.5, "normal_max": 24.9},
                "heart_rate": {"normal_min": 60, "normal_max": 100},
                "body_temperature": {"normal_min": 36.5, "normal_max": 37.5}
            },
            "risk_thresholds": {
                "pregnancy": {"low_max": 0.40, "medium_min": 0.40, "medium_max": 0.70, "high_min": 0.70}
            }
        }
    
    def get_normal_ranges(self) -> Dict[str, Any]:
        """Get normal ranges for all health metrics"""
        if not self.guidelines:
            return self._get_default_guidelines()["normal_ranges"]
        return self.guidelines.get("normal_ranges", {})
    
    def get_risk_thresholds(self) -> Dict[str, Any]:
        """Get risk thresholds for classification"""
        if not self.guidelines:
            return self._get_default_guidelines()["risk_thresholds"]
        return self.guidelines.get("risk_thresholds", {})
    
    def get_recommendations(self, risk_level: str) -> Dict[str, Any]:
        """Get recommendations for a given risk level"""
        if not self.guidelines:
            return {}
        
        risk_level_lower = risk_level.lower() if risk_level else "low"
        recommendations = self.guidelines.get("recommendations", {})
        
        if "high" in risk_level_lower:
            return recommendations.get("high_risk", {})
        elif "medium" in risk_level_lower:
            return recommendations.get("medium_risk", {})
        else:
            return recommendations.get("low_risk", {})
    
    def check_blood_pressure(self, systolic: float, diastolic: float) -> Tuple[str, Dict[str, Any]]:
        """
        Check blood pressure against Nigerian guidelines
        Returns: (status, details)
        """
        ranges = self.get_normal_ranges().get("blood_pressure", {})
        systolic_ranges = ranges.get("systolic", {})
        diastolic_ranges = ranges.get("diastolic", {})
        
        # Check for hypertension (Nigerian guidelines: ≥140/90)
        if systolic >= 140 or diastolic >= 90:
            severity = "severe" if (systolic >= 160 or diastolic >= 110) else "moderate"
            return "hypertension", {
                "severity": severity,
                "systolic": systolic,
                "diastolic": diastolic,
                "threshold_systolic": 140,
                "threshold_diastolic": 90,
                "recommendation": "Seek immediate medical consultation"
            }
        
        # Check for elevated
        if systolic >= 130 or diastolic >= 85:
            return "elevated", {
                "systolic": systolic,
                "diastolic": diastolic,
                "recommendation": "Monitor regularly and consult healthcare provider"
            }
        
        # Normal
        return "normal", {
            "systolic": systolic,
            "diastolic": diastolic,
            "recommendation": "Continue monitoring"
        }
    
    def check_blood_sugar(self, blood_sugar: float, is_fasting: bool = True) -> Tuple[str, Dict[str, Any]]:
        """
        Check blood sugar against Nigerian guidelines
        Returns: (status, details)
        """
        ranges = self.get_normal_ranges().get("blood_sugar", {})
        
        if is_fasting:
            fasting_ranges = ranges.get("fasting", {})
            normal_max = fasting_ranges.get("normal_max", 100)
            diabetes_min = fasting_ranges.get("diabetes_min", 126)
            
            if blood_sugar >= diabetes_min:
                return "diabetes", {
                    "value": blood_sugar,
                    "threshold": diabetes_min,
                    "recommendation": "Immediate medical consultation required"
                }
            elif blood_sugar >= normal_max:
                return "prediabetes", {
                    "value": blood_sugar,
                    "threshold": normal_max,
                    "recommendation": "Monitor and consult healthcare provider"
                }
            else:
                return "normal", {
                    "value": blood_sugar,
                    "recommendation": "Continue monitoring"
                }
        else:
            # Random or postprandial
            random_ranges = ranges.get("random", {})
            normal_max = random_ranges.get("normal_max", 140)
            diabetes_min = random_ranges.get("diabetes_min", 200)
            
            if blood_sugar >= diabetes_min:
                return "diabetes", {
                    "value": blood_sugar,
                    "threshold": diabetes_min,
                    "recommendation": "Immediate medical consultation required"
                }
            elif blood_sugar > normal_max:
                return "elevated", {
                    "value": blood_sugar,
                    "threshold": normal_max,
                    "recommendation": "Monitor and consult healthcare provider"
                }
            else:
                return "normal", {
                    "value": blood_sugar,
                    "recommendation": "Continue monitoring"
                }
    
    def check_bmi(self, bmi: float) -> Tuple[str, Dict[str, Any]]:
        """
        Check BMI against Nigerian guidelines
        Returns: (status, details)
        """
        ranges = self.get_normal_ranges().get("bmi", {})
        underweight_max = ranges.get("underweight_max", 18.5)
        normal_max = ranges.get("normal_max", 24.9)
        overweight_max = ranges.get("overweight_max", 29.9)
        obese_min = ranges.get("obese_min", 30.0)
        
        if bmi < underweight_max:
            return "underweight", {
                "bmi": bmi,
                "threshold": underweight_max,
                "recommendation": "Consult healthcare provider about healthy weight gain"
            }
        elif bmi >= obese_min:
            return "obese", {
                "bmi": bmi,
                "threshold": obese_min,
                "recommendation": "Consult healthcare provider about weight management"
            }
        elif bmi >= normal_max:
            return "overweight", {
                "bmi": bmi,
                "threshold": normal_max,
                "recommendation": "Monitor weight and maintain healthy diet"
            }
        else:
            return "normal", {
                "bmi": bmi,
                "recommendation": "Maintain healthy lifestyle"
            }
    
    def get_guideline_reference(self) -> str:
        """Get reference to the guidelines source"""
        if not self.guidelines:
            return "Default clinical guidelines"
        return self.guidelines.get("source", "Nigerian Clinical Guidelines")
    
    def get_version(self) -> str:
        """Get guidelines version"""
        if not self.guidelines:
            return "default"
        return self.guidelines.get("version", "unknown")


# Singleton instance
_guidelines_service: Optional[GuidelinesService] = None


def get_guidelines_service() -> GuidelinesService:
    """Get singleton instance of GuidelinesService"""
    global _guidelines_service
    if _guidelines_service is None:
        _guidelines_service = GuidelinesService()
    return _guidelines_service

