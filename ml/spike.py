"""Scratch spike: baseline vs. DP (epsilon=0.5) logistic regression on the
real Kaggle ULB credit card fraud dataset (ml/data/creditcard.csv).

NOT part of the pipeline yet. This is a throwaway check to confirm diffprivlib
behaves correctly on the real data (no privacy-leak warning, every row's norm
respects the declared data_norm) before load_data.py / split.py /
preprocess.py / train.py get rewritten for real data.

Features used: V1-V28 (PCA-anonymized) + Amount, 29 features. Time is dropped
(elapsed seconds in a ~2-day window, not a general fraud signal).

Preprocessing (all fixed public constants, not fit on any split):
- V1-V28: clipped to [-5, 5] and divided by 5, so each lands in [-1, 1].
- Amount: log1p(Amount), clipped to [0, log1p(5000)], scaled to [0, 1].
  log-scaling compresses Amount's long tail so it doesn't dominate the raw
  [0, 5000] linear range the way it would unscaled. Raw (unscaled) Amount is
  kept separately for dollar-cost math.
- data_norm is a fixed constant (3.0, not derived from the feature count),
  and every row's L2 norm is explicitly clipped down to data_norm before
  training. This clipping threshold is a public constant decided in advance,
  so clipping to it is DP-safe (it doesn't depend on what's actually in the
  data, only caps it) -- the same idea as gradient clipping in DP-SGD.

Run: python ml/spike.py
"""

import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from diffprivlib.models import LogisticRegression as DPLogisticRegression
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score
from sklearn.model_selection import train_test_split

SEED = 42
REVIEW_COST_USD = 5
BANK_A_SHARE = 0.30
DATA_PATH = Path(__file__).resolve().parent / "data" / "creditcard.csv"

V_COLUMNS = [f"V{i}" for i in range(1, 29)]
FEATURE_COLUMNS = V_COLUMNS + ["Amount"]

V_CLIP = 5.0
AMOUNT_CLIP_RAW = 5000.0
AMOUNT_LOG_BOUND = float(np.log1p(AMOUNT_CLIP_RAW))
DATA_NORM = 3.0


def clip_and_scale(df: pd.DataFrame) -> pd.DataFrame:
    scaled = pd.DataFrame(index=df.index)
    for col in V_COLUMNS:
        scaled[col] = df[col].clip(-V_CLIP, V_CLIP) / V_CLIP
    log_amount = np.log1p(df["Amount"])
    scaled["Amount"] = log_amount.clip(0.0, AMOUNT_LOG_BOUND) / AMOUNT_LOG_BOUND
    return scaled


def clip_row_norms(X: np.ndarray, data_norm: float) -> tuple[np.ndarray, float, float]:
    """Scale down any row whose L2 norm exceeds data_norm. Data-independent
    (the threshold is a fixed constant), so this doesn't cost privacy budget."""
    norms = np.linalg.norm(X, axis=1)
    clipped_fraction = float((norms > data_norm).mean())
    scale = np.minimum(1.0, data_norm / norms)
    X_clipped = X * scale[:, None]
    return X_clipped, clipped_fraction, float(norms.max())


def choose_threshold(y_true: np.ndarray, proba: np.ndarray, amounts: np.ndarray) -> tuple[float, float]:
    """Sweep thresholds on sorted predicted probability, tracking cost via
    cumulative sums instead of re-scanning the full array per candidate."""
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

    # also consider flagging nothing at all (threshold above every score)
    flag_nothing_cost = float(total_fraud_usd)
    if flag_nothing_cost < best_cost:
        best_cost = flag_nothing_cost
        best_threshold = 1.0 + 1e-9

    return best_threshold, best_cost


def evaluate(y_true: np.ndarray, proba: np.ndarray, amounts: np.ndarray, threshold: float) -> dict:
    pred = proba >= threshold
    tp = int(((y_true == 1) & pred).sum())
    fp = int(((y_true == 0) & pred).sum())
    fn = int(((y_true == 1) & ~pred).sum())
    tn = int(((y_true == 0) & ~pred).sum())

    recall = tp / (tp + fn) if (tp + fn) else 0.0
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    pr_auc = average_precision_score(y_true, proba)

    missed_fraud_usd = float(amounts[(y_true == 1) & ~pred].sum())
    total_usd = missed_fraud_usd + fp * REVIEW_COST_USD

    return {
        "threshold": threshold,
        "recall": recall,
        "precision": precision,
        "pr_auc": pr_auc,
        "confusion": {"tp": tp, "fp": fp, "fn": fn, "tn": tn},
        "missed_fraud_usd": missed_fraud_usd,
        "total_usd": total_usd,
    }


def print_result(name: str, result: dict) -> None:
    print(f"\n{name}")
    print(f"  threshold:  {result['threshold']:.4f}")
    print(
        f"  recall:     {result['recall']:.4f}   "
        f"precision: {result['precision']:.4f}   "
        f"pr_auc: {result['pr_auc']:.4f}"
    )
    c = result["confusion"]
    print(f"  confusion:  tp={c['tp']}  fp={c['fp']}  fn={c['fn']}  tn={c['tn']}")
    print(f"  missed_fraud_usd: ${result['missed_fraud_usd']:,.2f}   total_usd: ${result['total_usd']:,.2f}")


def main() -> None:
    rng = np.random.default_rng(SEED)
    df = pd.read_csv(DATA_PATH)
    df["bank"] = np.where(rng.random(len(df)) < BANK_A_SHARE, "A", "B")  # unused this spike, kept for later

    train_df, temp_df = train_test_split(df, test_size=0.4, stratify=df["Class"], random_state=SEED)
    val_df, test_df = train_test_split(temp_df, test_size=0.5, stratify=temp_df["Class"], random_state=SEED)

    print(f"train={len(train_df):,}  validation={len(val_df):,}  test={len(test_df):,}")
    print(f"data_norm = {DATA_NORM:.4f} (fixed constant)")

    X_train = clip_and_scale(train_df).to_numpy()
    X_val = clip_and_scale(val_df).to_numpy()
    X_test = clip_and_scale(test_df).to_numpy()
    y_train = train_df["Class"].to_numpy()
    y_val = val_df["Class"].to_numpy()
    y_test = test_df["Class"].to_numpy()
    amounts_val = val_df["Amount"].to_numpy()
    amounts_test = test_df["Amount"].to_numpy()

    print()
    clipped = {}
    for name, X in [("train", X_train), ("validation", X_val), ("test", X_test)]:
        X_clipped, clipped_fraction, max_norm_before = clip_row_norms(X, DATA_NORM)
        clipped[name] = X_clipped
        print(
            f"  {name}: max row norm before clipping = {max_norm_before:.4f}  "
            f"-> {clipped_fraction:.4%} of rows clipped to data_norm {DATA_NORM:.4f}"
        )
    X_train, X_val, X_test = clipped["train"], clipped["validation"], clipped["test"]

    # --- Baseline ---
    baseline = LogisticRegression(max_iter=1000, random_state=SEED)
    baseline.fit(X_train, y_train)

    # --- DP model, epsilon = 0.5, explicit data_norm ---
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        dp_model = DPLogisticRegression(epsilon=0.5, data_norm=DATA_NORM, random_state=SEED)
        dp_model.fit(X_train, y_train)

    leak_warnings = [w for w in caught if "privacy" in str(w.message).lower()]
    unique_messages = sorted({f"{w.category.__name__}: {w.message}" for w in caught})
    print(f"\ndiffprivlib warnings raised: {len(caught)}  (privacy-leak warnings: {len(leak_warnings)})")
    print("  unique warning types seen (noisy DP coefficients saturating the sigmoid during optimization):")
    for msg in unique_messages:
        print(f"    {msg}")

    proba_val_baseline = baseline.predict_proba(X_val)[:, 1]
    proba_val_dp = dp_model.predict_proba(X_val)[:, 1]
    proba_test_baseline = baseline.predict_proba(X_test)[:, 1]
    proba_test_dp = dp_model.predict_proba(X_test)[:, 1]

    threshold_baseline, _ = choose_threshold(y_val, proba_val_baseline, amounts_val)
    threshold_dp, _ = choose_threshold(y_val, proba_val_dp, amounts_val)

    result_baseline = evaluate(y_test, proba_test_baseline, amounts_test, threshold_baseline)
    result_dp = evaluate(y_test, proba_test_dp, amounts_test, threshold_dp)

    print_result("Baseline (no privacy)", result_baseline)
    print_result("DP (epsilon = 0.5)", result_dp)


if __name__ == "__main__":
    main()
