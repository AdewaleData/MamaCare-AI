"""
MamaCare AI - Model Training Script (extracted from notebook)
Trains and saves all model artifacts correctly for backend loading.
"""
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, classification_report
from scipy import stats
import warnings
import joblib
import os
from datetime import datetime
from pathlib import Path

warnings.filterwarnings('ignore')

# Setup paths
SCRIPT_DIR = Path(r'c:\Users\555555\OneDrive\Desktop\MamaCare-AI\ai-development\ml-model')
MODELS_DIR = SCRIPT_DIR / 'models'
DATA_DIR = SCRIPT_DIR
MODELS_DIR.mkdir(exist_ok=True)
os.chdir(SCRIPT_DIR)

print(f"Working directory: {os.getcwd()}")
print(f"Models directory: {MODELS_DIR}")

# ============================================================================
# DATA LOADING
# ============================================================================
print("\n" + "="*80)
print("DATA LOADING")
print("="*80)

# Try multiple dataset names
dataset_candidates = [
    SCRIPT_DIR / 'processed_data_hackathon.csv',
    SCRIPT_DIR / 'Dataset - Updated.csv',
]
df = None
for ds in dataset_candidates:
    if ds.exists():
        print(f"Trying to load: {ds}")
        try:
            df = pd.read_csv(ds)
            print(f"Loaded {ds}: {df.shape}")
            break
        except Exception as e:
            print(f"  Error: {e}")

if df is None:
    raise FileNotFoundError("No dataset found!")

# Clean column names
df.columns = (
    df.columns
      .str.encode('ascii', 'ignore').str.decode('utf-8')
      .str.strip()
      .str.replace('\ufeff', '', regex=True)
      .str.replace('\xa0', ' ', regex=True)
      .str.lower()
      .str.replace(' ', '_')
      .str.replace('-', '_')
)

print(f"\nCleaned columns: {df.columns.tolist()}")
print(f"Dataset shape: {df.shape}")

# ============================================================================
# FEATURE ENGINEERING
# ============================================================================
print("\n" + "="*80)
print("FEATURE ENGINEERING")
print("="*80)

# Ensure required columns exist, create from raw if needed
def safe_col(name, alt_names=None, default_val=None):
    if name in df.columns:
        return df[name]
    if alt_names:
        for alt in alt_names:
            if alt in df.columns:
                return df[alt]
    if default_val is not None:
        return default_val
    print(f"  WARNING: Column '{name}' not found, using default zeros")
    return 0

# Raw base columns we need
df['age'] = safe_col('age')
df['systolic_bp'] = safe_col('systolic_bp', ['systolic'])
df['diastolic'] = safe_col('diastolic', ['diastolic_bp'])
df['bs'] = safe_col('bs', ['blood_sugar', 'glucose'])
df['body_temp'] = safe_col('body_temp', ['temp', 'temperature'])
df['bmi'] = safe_col('bmi')
df['heart_rate'] = safe_col('heart_rate', ['hr'])

# Binary risk factors (default to 0 if missing)
df['previous_complications'] = safe_col('previous_complications', default_val=0)
df['preexisting_diabetes'] = safe_col('preexisting_diabetes', ['pre_existing_diabetes'], default_val=0)
df['gestational_diabetes'] = safe_col('gestational_diabetes', default_val=0)
df['mental_health'] = safe_col('mental_health', default_val=0)

# Make numeric where applicable
for col in ['age', 'systolic_bp', 'diastolic', 'bs', 'body_temp', 'bmi', 'heart_rate',
            'previous_complications', 'preexisting_diabetes', 'gestational_diabetes', 'mental_health']:
    df[col] = pd.to_numeric(df[col], errors='coerce')

# Fill NaN with column medians
for col in ['age', 'systolic_bp', 'diastolic', 'bs', 'body_temp', 'bmi', 'heart_rate']:
    if df[col].isna().any():
        df[col] = df[col].fillna(df[col].median())
for col in ['previous_complications', 'preexisting_diabetes', 'gestational_diabetes', 'mental_health']:
    if df[col].isna().any():
        df[col] = df[col].fillna(0).astype(int)

# Body temp: if values are > 100, they are likely Fahrenheit, convert (rough) to C-ish?
# Actually notebook example uses 98.6 which is F. Keep as-is.

# Derived features
df['MAP'] = (df['systolic_bp'] + 2 * df['diastolic']) / 3
df['Pulse_Pressure'] = df['systolic_bp'] - df['diastolic']

# Hypertension thresholds
# Note: Depending on F vs C, but systolic >= 140 is hypertension regardless of scale
df['Has_Hypertension'] = ((df['systolic_bp'] >= 140) | (df['diastolic'] >= 90)).astype(int)

# Diabetes: bs >= 7.0 if mmol/L, but if values look like mg/dL (>=126) we should use that threshold
# Heuristic: if max bs > 50, assume mg/dL
bs_max = df['bs'].max()
if bs_max > 50:
    print(f"  Detecting BS in mg/dL (max={bs_max}). Using threshold >= 126 for diabetes.")
    df['Has_Diabetes'] = (df['bs'] >= 126).astype(int)
else:
    print(f"  Detecting BS in mmol/L (max={bs_max}). Using threshold >= 7.0 for diabetes.")
    df['Has_Diabetes'] = (df['bs'] >= 7.0).astype(int)

# Fever: if temps > 100 assume Fahrenheit, use > 100.4; else use > 37.5
temp_max = df['body_temp'].max()
if temp_max > 100:
    print(f"  Detecting body_temp in F (max={temp_max}). Using threshold > 100.4 for fever.")
    df['Has_Fever'] = (df['body_temp'] > 100.4).astype(int)
else:
    print(f"  Detecting body_temp in C (max={temp_max}). Using threshold > 37.5 for fever.")
    df['Has_Fever'] = (df['body_temp'] > 37.5).astype(int)

df['Has_Tachycardia'] = (df['heart_rate'] > 100).astype(int)

df['Risk_Factor_Count'] = (
    df['previous_complications'].astype(int) +
    df['preexisting_diabetes'].astype(int) +
    df['gestational_diabetes'].astype(int) +
    df['mental_health'].astype(int) +
    df['Has_Hypertension'] +
    df['Has_Diabetes'] +
    df['Has_Fever'] +
    df['Has_Tachycardia']
)

df['Age_Risk'] = ((df['age'] < 18) | (df['age'] >= 35)).astype(int)
df['BMI_Risk'] = ((df['bmi'] < 18.5) | (df['bmi'] >= 30)).astype(int)

# ============================================================================
# FEATURE COLUMNS & TARGET
# ============================================================================
feature_columns = [
    'age', 'systolic_bp', 'diastolic', 'bs', 'body_temp', 'bmi',
    'previous_complications', 'preexisting_diabetes', 'gestational_diabetes',
    'mental_health', 'heart_rate',
    'MAP', 'Pulse_Pressure', 'Has_Hypertension', 'Has_Diabetes', 'Has_Fever',
    'Has_Tachycardia', 'Risk_Factor_Count', 'Age_Risk', 'BMI_Risk'
]

# Ensure target
if 'risk_level' in df.columns:
    pass
elif 'Risk Level' in df.columns:
    df['risk_level'] = df['Risk Level']
else:
    raise KeyError("No risk_level column found")

# Remove rows where risk_level is NaN
df = df.dropna(subset=['risk_level'])
print(f"After dropping NaN targets: {df.shape}")

X = df[feature_columns].copy()
y_raw = df['risk_level'].astype(str).str.strip()

# Encode target (ensure ['High', 'Low'] classes)
label_encoder = LabelEncoder()
label_encoder.fit(['High', 'Low'])
# Transform
y = label_encoder.transform(y_raw)

print(f"\nFeature matrix X: {X.shape}")
print(f"Target y: {y.shape}, classes: {label_encoder.classes_}")
print(f"Class distribution: Low={sum(y_raw=='Low')}, High={sum(y_raw=='High')}")

# ============================================================================
# TRAIN / TEST SPLIT AND SCALING
# ============================================================================
X_train, X_test, y_train, y_test = train_test_split(
    X.values, y, test_size=0.2, random_state=42, stratify=y
)

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# ============================================================================
# MODEL TRAINING
# ============================================================================
print("\n" + "="*80)
print("MODEL TRAINING")
print("="*80)

models = {}
results = {}

# 1. Logistic Regression
print("\n[1/3] Logistic Regression...")
lr_model = LogisticRegression(random_state=42, max_iter=1000)
lr_model.fit(X_train_scaled, y_train)
y_pred_lr = lr_model.predict(X_test_scaled)
y_pred_proba_lr = lr_model.predict_proba(X_test_scaled)
models['Logistic Regression'] = lr_model
results['Logistic Regression'] = {
    'accuracy': accuracy_score(y_test, y_pred_lr),
    'f1': f1_score(y_test, y_pred_lr, average='weighted'),
    'predictions': y_pred_lr,
    'probabilities': y_pred_proba_lr,
}

# 2. Random Forest
print("\n[2/3] Random Forest...")
rf_model = RandomForestClassifier(random_state=42, n_estimators=100)
rf_model.fit(X_train_scaled, y_train)
y_pred_rf = rf_model.predict(X_test_scaled)
y_pred_proba_rf = rf_model.predict_proba(X_test_scaled)
models['Random Forest'] = rf_model
results['Random Forest'] = {
    'accuracy': accuracy_score(y_test, y_pred_rf),
    'f1': f1_score(y_test, y_pred_rf, average='weighted'),
    'predictions': y_pred_rf,
    'probabilities': y_pred_proba_rf,
}

# 3. Gradient Boosting
print("\n[3/3] Gradient Boosting...")
gb_model = GradientBoostingClassifier(
    n_estimators=100, learning_rate=0.2, max_depth=3,
    min_samples_split=2, random_state=42
)
gb_model.fit(X_train_scaled, y_train)
y_pred_gb = gb_model.predict(X_test_scaled)
y_pred_proba_gb = gb_model.predict_proba(X_test_scaled)
models['Gradient Boosting'] = gb_model
results['Gradient Boosting'] = {
    'accuracy': accuracy_score(y_test, y_pred_gb),
    'f1': f1_score(y_test, y_pred_gb, average='weighted'),
    'predictions': y_pred_gb,
    'probabilities': y_pred_proba_gb,
}

# ============================================================================
# COMPARE AND PICK BEST
# ============================================================================
print("\nModel comparison:")
for m, r in results.items():
    print(f"  {m:25s}: accuracy={r['accuracy']:.4f}, f1={r['f1']:.4f}")

best_model_name = max(results.keys(), key=lambda m: results[m]['f1'])
print(f"\nBest model (by F1): {best_model_name}")

# ============================================================================
# HYPERPARAMETER TUNING ON BEST MODEL
# ============================================================================
print(f"\nHyperparameter tuning on {best_model_name}...")

if best_model_name == 'Random Forest':
    param_grid = {
        'n_estimators': [100, 200],
        'max_depth': [10, 20, None],
        'min_samples_split': [2, 5],
    }
    base = RandomForestClassifier(random_state=42, n_jobs=-1)
elif best_model_name == 'Gradient Boosting':
    param_grid = {
        'n_estimators': [100, 200],
        'learning_rate': [0.1, 0.2],
        'max_depth': [3, 5],
        'min_samples_split': [2, 5],
    }
    base = GradientBoostingClassifier(random_state=42)
else:
    param_grid = {
        'C': [0.1, 1.0, 10.0],
    }
    base = LogisticRegression(random_state=42, max_iter=1000)

grid_search = GridSearchCV(
    base, param_grid, cv=3, scoring='f1_weighted', n_jobs=-1, verbose=0
)
grid_search.fit(X_train_scaled, y_train)

best_tuned_model = grid_search.best_estimator_
y_pred_tuned = best_tuned_model.predict(X_test_scaled)
tuned_accuracy = accuracy_score(y_test, y_pred_tuned)
tuned_f1 = f1_score(y_test, y_pred_tuned, average='weighted')

print(f"  Best params: {grid_search.best_params_}")
print(f"  Tuned accuracy: {tuned_accuracy:.4f}")
print(f"  Tuned f1: {tuned_f1:.4f}")
print("\nClassification report:")
print(classification_report(y_test, y_pred_tuned, target_names=label_encoder.classes_))

# ============================================================================
# SAVE MODELS - use filenames expected by backend model_loader
# ============================================================================
print("\n" + "="*80)
print("SAVING MODEL ARTIFACTS")
print("="*80)

os.makedirs(MODELS_DIR, exist_ok=True)

# 1. Scaler
scaler_path = MODELS_DIR / 'scaler_hackathon.pkl'
joblib.dump(scaler, scaler_path)
print(f"✅ Saved scaler: {scaler_path}")

# 2. Label encoder
encoder_path = MODELS_DIR / 'label_encoder_hackathon.pkl'
joblib.dump(label_encoder, encoder_path)
print(f"✅ Saved label_encoder: {encoder_path}")

# 3. Feature names
feature_path = MODELS_DIR / 'feature_names_hackathon.pkl'
joblib.dump(feature_columns, feature_path)
print(f"✅ Saved feature_names ({len(feature_columns)}): {feature_path}")

# 4. Best model - saved with the EXACT filename expected by backend loader
#    (backend tries best_model_hachathon_gradient_boosting.pkl first with typo)
best_model_safe = best_model_name.lower().replace(' ', '_')
# Standard correct name
best_model_filename_correct = f'best_model_hackathon_{best_model_safe}.pkl'
# Also the typo'd name the loader checks first
best_model_filename_typo = f'best_model_hachathon_{best_model_safe}.pkl'
# And the generic gradient boosting typo name (highest priority in loader)
gb_typo_name = 'best_model_hachathon_gradient_boosting.pkl'

candidate_paths = [
    MODELS_DIR / best_model_filename_correct,
    MODELS_DIR / best_model_filename_typo,
]
# Always also save under the generic gb_typo_name (priority one for loader)
if (MODELS_DIR / gb_typo_name) not in candidate_paths:
    candidate_paths.insert(0, MODELS_DIR / gb_typo_name)

for save_path in candidate_paths:
    joblib.dump(best_tuned_model, save_path)
    print(f"✅ Saved best model ({best_model_name}): {save_path}")

# 5. Metadata dict (matches old format)
metadata = {
    'model_name': best_model_name,
    'model_type': type(best_tuned_model).__name__,
    'best_params': grid_search.best_params_,
    'test_accuracy': tuned_accuracy,
    'test_f1_score': tuned_f1,
    'feature_count': len(feature_columns),
    'training_samples': X_train.shape[0],
    'test_samples': X_test.shape[0],
    'classes': label_encoder.classes_.tolist(),
    'trained_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
}
metadata_path = MODELS_DIR / 'model_hackathon.pkl'
joblib.dump(metadata, metadata_path)
print(f"✅ Saved metadata: {metadata_path}")

# Also save the full models dict
models_all_path = MODELS_DIR / 'models_hackathon.pkl'
joblib.dump(models, models_all_path)
print(f"✅ Saved all models dict: {models_all_path}")

# Save processed data CSV
processed_csv = SCRIPT_DIR / 'processed_data_hackathon.csv'
df.to_csv(processed_csv, index=False)
print(f"✅ Saved processed data: {processed_csv}")

# ============================================================================
# VERIFY LOAD
# ============================================================================
print("\n" + "="*80)
print("VERIFYING MODELS LOAD")
print("="*80)

for p in [MODELS_DIR / gb_typo_name, scaler_path, encoder_path, feature_path]:
    obj = joblib.load(p)
    print(f"  Loaded {p.name}: {type(obj).__name__}")

# Quick sanity prediction
sample = X_test_scaled[0:1]
pred_idx = best_tuned_model.predict(sample)[0]
pred_label = label_encoder.inverse_transform([pred_idx])[0]
print(f"\nSample prediction: {pred_label} (idx={pred_idx})")
print(f"True label: {label_encoder.inverse_transform([y_test[0]])[0]}")

print("\n" + "="*80)
print("DONE! All model artifacts saved and verified.")
print("="*80)
