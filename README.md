# IPL Win Probability Predictor

A machine learning project that estimates the probability of the **chasing team winning an IPL match** from the current state of the chase.

The project focuses on transforming raw IPL match-level and ball-by-ball data into a model-ready dataset. Each training row represents a snapshot of a chase after a delivery. The modelling pipeline is designed to be extended with additional algorithms and feature-engineering experiments.

## Project Goal

The objective is to predict the outcome of an ongoing IPL chase using the information available at that point in the match, rather than only using final match-level information.

### Current Models

- Logistic Regression
- Support Vector Machine (SVM)

The project is **not limited to these models**. Additional algorithms and experiments will be added as development continues.

## Data Engineering Approach

The raw data is split into two main sources:

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

## Feature Engineering Pipeline

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

## Data Cleaning

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

## Final Dataset

The final dataset combines static match information with dynamic chase-state features.

A typical row represents a state similar to:

| Feature | Example |
|---|---:|
| Current Score | 121 |
| Runs Left | 62 |
| Wickets Lost | 3 |
| Balls Left | 38 |
| CRR | 8.8 |
| RRR | 9.8 |
| Runs Last 30 | 43 |
| Wickets Last 30 | 1 |
| Batting Team | Team A |
| Bowling Team | Team B |

The target indicates whether the batting/chasing team eventually won that match.

The model therefore learns from **match state → eventual outcome**, allowing the system to estimate win probability during the chase.

## Machine Learning

### Logistic Regression

Used as a classification baseline and to estimate the probability of the chasing team winning from the engineered features.

### Support Vector Machine

Used as an additional classification approach so its performance can be compared with the Logistic Regression baseline.

Further models, preprocessing strategies, feature engineering, tuning, and evaluation methods can be added as the project develops.

## Future Work

Planned / possible extensions include:

- additional classification algorithms
- hyperparameter tuning
- feature selection and engineering
- probability calibration
- model evaluation and comparison
- interpretability / feature analysis
- stronger momentum features
- deployment as an interactive prediction application

## Project Status

This project is actively being developed. The current focus is on building a robust ball-by-ball data-engineering pipeline and experimenting with machine-learning approaches for IPL win-probability prediction.
