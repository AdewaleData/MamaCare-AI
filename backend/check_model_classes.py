"""Check what classes the model actually has"""
import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.ml.model_loader import get_model_loader

try:
    model_loader = get_model_loader()
    
    print("="*60)
    print("MODEL CLASSES INFORMATION")
    print("="*60)
    
    # Check label encoder classes
    if model_loader.label_encoder:
        classes = model_loader.label_encoder.classes_
        print(f"\nLabel Encoder Classes: {classes}")
        print(f"Number of classes: {len(classes)}")
        print(f"Class indices: {dict(enumerate(classes))}")
        
        # Test prediction to see probabilities
        import numpy as np
        from app.schemas.prediction import PredictionRequest
        
        # Create a test request
        test_request = PredictionRequest(
            pregnancy_id="test",
            age=28,
            systolic_bp=160,
            diastolic_bp=110,
            blood_sugar=180,
            body_temp=38.0,
            heart_rate=120,
            bmi=35.0,
            previous_complications=1,
            preexisting_diabetes=1,
            gestational_diabetes=0,
            mental_health=0
        )
        
        from app.ml.predictor import RiskPredictor
        predictor = RiskPredictor()
        
        # Get raw model output
        features = predictor._prepare_features(test_request)
        prediction = model_loader.model.predict(features)[0]
        prediction_proba = model_loader.model.predict_proba(features)[0]
        
        print(f"\nTest Prediction:")
        print(f"  Predicted class index: {prediction}")
        print(f"  Predicted class label: {classes[prediction]}")
        print(f"  Probabilities: {dict(zip(classes, prediction_proba))}")
        print(f"  Max probability: {max(prediction_proba):.4f}")
        
        # Determine if binary or multi-class
        if len(classes) == 2:
            print(f"\n✓ BINARY CLASSIFICATION")
            print(f"  Classes: {classes[0]} vs {classes[1]}")
            if 'high' in str(classes).lower():
                high_idx = list(classes).index([c for c in classes if 'high' in str(c).lower()][0])
                print(f"  High risk probability: {prediction_proba[high_idx]:.4f} ({prediction_proba[high_idx]*100:.2f}%)")
        else:
            print(f"\n✓ MULTI-CLASS CLASSIFICATION")
            print(f"  Classes: {', '.join(classes)}")
            
    else:
        print("ERROR: Label encoder not loaded!")
        
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()

