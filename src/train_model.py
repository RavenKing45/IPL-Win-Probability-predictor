from pathlib import Path

import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


# --------------------------------------------------
# Paths
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[1]

DATA_PATH = PROJECT_ROOT / "data" / "processed" / "reduced" / "Final_data.csv"
MODEL_DIR = PROJECT_ROOT / "models"
MODEL_PATH = MODEL_DIR / "logistic_regression_pipeline.joblib"


# --------------------------------------------------
# Features and target
# --------------------------------------------------

FEATURES = [
    "target_runs",
    "runs_left",
    "CRR",
    "balls_left",
    "RRR",
    "wickets_left",
    "runs_last_30",
    "wickets_last_30",
]

TARGET = "won"


# --------------------------------------------------
# Load data
# --------------------------------------------------

print("Loading dataset...")

df = pd.read_csv(DATA_PATH)

print(f"Dataset shape: {df.shape}")


# --------------------------------------------------
# Select features and target
# --------------------------------------------------

X = df[FEATURES]
y = df[TARGET]

print("\nFeatures:")
print(FEATURES)

print("\nTarget:")
print(TARGET)


# --------------------------------------------------
# Train / test split
# --------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y,
)


# --------------------------------------------------
# Build pipeline
# --------------------------------------------------

pipeline = Pipeline([
    ("scaler", StandardScaler()),
    (
        "model",
        LogisticRegression(
            max_iter=2000
        ),
    ),
])


# --------------------------------------------------
# Train
# --------------------------------------------------

print("\nTraining Logistic Regression...")

pipeline.fit(X_train, y_train)


# --------------------------------------------------
# Evaluate
# --------------------------------------------------

train_accuracy = pipeline.score(X_train, y_train)
test_accuracy = pipeline.score(X_test, y_test)

print(f"\nTraining accuracy: {train_accuracy:.4f}")
print(f"Test accuracy:     {test_accuracy:.4f}")


# --------------------------------------------------
# Save model
# --------------------------------------------------

MODEL_DIR.mkdir(parents=True, exist_ok=True)

joblib.dump(pipeline, MODEL_PATH)

print(f"\nModel saved to:")
print(MODEL_PATH)