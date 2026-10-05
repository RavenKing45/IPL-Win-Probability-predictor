from pathlib import Path

import joblib
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]

MODEL_PATH = PROJECT_ROOT / "models" / "logistic_regression_pipeline.joblib"


# Load trained pipeline
model = joblib.load(MODEL_PATH)

print("Model loaded successfully!")


# Example match situation
sample = pd.DataFrame([{
    "target_runs": 180,
    "runs_left": 100,
    "CRR": 8.0,
    "balls_left": 75,
    "RRR": 8.0,
    "wickets_left": 7,
}])


# Predict probabilities
probabilities = model.predict_proba(sample)[0]

print("\nPrediction:")
print(f"Class 0 probability: {probabilities[0]:.4f}")
print(f"Class 1 probability: {probabilities[1]:.4f}")

print(f"\nPredicted probability of winning: {probabilities[1] * 100:.2f}%")