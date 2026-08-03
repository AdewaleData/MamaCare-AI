import sys
print(f"Python: {sys.version}")
try:
    import sklearn
    print(f"sklearn version: {sklearn.__version__}")
    print(f"sklearn path: {sklearn.__file__}")
except Exception as e:
    print(f"sklearn import error: {e}")

try:
    from sklearn.ensemble import _loss
    print(f"sklearn.ensemble._loss OK: {_loss}")
except Exception as e:
    print(f"sklearn.ensemble._loss import error: {type(e).__name__}: {e}")

try:
    import sklearn.ensemble._gb_losses
    print(f"sklearn.ensemble._gb_losses OK")
except Exception as e:
    print(f"sklearn.ensemble._gb_losses error: {type(e).__name__}: {e}")

# Check the gradient boosting module
try:
    from sklearn.ensemble import GradientBoostingClassifier
    import inspect
    src_file = inspect.getfile(GradientBoostingClassifier)
    print(f"GradientBoostingClassifier source: {src_file}")
except Exception as e:
    print(f"GradientBoostingClassifier error: {type(e).__name__}: {e}")

# Also check the pickle numpy array content
import pickle
import numpy as np
from pathlib import Path

f = Path(r'c:\Users\555555\OneDrive\Desktop\MamaCare-AI\ai-development\ml-model\models\best_model_hachathon_gradient_boosting.pkl')
with open(f, 'rb') as fh:
    arr = pickle.load(fh)
print(f"\npickle array type: {type(arr)}, dtype: {getattr(arr, 'dtype', None)}, shape: {getattr(arr, 'shape', None)}")
if isinstance(arr, np.ndarray):
    if arr.size < 20:
        print(f"values: {arr}")
    else:
        print(f"first 20 values: {arr.flatten()[:20]}")
