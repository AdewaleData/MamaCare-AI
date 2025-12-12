import pickle
import joblib
import logging
import os
import numpy as np
import warnings
from pathlib import Path
from app.config import settings

# Suppress sklearn version compatibility warnings
warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')

logger = logging.getLogger(__name__)


class ModelLoader:
    """Singleton class for loading and managing ML models"""
    
    _instance = None
    _model = None
    _label_encoder = None
    _feature_names = None
    _scaler = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelLoader, cls).__new__(cls)
            cls._instance._load_models()
        return cls._instance
    
    def _load_models(self):
        """Load all required models from disk"""
        # Get default model directory
        from app.config import settings
        _backend_dir = Path(__file__).parent.parent.parent  # Go up from app/ml/model_loader.py to backend/
        _project_root = _backend_dir.parent  # Go up from backend/ to project root
        _default_model_dir = _project_root / "ai-development" / "ml-model" / "models"
        
        try:
            # Load trained model (saved with joblib)
            # Try multiple possible model file names
            possible_model_files = [
                _default_model_dir / "best_model_hachathon_gradient_boosting.pkl",  # Actual model file (with typo)
                _default_model_dir / "best_model_hackathon_gradient_boosting.pkl",  # Corrected spelling
                _default_model_dir / "best_model_hachathon_random_forest.pkl",  # Random Forest variant
                _default_model_dir / "best_model_hackathon_random_forest.pkl",  # Corrected spelling
                Path(settings.MODEL_PATH).resolve(),  # From config
            ]
            
            model_loaded = False
            for model_file in possible_model_files:
                if model_file.exists():
                    logger.info(f"Attempting to load model from: {model_file}")
                    try:
                        # Suppress sklearn version warnings during model loading
                        with warnings.catch_warnings():
                            warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')
                            model_obj = joblib.load(model_file)
                        
                        # Check if it's a dict (metadata) or the model itself
                        if isinstance(model_obj, dict):
                            logger.info(f"  File contains dict with keys: {list(model_obj.keys())}")
                            # This is metadata, not the model - skip it
                            if 'model_name' in model_obj or 'trained_date' in model_obj:
                                logger.warning(f"  This appears to be metadata, not the model. Trying next file...")
                                continue
                            # Check if dict contains a model
                            for key, value in model_obj.items():
                                if hasattr(value, 'predict') and hasattr(value, 'predict_proba'):
                                    self._model = value
                                    logger.info(f"✓ Model found in dict key '{key}' from {model_file}")
                                    model_loaded = True
                                    break
                        elif hasattr(model_obj, 'predict') and hasattr(model_obj, 'predict_proba'):
                            # It's the model!
                            self._model = model_obj
                            logger.info(f"✓ Model loaded successfully from {model_file}")
                            logger.info(f"  Model type: {type(model_obj).__name__}")
                            model_loaded = True
                            break
                        else:
                            logger.warning(f"  File doesn't contain a valid model. Type: {type(model_obj)}")
                    except Exception as e:
                        logger.warning(f"  Error loading from {model_file}: {e}")
                        continue
            
            if not model_loaded:
                logger.error(f"✗ Failed to load model from any of the possible files!")
                logger.error(f"  Tried: {[str(f) for f in possible_model_files if f.exists()]}")
                logger.error(f"  The actual trained model file is missing!")
                logger.error(f"  Expected file: best_model_hachathon_gradient_boosting.pkl (or similar)")
                logger.error(f"  Please re-run the notebook to save the trained model.")
                # Try with pickle as last resort
                for model_file in possible_model_files:
                    if model_file.exists():
                        try:
                            with warnings.catch_warnings():
                                warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')
                                with open(model_file, 'rb') as f:
                                    model_obj = pickle.load(f)
                                if hasattr(model_obj, 'predict') and hasattr(model_obj, 'predict_proba'):
                                    self._model = model_obj
                                    logger.info(f"✓ Model loaded with pickle from {model_file}")
                                    model_loaded = True
                                    break
                        except:
                            continue
                
                if not model_loaded:
                    logger.error(f"✗ Failed to load model with both joblib and pickle!")
                    logger.error(f"  Please ensure the trained model file exists in: {_default_model_dir}")
            
            # Load label encoder (saved with joblib)
            encoder_path = Path(settings.LABEL_ENCODER_PATH).resolve()
            logger.info(f"Attempting to load label encoder from: {encoder_path}")
            if encoder_path.exists():
                try:
                    with warnings.catch_warnings():
                        warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')
                        self._label_encoder = joblib.load(encoder_path)
                    logger.info(f"✓ Label encoder loaded successfully from {encoder_path}")
                except Exception as e:
                    logger.error(f"✗ Error loading label encoder: {e}")
                    # Try with pickle as fallback
                    try:
                        with warnings.catch_warnings():
                            warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')
                            with open(encoder_path, 'rb') as f:
                                self._label_encoder = pickle.load(f)
                        logger.info(f"✓ Label encoder loaded with pickle from {encoder_path}")
                    except Exception as e2:
                        logger.error(f"✗ Failed to load label encoder with both joblib and pickle: {e2}")
            else:
                logger.error(f"✗ Label encoder not found at {encoder_path}")
            
            # Load feature names (saved with joblib)
            features_path = Path(settings.FEATURE_NAMES_PATH).resolve()
            logger.info(f"Attempting to load feature names from: {features_path}")
            if features_path.exists():
                try:
                    with warnings.catch_warnings():
                        warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')
                        self._feature_names = joblib.load(features_path)
                    logger.info(f"✓ Feature names loaded successfully from {features_path}")
                except Exception as e:
                    logger.error(f"✗ Error loading feature names: {e}")
                    # Try with pickle as fallback
                    try:
                        with warnings.catch_warnings():
                            warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')
                            with open(features_path, 'rb') as f:
                                self._feature_names = pickle.load(f)
                        logger.info(f"✓ Feature names loaded with pickle from {features_path}")
                    except Exception as e2:
                        logger.error(f"✗ Failed to load feature names with both joblib and pickle: {e2}")
            else:
                logger.error(f"✗ Feature names not found at {features_path}")
            
            # Load scaler (saved with joblib - MUST use joblib!)
            scaler_path = Path(settings.SCALER_PATH).resolve()
            logger.info(f"Attempting to load scaler from: {scaler_path}")
            if scaler_path.exists():
                try:
                    # Use joblib (notebook uses joblib.dump)
                    with warnings.catch_warnings():
                        warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')
                        self._scaler = joblib.load(scaler_path)
                    if hasattr(self._scaler, 'transform'):
                        logger.info(f"✓ Scaler (StandardScaler) loaded successfully from {scaler_path}")
                    else:
                        logger.error(f"✗ Scaler loaded but doesn't have transform method! Type: {type(self._scaler)}")
                        self._scaler = None
                except Exception as e:
                    logger.error(f"✗ Error loading scaler with joblib: {e}")
                    # Try with pickle as fallback
                    try:
                        with warnings.catch_warnings():
                            warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')
                            with open(scaler_path, 'rb') as f:
                                scaler_obj = pickle.load(f)
                            if hasattr(scaler_obj, 'transform'):
                                self._scaler = scaler_obj
                                logger.info(f"✓ Scaler loaded with pickle from {scaler_path}")
                            else:
                                logger.error(f"✗ Scaler from pickle doesn't have transform method! Type: {type(scaler_obj)}")
                                self._scaler = None
                    except Exception as e2:
                        logger.error(f"✗ Failed to load scaler with both joblib and pickle: {e2}")
            else:
                logger.error(f"✗ Scaler not found at {scaler_path}")
            
            # Log summary
            if self.is_ready():
                logger.info("✓✓✓ All ML models loaded successfully! ✓✓✓")
            else:
                missing = []
                if self._model is None:
                    missing.append("model")
                if self._label_encoder is None:
                    missing.append("label_encoder")
                if self._feature_names is None:
                    missing.append("feature_names")
                if self._scaler is None:
                    missing.append("scaler")
                error_msg = f"Failed to load ML models. Missing: {', '.join(missing)}. Please check model files in ai-development/ml-model/models/"
                logger.error(error_msg)
                raise RuntimeError(error_msg)
                
        except Exception as e:
            logger.error(f"Error loading models: {e}", exc_info=True)
            raise RuntimeError(f"Failed to load ML models: {str(e)}. Please check model files in ai-development/ml-model/models/")
    
    @property
    def model(self):
        """Get the trained model"""
        if self._model is None:
            raise RuntimeError("Model not loaded")
        return self._model
    
    @property
    def label_encoder(self):
        """Get the label encoder"""
        if self._label_encoder is None:
            raise RuntimeError("Label encoder not loaded")
        return self._label_encoder
    
    @property
    def feature_names(self):
        """Get feature names"""
        if self._feature_names is None:
            raise RuntimeError("Feature names not loaded")
        return self._feature_names
    
    @property
    def scaler(self):
        """Get the scaler"""
        if self._scaler is None:
            raise RuntimeError("Scaler not loaded")
        return self._scaler
    
    def is_ready(self) -> bool:
        """Check if all models are loaded"""
        return all([
            self._model is not None,
            self._label_encoder is not None,
            self._feature_names is not None,
            self._scaler is not None
        ])
    
    @property
    def predictor(self):
        """Get the risk predictor instance"""
        from app.ml.predictor import RiskPredictor
        return RiskPredictor()


def get_model_loader() -> ModelLoader:
    """Get singleton instance of ModelLoader"""
    return ModelLoader()
