import pickle
import logging
from pathlib import Path
from app.config import settings

logger = logging.getLogger(__name__)


class ModelLoader:
    """Singleton class for loading and managing ML models"""
    
    _instance = None
    _model = None
    _label_encoder = None
    _feature_names = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelLoader, cls).__new__(cls)
            cls._instance._load_models()
        return cls._instance
    
    def _load_models(self):
        """Load all required models from disk"""
        try:
            # Load trained model
            model_path = Path(settings.MODEL_PATH)
            if model_path.exists():
                with open(model_path, 'rb') as f:
                    self._model = pickle.load(f)
                logger.info(f"Model loaded from {model_path}")
            else:
                logger.warning(f"Model not found at {model_path}")
            
            # Load label encoder
            encoder_path = Path(settings.LABEL_ENCODER_PATH)
            if encoder_path.exists():
                with open(encoder_path, 'rb') as f:
                    self._label_encoder = pickle.load(f)
                logger.info(f"Label encoder loaded from {encoder_path}")
            else:
                logger.warning(f"Label encoder not found at {encoder_path}")
            
            # Load feature names
            features_path = Path(settings.FEATURE_NAMES_PATH)
            if features_path.exists():
                with open(features_path, 'rb') as f:
                    self._feature_names = pickle.load(f)
                logger.info(f"Feature names loaded from {features_path}")
            else:
                logger.warning(f"Feature names not found at {features_path}")
                
        except Exception as e:
            logger.error(f"Error loading models: {e}")
            raise
    
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
    
    def is_ready(self) -> bool:
        """Check if all models are loaded"""
        return all([self._model, self._label_encoder, self._feature_names])


def get_model_loader() -> ModelLoader:
    """Get singleton instance of ModelLoader"""
    return ModelLoader()
