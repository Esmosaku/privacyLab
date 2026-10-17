"""Choose cost-minimizing thresholds on validation and evaluate on test, for
every model and (for DP) every seed separately.

Reads ml/data/proba_{validation,test}.csv written by train.py. No training
here -- just threshold selection and test metrics.

Run: python ml/evaluate.py
"""

import numpy as np
import pandas as pd
from config import DATA_DIR, EPSILON_LEVELS, N_DP_SEEDS, REVIEW_COST_USD, SEED
from sklearn.metrics import average_precision_score


def epsilon_to_model_id(epsilon: float) -> str:
    return f"eps_{str(epsilon).replace('.', '_')}"


def choose_threshold(y_true: np.ndarray, proba: np.ndarray, amounts: np.ndarray) -> tuple[float, bool]:
    """Sweep thresholds via cumulative sums (sorted by descending proba),
    including the option to flag nothing at all. Returns (threshold, flagged_nothing)."""
    order = np.argsort(-proba)
    y_sorted = y_true[order]
    amounts_sorted = amounts[order]
    proba_sorted = proba[order]

    total_fraud_usd = amounts[y_true == 1].sum()

    cum_fraud_caught_usd = np.cumsum(np.where(y_sorted == 1, amounts_sorted, 0.0))
    cum_fp = np.cumsum(np.where(y_sorted == 0, 1, 0))

    missed_fraud_usd = total_fraud_usd - cum_fraud_caught_usd
    total_cost = missed_fraud_usd + cum_fp * REVIEW_COST_USD

    best_idx = int(np.argmin(total_cost))
    best_cost = float(total_cost[best_idx])
    best_threshold = float(proba_sorted[best_idx])

    flag_nothing_cost = float(total_fraud_usd)  # fp = 0, all fraud missed
    flagged_nothing = flag_nothing_cost <= best_cost
    if flagged_nothing:
        best_threshold = 1.0 + 1e-9  # above every possible probability

    return best_threshold, flagged_nothing


def evaluate(y_true: np.ndarray, proba: np.ndarray, amounts: np.ndarray, threshold: float) -> dict:
    pred = proba >= threshold
    tp = int(((y_true == 1) & pred).sum())
    fp = int(((y_true == 0) & pred).sum())
    fn = int(((y_true == 1) & ~pred).sum())
    tn = int(((y_true == 0) & ~pred).sum())

    assert tp + fp + fn + tn == len(y_true), "confusion matrix doesn't sum to test size!"

    recall = tp / (tp + fn) if (tp + fn) else 0.0
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    pr_auc = float(average_precision_score(y_true, proba))  # cast off numpy.float64 for JSON export

    missed_fraud_usd = float(amounts[(y_true == 1) & ~pred].sum())
    false_alarms = fp
    total_usd = missed_fraud_usd + false_alarms * REVIEW_COST_USD

    result = {
        "threshold": threshold,
        "recall": recall,
        "precision": precision,
        "pr_auc": pr_auc,
        "confusion": {"tp": tp, "fp": fp, "fn": fn, "tn": tn},
        "missed_fraud_usd": missed_fraud_usd,
        "false_alarms": false_alarms,
        "total_usd": total_usd,
    }
    for key in ("recall", "precision", "pr_auc", "missed_fraud_usd", "total_usd"):
        assert not np.isnan(result[key]), f"{key} is NaN!"
    return result


def evaluate_column(val_df: pd.DataFrame, test_df: pd.DataFrame, column: str) -> dict:
    threshold, flagged_nothing = choose_threshold(
        val_df["Class"].to_numpy(), val_df[column].to_numpy(), val_df["Amount"].to_numpy()
    )
    result = evaluate(
        test_df["Class"].to_numpy(), test_df[column].to_numpy(), test_df["Amount"].to_numpy(), threshold
    )
    result["flagged_nothing"] = flagged_nothing
    return result


def aggregate_seeds(seed_results: list) -> dict:
    def mean_of(key):
        return float(np.mean([r[key] for r in seed_results]))

    recall_values = [r["recall"] for r in seed_results]
    total_usd_values = [r["total_usd"] for r in seed_results]

    return {
        "recall_mean": mean_of("recall"),
        "recall_min": float(np.min(recall_values)),
        "recall_max": float(np.max(recall_values)),
        "precision_mean": mean_of("precision"),
        "pr_auc_mean": mean_of("pr_auc"),
        "missed_fraud_usd_mean": mean_of("missed_fraud_usd"),
        "false_alarms_mean": mean_of("false_alarms"),
        "total_usd_mean": mean_of("total_usd"),
        "total_usd_min": float(np.min(total_usd_values)),
        "total_usd_max": float(np.max(total_usd_values)),
        "n_flagged_nothing": sum(1 for r in seed_results if r["flagged_nothing"]),
    }


def evaluate_model_full(val_df: pd.DataFrame, test_df: pd.DataFrame, model_id: str, epsilon, n_seeds: int) -> dict:
    """Full structured result for one model -- used by export.py to build
    the experiment.json `models` entries. For baseline (n_seeds=1), the
    single run's own values are used for both the point estimate and the
    range (min=max=that value)."""
    if model_id == "baseline":
        result = evaluate_column(val_df, test_df, "baseline")
        confusion = {k: float(v) for k, v in result["confusion"].items()}
        return {
            "id": "baseline",
            "epsilon": None,
            "n_seeds": 1,
            "threshold": result["threshold"],
            "metrics": {
                "recall": result["recall"],
                "precision": result["precision"],
                "pr_auc": result["pr_auc"],
            },
            "confusion": confusion,
            "cost": {
                "missed_fraud_usd": result["missed_fraud_usd"],
                "false_alarms": confusion["fp"],
                "total_usd": result["total_usd"],
            },
            "range": {
                "recall": [result["recall"], result["recall"]],
                "total_usd": [result["total_usd"], result["total_usd"]],
            },
            "n_flagged_nothing": int(result["flagged_nothing"]),
        }

    seed_results = [evaluate_column(val_df, test_df, f"{model_id}_seed{SEED + i}") for i in range(n_seeds)]
    agg = aggregate_seeds(seed_results)
    mean_threshold = float(np.mean([r["threshold"] for r in seed_results]))
    mean_confusion = {
        k: float(np.mean([r["confusion"][k] for r in seed_results])) for k in ("tp", "fp", "fn", "tn")
    }
    # Precision from the averaged confusion matrix (mean tp / (mean tp + mean
    # fp)), not the mean of per-seed precisions -- keeps it consistent with
    # the displayed (also averaged) confusion counts. These differ in
    # general: mean(tp_i / (tp_i + fp_i)) != mean(tp_i) / mean(tp_i + fp_i).
    denom = mean_confusion["tp"] + mean_confusion["fp"]
    precision_from_confusion = mean_confusion["tp"] / denom if denom else 0.0
    return {
        "id": model_id,
        "epsilon": epsilon,
        "n_seeds": n_seeds,
        "threshold": mean_threshold,
        "metrics": {
            "recall": agg["recall_mean"],
            "precision": precision_from_confusion,
            "pr_auc": agg["pr_auc_mean"],
        },
        "confusion": mean_confusion,
        "cost": {
            "missed_fraud_usd": agg["missed_fraud_usd_mean"],
            "false_alarms": mean_confusion["fp"],
            "total_usd": agg["total_usd_mean"],
        },
        "range": {
            "recall": [agg["recall_min"], agg["recall_max"]],
            "total_usd": [agg["total_usd_min"], agg["total_usd_max"]],
        },
        "n_flagged_nothing": agg["n_flagged_nothing"],
    }


def main() -> None:
    val_df = pd.read_csv(DATA_DIR / "proba_validation.csv")
    test_df = pd.read_csv(DATA_DIR / "proba_test.csv")

    table = []

    baseline_result = evaluate_column(val_df, test_df, "baseline")
    table.append(
        {
            "model_id": "baseline",
            "recall": baseline_result["recall"],
            "recall_range": None,
            "precision": baseline_result["precision"],
            "pr_auc": baseline_result["pr_auc"],
            "total_usd": baseline_result["total_usd"],
            "total_usd_range": None,
            "flagged_nothing": f"{int(baseline_result['flagged_nothing'])}/1",
        }
    )

    dp_flagged_nothing = 0
    dp_seed_count = 0

    for epsilon in EPSILON_LEVELS:
        model_id = epsilon_to_model_id(epsilon)
        seed_results = [
            evaluate_column(val_df, test_df, f"{model_id}_seed{SEED + i}") for i in range(N_DP_SEEDS)
        ]
        agg = aggregate_seeds(seed_results)
        dp_flagged_nothing += agg["n_flagged_nothing"]
        dp_seed_count += N_DP_SEEDS

        table.append(
            {
                "model_id": model_id,
                "recall": agg["recall_mean"],
                "recall_range": (agg["recall_min"], agg["recall_max"]),
                "precision": agg["precision_mean"],
                "pr_auc": agg["pr_auc_mean"],
                "total_usd": agg["total_usd_mean"],
                "total_usd_range": (agg["total_usd_min"], agg["total_usd_max"]),
                "flagged_nothing": f"{agg['n_flagged_nothing']}/{N_DP_SEEDS}",
            }
        )

    header = f"{'model':<10} {'recall':>8} {'recall range':>16} {'precision':>10} {'pr_auc':>8} {'total_usd':>12} {'total_usd range':>22} {'flag_none':>10}"
    print(header)
    for row in table:
        recall_range = (
            f"[{row['recall_range'][0]:.3f}, {row['recall_range'][1]:.3f}]" if row["recall_range"] else "-"
        )
        usd_range = (
            f"[${row['total_usd_range'][0]:,.0f}, ${row['total_usd_range'][1]:,.0f}]"
            if row["total_usd_range"]
            else "-"
        )
        print(
            f"{row['model_id']:<10} {row['recall']:>8.4f} {recall_range:>16} "
            f"{row['precision']:>10.4f} {row['pr_auc']:>8.4f} ${row['total_usd']:>10,.2f} "
            f"{usd_range:>22} {row['flagged_nothing']:>10}"
        )

    print(f"\nDP seeds that chose 'flag nothing': {dp_flagged_nothing} / {dp_seed_count}")


if __name__ == "__main__":
    main()
