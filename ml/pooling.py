"""Step 6: pooling comparison -- solo (Bank A only) vs. pooled (Bank A + B).

Solo: baseline + DP (epsilon in EPSILON_LEVELS, N_DP_SEEDS seeds) trained
ONLY on Bank A's training subset (ml/data/bank_A_train_scaled.csv), using
the same preprocessing already applied in step 3. Thresholds are chosen on
the full (both-bank) validation set, same as step 5, and both solo and
pooled are evaluated on the same shared test set -- see ASSUMPTIONS.md for
why (banks are a random split of one population, so Bank A's own test
slice would be too small to trust).

Pooled: the step 5 models, trained on the full training set -- reused from
ml/data/proba_{validation,test}.csv, not retrained here.

gain_usd = solo.total_usd - pooled.total_usd (positive = pooling helped).

Run: python ml/pooling.py
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
from evaluate import aggregate_seeds, epsilon_to_model_id, evaluate_column
from sklearn.linear_model import LogisticRegression


def load_split(name: str) -> pd.DataFrame:
    return pd.read_csv(DATA_DIR / f"{name}_scaled.csv")


def fit_dp(X_train: np.ndarray, y_train: np.ndarray, epsilon: float, seed: int, all_warnings: list):
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        model = DPLogisticRegression(epsilon=epsilon, data_norm=DATA_NORM, random_state=seed)
        model.fit(X_train, y_train)
    all_warnings.extend(caught)
    return model


def train_solo_models(X_train: np.ndarray, y_train: np.ndarray, all_warnings: list) -> dict:
    """model_id -> list of fitted models (1 for baseline, N_DP_SEEDS for DP)."""
    models = {}
    baseline = LogisticRegression(max_iter=1000, random_state=SEED)
    baseline.fit(X_train, y_train)
    models["baseline"] = [baseline]

    for epsilon in EPSILON_LEVELS:
        model_id = epsilon_to_model_id(epsilon)
        models[model_id] = [
            fit_dp(X_train, y_train, epsilon, SEED + i, all_warnings) for i in range(N_DP_SEEDS)
        ]
    return models


def predict_proba_frame(models: dict, X: np.ndarray, base_df: pd.DataFrame) -> pd.DataFrame:
    frame = base_df[[LABEL_COLUMN, "Amount", "bank"]].copy()
    for model_id, fitted in models.items():
        if model_id == "baseline":
            frame["baseline"] = fitted[0].predict_proba(X)[:, 1]
        else:
            for i, model in enumerate(fitted):
                frame[f"{model_id}_seed{SEED + i}"] = model.predict_proba(X)[:, 1]
    return frame


def evaluate_all(proba_val: pd.DataFrame, proba_test: pd.DataFrame) -> dict:
    """Same aggregation evaluate.py uses for the pooled models, applied here
    to whichever proba frames are passed in (solo or pooled)."""
    results = {}

    baseline_result = evaluate_column(proba_val, proba_test, "baseline")
    results["baseline"] = {
        "recall": baseline_result["recall"],
        "total_usd": baseline_result["total_usd"],
        "total_usd_min": baseline_result["total_usd"],
        "total_usd_max": baseline_result["total_usd"],
    }

    for epsilon in EPSILON_LEVELS:
        model_id = epsilon_to_model_id(epsilon)
        seed_results = [
            evaluate_column(proba_val, proba_test, f"{model_id}_seed{SEED + i}") for i in range(N_DP_SEEDS)
        ]
        agg = aggregate_seeds(seed_results)
        results[model_id] = {
            "recall": agg["recall_mean"],
            "total_usd": agg["total_usd_mean"],
            "total_usd_min": agg["total_usd_min"],
            "total_usd_max": agg["total_usd_max"],
        }
    return results


def compute_pooling_results() -> tuple[dict, dict, list]:
    """Trains solo models on Bank A's training subset and evaluates them
    alongside the already-trained pooled models (reused from
    ml/data/proba_{validation,test}.csv). Returns (solo_results,
    pooled_results, warnings) -- used by both main() (prints a table) and
    export.py (builds the `pooling` section of experiment.json)."""
    bank_a_train_df = load_split("bank_A_train")
    validation_df = load_split("validation")
    test_df = load_split("test")

    X_train_solo = bank_a_train_df[FEATURE_COLUMNS].to_numpy()
    y_train_solo = bank_a_train_df[LABEL_COLUMN].to_numpy()
    X_val = validation_df[FEATURE_COLUMNS].to_numpy()
    X_test = test_df[FEATURE_COLUMNS].to_numpy()

    all_warnings = []
    solo_models = train_solo_models(X_train_solo, y_train_solo, all_warnings)

    proba_val_solo = predict_proba_frame(solo_models, X_val, validation_df)
    proba_test_solo = predict_proba_frame(solo_models, X_test, test_df)
    solo_results = evaluate_all(proba_val_solo, proba_test_solo)

    proba_val_pooled = pd.read_csv(DATA_DIR / "proba_validation.csv")
    proba_test_pooled = pd.read_csv(DATA_DIR / "proba_test.csv")
    pooled_results = evaluate_all(proba_val_pooled, proba_test_pooled)

    return solo_results, pooled_results, all_warnings


def main() -> None:
    print("Training solo models on Bank A's training subset...")
    solo_results, pooled_results, all_warnings = compute_pooling_results()

    leak_warnings = [w for w in all_warnings if issubclass(w.category, PrivacyLeakWarning)]
    print(f"diffprivlib PrivacyLeakWarnings across solo fits: {len(leak_warnings)}")
    assert not leak_warnings, "diffprivlib raised a PrivacyLeakWarning in solo training!"

    print()
    header = (
        f"{'model':<10} {'solo_recall':>11} {'pooled_recall':>13} "
        f"{'solo_cost':>12} {'pooled_cost':>12} {'gain_usd':>12}"
    )
    print(header)
    model_ids = ["baseline"] + [epsilon_to_model_id(e) for e in EPSILON_LEVELS]
    for model_id in model_ids:
        solo = solo_results[model_id]
        pooled = pooled_results[model_id]
        gain_usd = solo["total_usd"] - pooled["total_usd"]
        print(
            f"{model_id:<10} {solo['recall']:>11.4f} {pooled['recall']:>13.4f} "
            f"${solo['total_usd']:>10,.2f} ${pooled['total_usd']:>10,.2f} ${gain_usd:>10,.2f}"
        )

    print("\nSolo total_usd range across seeds (DP only):")
    for epsilon in EPSILON_LEVELS:
        model_id = epsilon_to_model_id(epsilon)
        solo = solo_results[model_id]
        print(
            f"  {model_id:<10} mean=${solo['total_usd']:,.2f}  "
            f"min=${solo['total_usd_min']:,.2f}  max=${solo['total_usd_max']:,.2f}"
        )


if __name__ == "__main__":
    main()
