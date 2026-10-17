"""Step 7: export public/results/experiment.json, matching
src/types/experiment.ts exactly.

Assumes steps 1-6 have already run and written their files under ml/data/
(run.py does this before calling export.main()). Rounds metrics/thresholds
to 4 decimals, dollar amounts to 2, and asserts no NaN/Inf anywhere before
writing.

Run: python ml/export.py   (or via run.py, which runs steps 1-6 first)
"""

import json
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from config import (
    AMOUNT_CLIP_RAW,
    DATA_DIR,
    DATA_NORM,
    EPSILON_LEVELS,
    ML_DIR,
    N_DP_SEEDS,
    REVIEW_COST_USD,
    SEED,
    SPLIT,
    V_CLIP,
    V_COLUMNS,
)
from evaluate import epsilon_to_model_id, evaluate_model_full
from load_data import load_with_banks
from pooling import compute_pooling_results

EXPORT_PATH = ML_DIR.parent / "public" / "results" / "experiment.json"

MODEL_LABELS = {
    "baseline": "No privacy",
    "eps_10": "Low privacy (ε = 10)",
    "eps_2": "Medium privacy (ε = 2)",
    "eps_0_5": "High privacy (ε = 0.5)",
}


def build_dataset_section(full_df: pd.DataFrame, test_df: pd.DataFrame) -> dict:
    banks = {}
    for bank in ("A", "B"):
        bank_df = full_df[full_df["bank"] == bank]
        banks[bank] = {
            "n_transactions": len(bank_df),
            "fraud_rate": round(float(bank_df["Class"].mean()), 6),
        }

    return {
        "synthetic": False,
        "n_transactions": len(full_df),
        "fraud_rate": round(float(full_df["Class"].mean()), 6),
        "feature_names": V_COLUMNS + ["Amount"],
        "split": SPLIT,
        "test_size": len(test_df),
        "test_fraud_count": int(test_df["Class"].sum()),
        "banks": banks,
    }


def build_privacy_section() -> dict:
    feature_bounds = {col: [-V_CLIP, V_CLIP] for col in V_COLUMNS}
    feature_bounds["Amount"] = [0.0, AMOUNT_CLIP_RAW]

    notes = (
        "Amount is log1p-transformed and scaled to [0, 1] before training; "
        "the bounds above are the pre-log1p raw-dollar clipping bounds, not "
        "the transformed training range. Every row's L2 norm is explicitly "
        "clipped down to data_norm before training -- this clipping is "
        "data-independent (the threshold is a fixed public constant), the "
        "same idea as gradient clipping in DP-SGD, so it does not cost "
        "privacy budget. The privacy guarantee covers training only; "
        "thresholds are tuned on a separate validation split, which is not "
        "privacy-protected."
    )

    return {
        "library": "diffprivlib",
        "mechanism": "Differentially private logistic regression",
        "delta": 0,
        "data_norm": DATA_NORM,
        "adjacency": "Add or remove one transaction",
        "feature_bounds": feature_bounds,
        "threshold_tuned_on": "validation",
        "notes": notes,
    }


def build_cost_assumptions_section() -> dict:
    return {"currency": "USD", "review_cost_usd": REVIEW_COST_USD}


def round_model_result(result: dict) -> dict:
    return {
        "id": result["id"],
        "label": MODEL_LABELS[result["id"]],
        "dp": result["epsilon"] is not None,
        "epsilon": result["epsilon"],
        "n_seeds": result["n_seeds"],
        "threshold": round(result["threshold"], 4),
        "metrics": {k: round(v, 4) for k, v in result["metrics"].items()},
        "confusion": {k: round(v, 2) for k, v in result["confusion"].items()},
        "cost": {
            "missed_fraud_usd": round(result["cost"]["missed_fraud_usd"], 2),
            "false_alarms": round(result["cost"]["false_alarms"], 2),
            "total_usd": round(result["cost"]["total_usd"], 2),
        },
        "range": {
            "recall": [round(v, 4) for v in result["range"]["recall"]],
            "total_usd": [round(v, 2) for v in result["range"]["total_usd"]],
        },
    }


def build_models_section(proba_val: pd.DataFrame, proba_test: pd.DataFrame) -> list:
    baseline_full = evaluate_model_full(proba_val, proba_test, "baseline", None, 1)
    models = [round_model_result(baseline_full)]
    for epsilon in EPSILON_LEVELS:
        model_id = epsilon_to_model_id(epsilon)
        full = evaluate_model_full(proba_val, proba_test, model_id, epsilon, N_DP_SEEDS)
        models.append(round_model_result(full))
    return models


def build_pooling_section(solo_results: dict, pooled_results: dict) -> dict:
    model_ids = ["baseline"] + [epsilon_to_model_id(e) for e in EPSILON_LEVELS]
    results = []
    for model_id in model_ids:
        solo = solo_results[model_id]
        pooled = pooled_results[model_id]
        gain_usd = solo["total_usd"] - pooled["total_usd"]
        results.append(
            {
                "model_id": model_id,
                "solo": {"recall": round(solo["recall"], 4), "total_usd": round(solo["total_usd"], 2)},
                "pooled": {
                    "recall": round(pooled["recall"], 4),
                    "total_usd": round(pooled["total_usd"], 2),
                },
                "gain_usd": round(gain_usd, 2),
            }
        )
    return {
        "evaluated_on": "Shared held-out test set (Banks A and B are random splits of one population)",
        "results": results,
    }


def assert_no_nan(obj, path: str = "") -> None:
    if isinstance(obj, dict):
        for key, value in obj.items():
            assert_no_nan(value, f"{path}.{key}")
    elif isinstance(obj, list):
        for i, value in enumerate(obj):
            assert_no_nan(value, f"{path}[{i}]")
    elif isinstance(obj, float):
        assert not (np.isnan(obj) or np.isinf(obj)), f"NaN/Inf at {path}: {obj}"


def main() -> None:
    full_df = load_with_banks()
    proba_val = pd.read_csv(DATA_DIR / "proba_validation.csv")
    proba_test = pd.read_csv(DATA_DIR / "proba_test.csv")

    dataset_section = build_dataset_section(full_df, proba_test)
    privacy_section = build_privacy_section()
    cost_assumptions_section = build_cost_assumptions_section()
    models_section = build_models_section(proba_val, proba_test)

    solo_results, pooled_results, _warnings = compute_pooling_results()
    pooling_section = build_pooling_section(solo_results, pooled_results)

    experiment = {
        "schema_version": "1.0",
        "is_sample": False,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "seed": SEED,
        "dataset": dataset_section,
        "privacy": privacy_section,
        "cost_assumptions": cost_assumptions_section,
        "models": models_section,
        "pooling": pooling_section,
    }

    assert_no_nan(experiment)

    EXPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(EXPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(experiment, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Wrote {EXPORT_PATH}")


if __name__ == "__main__":
    main()
