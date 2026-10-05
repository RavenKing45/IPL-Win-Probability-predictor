from pathlib import Path

import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss
from sklearn.model_selection import GroupShuffleSplit
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
]

TARGET = "won"
GROUP = "match_id"


# --------------------------------------------------
# Load data
# --------------------------------------------------

print("Loading dataset...")
df = pd.read_csv(DATA_PATH)
print(f"Dataset shape: {df.shape}")
print(f"Matches: {df[GROUP].nunique()}")

X = df[FEATURES]
y = df[TARGET]
groups = df[GROUP]


# --------------------------------------------------
# Train / test split (by match, so no match is in both)
# --------------------------------------------------

splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
train_idx, test_idx = next(splitter.split(X, y, groups=groups))

X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

train_matches = set(groups.iloc[train_idx])
test_matches = set(groups.iloc[test_idx])
assert train_matches.isdisjoint(test_matches), "Match leaked across split!"

print(f"Train: {len(train_matches)} matches, {len(X_train)} rows")
print(f"Test:  {len(test_matches)} matches, {len(X_test)} rows")


# --------------------------------------------------
# Build pipeline
# --------------------------------------------------

pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("model", LogisticRegression(max_iter=2000)),
])


# --------------------------------------------------
# Train
# --------------------------------------------------

print("\nTraining Logistic Regression...")
pipeline.fit(X_train, y_train)


# --------------------------------------------------
# Evaluate
# --------------------------------------------------

def report(name, X_, y_):
    p = pipeline.predict_proba(X_)[:, 1]
    print(
        f"{name:6s} accuracy={accuracy_score(y_, p > 0.5):.4f}  "
        f"log_loss={log_loss(y_, p):.4f}  "
        f"brier={brier_score_loss(y_, p):.4f}"
    )

print()
report("Train", X_train, y_train)
report("Test", X_test, y_test)


# --------------------------------------------------
# Save model
# --------------------------------------------------

MODEL_DIR.mkdir(parents=True, exist_ok=True)
joblib.dump(pipeline, MODEL_PATH)

print(f"\nModel saved to:\n{MODEL_PATH}")