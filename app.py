from pathlib import Path

import joblib
import pandas as pd
from flask import Flask, jsonify, request, render_template


# --------------------------------------------------
# Paths
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent

MODEL_PATH = (
    PROJECT_ROOT
    / "models"
    / "logistic_regression_pipeline.joblib"
)


# --------------------------------------------------
# Load model
# --------------------------------------------------

model = joblib.load(MODEL_PATH)


# --------------------------------------------------
# Flask app
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__)


# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.route("/", methods=["GET"])
def home():
    return render_template("index.html")


# --------------------------------------------------
# Prediction endpoint
# --------------------------------------------------

@app.route("/api/predict", methods=["POST"])
def predict():

    data = request.get_json()

    # ----------------------------------------------
    # Required inputs
    # ----------------------------------------------

    required_fields = [
        "target_runs",
        "current_score",
        "overs_completed",
        "wickets_lost",
        "runs_last_30",
        "wickets_last_30",
    ]

    missing_fields = [
        field
        for field in required_fields
        if field not in data
    ]

    if missing_fields:
        return jsonify({
            "error": "Missing required fields",
            "fields": missing_fields
        }), 400

    # ----------------------------------------------
    # Extract inputs
    # ----------------------------------------------

    target_runs = float(data["target_runs"])
    current_score = float(data["current_score"])
    overs_completed = float(data["overs_completed"])
    wickets_lost = float(data["wickets_lost"])
    runs_last_30 = float(data["runs_last_30"])
    wickets_last_30 = float(data["wickets_last_30"])

    # ----------------------------------------------
    # Basic validation
    # ----------------------------------------------

    if target_runs <= 0:
        return jsonify({"error": "Target must be greater than 0"}), 400

    if current_score < 0:
        return jsonify({"error": "Score cannot be negative"}), 400

    if current_score >= target_runs:
        return jsonify({
            "error": "Chasing team has already reached the target"
        }), 400

    if overs_completed < 0 or overs_completed > 20:
        return jsonify({
            "error": "Overs must be between 0 and 20"
        }), 400

    if wickets_lost < 0 or wickets_lost > 10:
        return jsonify({
            "error": "Wickets lost must be between 0 and 10"
        }), 400

    # ----------------------------------------------
    # Derived features
    # ----------------------------------------------

    runs_left = target_runs - current_score

    balls_bowled = int(overs_completed) * 6 + round(
        (overs_completed % 1) * 10
    )

    balls_left = 120 - balls_bowled

    wickets_left = 10 - wickets_lost

    # ----------------------------------------------
    # Handle CRR
    # ----------------------------------------------

    if balls_bowled > 0:
        crr = current_score / (balls_bowled / 6)
    else:
        crr = 0

    # ----------------------------------------------
    # Handle RRR
    # ----------------------------------------------

    if balls_left > 0:
        rrr = runs_left / (balls_left / 6)
    else:
        rrr = 0

    # ----------------------------------------------
    # Create model input
    # ----------------------------------------------

    features = pd.DataFrame([{
        "target_runs": target_runs,
        "runs_left": runs_left,
        "CRR": crr,
        "balls_left": balls_left,
        "RRR": rrr,
        "wickets_left": wickets_left,
        "runs_last_30": runs_last_30,
        "wickets_last_30": wickets_last_30,
    }])

    # ----------------------------------------------
    # Prediction
    # ----------------------------------------------

    probabilities = model.predict_proba(features)[0]

    loss_probability = float(probabilities[0])
    win_probability = float(probabilities[1])

    return jsonify({
        "win_probability": round(win_probability * 100, 2),
        "loss_probability": round(loss_probability * 100, 2),
        "features": {
            "target_runs": target_runs,
            "runs_left": runs_left,
            "CRR": round(crr, 2),
            "balls_left": balls_left,
            "RRR": round(rrr, 2),
            "wickets_left": wickets_left,
            "runs_last_30": runs_last_30,
            "wickets_last_30": wickets_last_30,
        }
    })