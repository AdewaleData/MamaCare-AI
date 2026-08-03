import joblib
import pickle
import warnings
warnings.filterwarnings('ignore')
from pathlib import Path

model_dir = Path(r'c:\Users\555555\OneDrive\Desktop\MamaCare-AI\ai-development\ml-model\models')

for f in sorted(model_dir.glob('*.pkl')):
    print(f'\n=== {f.name} ===')
    try:
        obj = joblib.load(f)
        print(f'Type: {type(obj)}')
        if isinstance(obj, dict):
            print(f'Keys: {list(obj.keys())}')
            for k, v in obj.items():
                hp = hasattr(v, 'predict')
                print(f'  {k}: {type(v).__name__} has_predict={hp}')
        else:
            hp = hasattr(obj, 'predict')
            hpp = hasattr(obj, 'predict_proba')
            ht = hasattr(obj, 'transform')
            hc = hasattr(obj, 'classes_')
            print(f'has_predict={hp}, has_predict_proba={hpp}')
            print(f'has_transform={ht}, has_classes_={hc}')
            if hasattr(obj, 'shape'):
                print(f'shape={obj.shape}')
    except Exception as e:
        print(f'joblib error: {type(e).__name__}: {e}')
        try:
            with open(f, 'rb') as fh:
                obj2 = pickle.load(fh)
            print(f'pickle Type: {type(obj2)}')
            if isinstance(obj2, dict):
                print(f'pickle Keys: {list(obj2.keys())}')
            else:
                hp = hasattr(obj2, 'predict')
                hpp = hasattr(obj2, 'predict_proba')
                ht = hasattr(obj2, 'transform')
                print(f'pickle: has_predict={hp}, has_predict_proba={hpp}, has_transform={ht}')
        except Exception as e2:
            print(f'pickle error: {type(e2).__name__}: {e2}')
