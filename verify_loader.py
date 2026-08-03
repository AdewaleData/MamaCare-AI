"""Verify backend ModelLoader can load the new models."""
import sys
import os
from pathlib import Path

backend_dir = Path(r'c:\Users\555555\OneDrive\Desktop\MamaCare-AI\backend')
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
os.chdir(backend_dir)

print(f"cwd: {os.getcwd()}")

from app.ml.model_loader import ModelLoader, get_model_loader

try:
    loader = ModelLoader()
    print(f"is_ready: {loader.is_ready()}")
    print(f"model type: {type(loader.model).__name__}")
    print(f"scaler type: {type(loader.scaler).__name__}")
    print(f"label encoder classes: {loader.label_encoder.classes_}")
    print(f"feature names count: {len(loader.feature_names)}")
    print(f"feature names: {loader.feature_names}")

    # Quick prediction
    import numpy as np
    sample = np.random.randn(1, len(loader.feature_names))
    scaled = loader.scaler.transform(sample)
    pred_idx = loader.model.predict(scaled)[0]
    pred_label = loader.label_encoder.inverse_transform([pred_idx])[0]
    print(f"\nSample prediction: {pred_label}")
    print("\n✅ BACKEND MODEL LOADER WORKING!")
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"\n❌ Model loader error: {e}")
