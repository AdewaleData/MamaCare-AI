import joblib
import numpy as np
from pathlib import Path

le_path = Path(r'c:\Users\555555\OneDrive\Desktop\MamaCare-AI\ai-development\ml-model\models\label_encoder_hackathon.pkl')
le = joblib.load(le_path)
print(f"Label encoder classes: {le.classes_}")

fn_path = Path(r'c:\Users\555555\OneDrive\Desktop\MamaCare-AI\ai-development\ml-model\models\feature_names_hackathon.pkl')
fn = joblib.load(fn_path)
print(f"Feature names: {fn}")
print(f"Feature count: {len(fn)}")

# Also load metadata
meta_path = Path(r'c:\Users\555555\OneDrive\Desktop\MamaCare-AI\ai-development\ml-model\models\model_hackathon.pkl')
meta = joblib.load(meta_path)
print(f"\nMetadata: {meta}")
