# 🏏 IPL Win Probability Predictor

An end-to-end Machine Learning project that estimates the probability of the **chasing team winning an IPL match** from the current state of the chase.

The project transforms raw IPL match-level and ball-by-ball data into a delivery-level, model-ready dataset, trains classification models, and exposes the trained prediction pipeline through a Flask web application deployed on Vercel.

## 🚀 Live Demo

**[Try the IPL Win Probability Predictor](https://ipl-win-probability-predictor-theta.vercel.app/)**

---

## 📌 Project Goal

The objective is to estimate the probability of the chasing team winning at a given point in the second innings.

Instead of predicting only from final match-level information, each modelling row represents a **snapshot of an ongoing chase after a delivery**.

The model uses the information available at that point — such as the target, runs remaining, required run rate, wickets remaining, and recent scoring momentum — to estimate the eventual outcome.

---

## 🧠 Machine Learning Approach

### Current Model

The currently deployed model is:

**Logistic Regression**

The model is implemented as a scikit-learn pipeline and serialized using `joblib`.

The project has also included **Support Vector Machine (SVM)** experimentation, while the deployed application currently uses the Logistic Regression pipeline.

```text
Raw IPL Data
     ↓
Data Cleaning
     ↓
Feature Engineering
     ↓
Delivery-level Chase States
     ↓
Logistic Regression Pipeline
     ↓
Predicted Probability
     ↓
Web Application
```

The model uses `predict_proba()` to return a probability rather than only a binary win/loss prediction.

---

## 📊 Dataset Construction

The raw data is divided into two main sources.

### Match-level data

Contains information such as:

- `match_id`
- `season_id`
- `match_date`
- `city`
- `venue`
- `toss_winner`
- `team1`
- `team2`
- `toss_decision`
- `match_winner`
- `result`

Post-match information such as `player_of_match` is not used as a predictive feature.

### Ball-by-ball data

Contains delivery-level information such as:

- innings
- batting team
- bowling team
- runs
- wickets
- legal-delivery information
- over / ball information

The two datasets are combined to construct a delivery-level chase-state dataset.

---

## 🛠️ Feature Engineering Pipeline

### 1. Calculate the first-innings score

The first innings is extracted from the ball-by-ball dataset and grouped by `match_id`.

The total first-innings runs are calculated and merged into the match-level dataset.

This provides the reference target for the chase:

```text
target_runs = first_innings_runs + 1
```

### 2. Construct the second-innings dataset

The second innings is isolated from the ball-by-ball data.

Super Over deliveries are excluded because the project models the normal T20 chase rather than the Super Over tie-breaker.

Every second-innings delivery is retained as a potential prediction snapshot.

### 3. Build the current match state

For every match, cumulative values are calculated for:

- `current_score`
- `wickets_lost`

This changes the dataset from a match-level representation into a sequence of match states:

> **1 row = 1 delivery / one point in the chase**

### 4. Calculate chase requirements and rates

The following features are derived:

- `target_runs`
- `runs_left`
- `total_legal_balls`
- `balls_left`
- `overs_completed`
- `overs_left`
- `CRR` — Current Run Rate
- `RRR` — Required Run Rate
- `wickets_lost`

Legal deliveries are tracked explicitly so wides and no-balls do not incorrectly consume one of the 120 legal deliveries in a standard T20 innings.

### 5. Add recent momentum features

The project also includes rolling features describing recent batting performance:

- `runs_last_30` — runs scored over the previous 30 legal deliveries
- `wickets_last_30` — wickets lost over the previous 30 legal deliveries

These features provide short-term information that complements overall metrics such as CRR and RRR.

### 6. Create the target variable

The binary outcome is derived from the chasing team's relationship to the final match winner:

```python
won = (team_batting == match_winner)
```

This gives:

- `1` → the chasing team eventually won
- `0` → the chasing team eventually lost

---

## 🧹 Data Cleaning

Before model training, the dataset is cleaned to keep the training examples consistent with the assumptions of the predictor.

The preprocessing includes:

- removing tied matches
- removing no-result matches
- handling matches with revised targets / DLS or altered innings conditions
- removing states where the chase has already been won
- removing states where no legal balls remain
- handling undefined CRR / RRR edge cases
- removing non-legal delivery snapshots where appropriate
- normalising inconsistent venue names
- handling missing city information
- maintaining consistent team aliases across IPL eras

These steps are important because the model should only see states that represent a meaningful **ongoing normal chase**.

---

## 📈 Final Modelling Dataset

The processed modelling dataset currently contains:

**117,558 observations and 17 columns.**

The final deployed Logistic Regression model uses these 8 match-state features:

| Feature | Description |
|---|---|
| `target_runs` | Target score set by the first innings |
| `runs_left` | Runs still required to win |
| `CRR` | Current Run Rate |
| `balls_left` | Legal deliveries remaining |
| `RRR` | Required Run Rate |
| `wickets_left` | Wickets remaining |
| `runs_last_30` | Runs scored in the previous 30 legal deliveries |
| `wickets_last_30` | Wickets lost in the previous 30 legal deliveries |

A typical prediction state can therefore look like:

| Feature | Example |
|---|---:|
| Target Runs | 180 |
| Runs Left | 100 |
| Wickets Left | 7 |
| Balls Left | 60 |
| CRR | 8.0 |
| RRR | 10.0 |
| Runs Last 30 | 45 |
| Wickets Last 30 | 1 |

The model learns the relationship between these match states and the eventual outcome.

---

## 📈 Model Performance

The current Logistic Regression model achieved:

| Metric | Score |
|---|---:|
| Training Accuracy | 78.62% |
| Test Accuracy | 78.08% |

The test accuracy is measured on a held-out test set.

Because the application produces probabilities, future evaluation can additionally include probability-oriented metrics such as:

- ROC-AUC
- Log Loss
- Probability calibration

---

## 🌐 Web Application & API

The trained model is exposed through a Flask application.

```text
                    User
                      │
                      ▼
              Web Application
                      │
                      ▼
                   Flask
                 /api/predict
                      │
                      ▼
        Logistic Regression Pipeline
                      │
                      ▼
              Win Probability
```

### API Endpoint

The prediction endpoint accepts the current match state as JSON.

Example request:

```json
{
  "target_runs": 180,
  "current_score": 80,
  "overs_completed": 10,
  "wickets_lost": 3,
  "runs_last_30": 45,
  "wickets_last_30": 1
}
```

Example response:

```json
{
  "win_probability": 40.85,
  "loss_probability": 59.15
}
```

The frontend converts the user's match-state inputs into the required model features and displays the resulting probabilities.

---

## ☁️ Deployment

The application is deployed using **Vercel**.

The deployment workflow is:

```text
Model Training
      ↓
.joblib Model
      ↓
Flask API
      ↓
GitHub
      ↓
Vercel
      ↓
Live Web Application
```

The trained model artifact is stored in:

```text
models/logistic_regression_pipeline.joblib
```

The raw and processed datasets are excluded from the repository through `.gitignore`, while the trained model is retained because it is required for production inference.

---

## 💻 Tech Stack

### Machine Learning

- Python
- Pandas
- NumPy
- Scikit-learn
- Logistic Regression
- Support Vector Machine
- Joblib

### Web Application

- Flask
- HTML
- CSS
- JavaScript

### Development & Deployment

- uv
- Git
- GitHub
- Vercel

---

## 📁 Project Structure

```text
IPL-Win-Probability-predictor/
│
├── app.py                         # Flask application and API
│
├── data/
│   ├── raw/                       # Raw datasets (not tracked)
│   └── processed/                 # Processed datasets (not tracked)
│
├── models/
│   └── logistic_regression_pipeline.joblib
│
├── notebooks/                     # Exploratory analysis and experimentation
├── reports/                       # Analysis and results
│
├── src/
│   ├── train_model.py             # Model training
│   └── test_model.py              # Model inference testing
│
├── public/
│   ├── style.css                  # Frontend styling
│   └── script.js                  # Frontend logic
│
├── templates/
│   └── index.html                 # Web interface
│
├── .gitignore
├── pyproject.toml
├── requirements.txt
├── uv.lock
└── README.md
```

---

## ⚙️ Running Locally

### 1. Clone the repository

```bash
git clone https://github.com/RavenKing45/IPL-Win-Probability-predictor.git
cd IPL-Win-Probability-predictor
```

### 2. Install dependencies

Using `uv`:

```bash
uv sync
```

### 3. Start the Flask application

```bash
uv run flask --app app run
```

The application will be available at:

```text
http://127.0.0.1:5000
```

---

## 🔄 Retraining the Model

The model can be retrained using:

```bash
uv run python src/train_model.py
```

The trained pipeline is saved to:

```text
models/logistic_regression_pipeline.joblib
```

After retraining, the updated model can be committed and pushed to GitHub. Vercel will automatically create a new deployment.

---

## 🔮 Future Improvements

Potential improvements include:

- Probability calibration
- ROC-AUC and log-loss evaluation
- Match-wise train/test splitting to reduce potential match-level leakage
- Comparison with tree-based models such as Random Forest, XGBoost, and CatBoost
- Improved handling of DLS/rain-affected matches
- More extensive hyperparameter tuning
- Feature selection and additional momentum features
- Win-probability visualization throughout an innings
- Real-time match data integration
- More extensive validation across IPL seasons
- Model interpretability and feature analysis

---

## 👨‍💻 Author

**Raven King**

B.Tech — Data Science & AI
