# AI Development - ML Models

This directory contains the machine learning models and development files for MamaCare AI.

## Structure

```
ai-development/
└── ml-model/
    ├── Mama-Care-AI-Hackathon.ipynb    # Jupyter notebook for ML model training
    ├── models/                         # Trained ML model files
    │   ├── model_hackathon.pkl
    │   ├── scaler_hackathon.pkl
    │   ├── label_encoder_hackathon.pkl
    │   └── feature_names_hackathon.pkl
    ├── processed_data_hackathon.csv   # Processed training data
    └── scripts/
        └── 001_init_schema.sql        # Database schema scripts
```

## ML Models

The trained models are used by the main backend (`backend/`) for risk assessment predictions.

**Model Files:**
- `model_hackathon.pkl` - Random Forest classifier
- `scaler_hackathon.pkl` - Feature scaler
- `label_encoder_hackathon.pkl` - Label encoder for risk levels
- `feature_names_hackathon.pkl` - Feature names mapping

## Usage

The models are automatically loaded by the main backend from this location:
```
../ai-development/ml-model/models/
```

## Development

To retrain or modify the models:
1. Open `Mama-Care-AI-Hackathon.ipynb` in Jupyter
2. Run the notebook to train new models
3. Save the updated `.pkl` files to `models/` directory

## Note

The backend code has been merged into the main `backend/` directory. This directory now only contains ML models and development files.

