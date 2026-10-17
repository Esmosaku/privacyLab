"""Train baseline and DP logistic regression models on the pooled (full)
training set.

Baseline: scikit-learn LogisticRegression (max_iter=1000, SEED).
DP: diffprivlib LogisticRegression at each epsilon in EPSILON_LEVELS, with
explicit data_norm (so there must be no PrivacyLeakWarning), N_DP_SEEDS
seeds each (SEED, SEED+1, ... -- tied to config.SEED).

This step only trains models and saves predicted probabilities on
validation and test to ml/data/ (gitignored) for step 5 to use. No
thresholds, no test metrics yet.

Run: python ml/train.py
"""

import warnings

import numpy as np
import pandas as pd
from config import (
    DATA_DIR,
    DATA_NORM,
    EPSILON_LEVELS,
    FEATURE_COLUMNS,
    LABEL_COLUMN,
    N_DP_SEEDS,
    SEED,
)
from diffprivlib.models import LogisticRegression as DPLogisticRegression
from diffprivlib.utils import PrivacyLeakWarning
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score


def epsilon_to_model_id(epsilon: float) -> str:
    return f"eps_{str(epsilon).replace('.', '_')}"


def load_split(name: str) -> pd.DataFrame:
    return pd.read_csv(DATA_DIR / f"{name}_scaled.csv")


def fit_dp(X_train: np.ndarray, y_train: np.ndarray, epsilon: float, seed: int, all_warnings: list):
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        model = DPLogisticRegression(epsilon=epsilon, data_norm=DATA_NORM, random_state=seed)
        model.fit(X_train, y_train)
    all_warnings.extend(caught)
    return model


def main() -> None:
    train_df = load_split("train")
    validation_df = load_split("validation")
    test_df = load_split("test")

    X_train = train_df[FEATURE_COLUMNS].to_numpy()
    y_train = train_df[LABEL_COLUMN].to_numpy()
    X_val = validation_df[FEATURE_COLUMNS].to_numpy()
    y_val = validation_df[LABEL_COLUMN].to_numpy()
    X_test = test_df[FEATURE_COLUMNS].to_numpy()

    proba_val = validation_df[[LABEL_COLUMN, "Amount", "bank"]].copy()
    proba_test = test_df[[LABEL_COLUMN, "Amount", "bank"]].copy()

    all_warnings = []

    print("Training baseline...")
    baseline = LogisticRegression(max_iter=1000, random_state=SEED)
    baseline.fit(X_train, y_train)
    proba_val["baseline"] = baseline.predict_proba(X_val)[:, 1]
    proba_test["baseline"] = baseline.predict_proba(X_test)[:, 1]
    baseline_pr_auc = average_precision_score(y_val, proba_val["baseline"])
    print(f"  baseline  validation PR-AUC = {baseline_pr_auc:.4f}")

    for epsilon in EPSILON_LEVELS:
        model_id = epsilon_to_model_id(epsilon)
        print(f"Training {model_id} ({N_DP_SEEDS} seeds)...")
        seed_pr_aucs = []
        for i in range(N_DP_SEEDS):
            seed = SEED + i
            model = fit_dp(X_train, y_train, epsilon, seed, all_warnings)
            col = f"{model_id}_seed{seed}"
            proba_val[col] = model.predict_proba(X_val)[:, 1]
            proba_test[col] = model.predict_proba(X_test)[:, 1]
            seed_pr_aucs.append(average_precision_score(y_val, proba_val[col]))
        print(
            f"  {model_id}  validation PR-AUC  "
            f"mean={np.mean(seed_pr_aucs):.4f}  "
            f"min={np.min(seed_pr_aucs):.4f}  "
            f"max={np.max(seed_pr_aucs):.4f}"
        )

    leak_warnings = [w for w in all_warnings if issubclass(w.category, PrivacyLeakWarning)]
    print(f"\ndiffprivlib PrivacyLeakWarnings across all fits: {len(leak_warnings)}")
    assert not leak_warnings, "diffprivlib raised a PrivacyLeakWarning -- data_norm isn't being honored!"

    proba_val.to_csv(DATA_DIR / "proba_validation.csv", index=False)
    proba_test.to_csv(DATA_DIR / "proba_test.csv", index=False)
    print(f"\nSaved {DATA_DIR / 'proba_validation.csv'}")
    print(f"Saved {DATA_DIR / 'proba_test.csv'}")


if __name__ == "__main__":
    main()
