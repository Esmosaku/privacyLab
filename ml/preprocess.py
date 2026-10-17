"""Apply the finalized DP preprocessing (see ASSUMPTIONS.md) to the train,
validation, and test splits from split.py, plus Bank A's training subset.

V1-V28: clip to [-V_CLIP, V_CLIP], divide by V_CLIP -> [-1, 1].
Amount: log1p, clip to [0, AMOUNT_LOG_BOUND], scale to [0, 1] -> amount_scaled.
Then every row's L2 norm (over V1-V28 + amount_scaled) is explicitly clipped
down to DATA_NORM. All bounds come from config.py; nothing is fit on the data.

Raw Amount, Class, and bank are kept alongside the scaled features -- needed
later for dollar-cost math and the solo/pooled bank filter.

Writes ml/data/{train,validation,test,bank_A_train}_scaled.csv.

Run: python ml/preprocess.py
"""

import numpy as np
import pandas as pd
from config import (
    AMOUNT_LOG_BOUND,
    DATA_DIR,
    DATA_NORM,
    FEATURE_COLUMNS,
    LABEL_COLUMN,
    V_CLIP,
    V_COLUMNS,
)


def clip_and_scale(df: pd.DataFrame) -> pd.DataFrame:
    """New frame: scaled V1-V28 + amount_scaled, plus raw Amount/Class/bank."""
    scaled = pd.DataFrame(index=df.index)
    for col in V_COLUMNS:
        scaled[col] = df[col].clip(-V_CLIP, V_CLIP) / V_CLIP

    log_amount = np.log1p(df["Amount"])
    scaled["amount_scaled"] = log_amount.clip(0.0, AMOUNT_LOG_BOUND) / AMOUNT_LOG_BOUND

    scaled["Amount"] = df["Amount"]
    scaled[LABEL_COLUMN] = df[LABEL_COLUMN]
    scaled["bank"] = df["bank"]
    return scaled


def clip_row_norms(df: pd.DataFrame) -> tuple[pd.DataFrame, float, float]:
    """Scale down any row whose L2 norm (over FEATURE_COLUMNS) exceeds
    DATA_NORM. DATA_NORM is a fixed constant, so this is DP-safe."""
    df = df.copy()
    X = df[FEATURE_COLUMNS].to_numpy()
    norms = np.linalg.norm(X, axis=1)
    max_norm_before = float(norms.max())
    clipped_fraction = float((norms > DATA_NORM).mean())

    scale = np.minimum(1.0, DATA_NORM / norms)
    df[FEATURE_COLUMNS] = X * scale[:, None]
    return df, clipped_fraction, max_norm_before


def preprocess(df: pd.DataFrame) -> tuple[pd.DataFrame, float, float]:
    scaled = clip_and_scale(df)
    return clip_row_norms(scaled)


def print_summary(name: str, df: pd.DataFrame, clipped_fraction: float, max_norm_before: float) -> None:
    max_norm_after = float(np.linalg.norm(df[FEATURE_COLUMNS].to_numpy(), axis=1).max())
    print(
        f"{name:<14} shape={df.shape}  "
        f"max_row_norm={max_norm_after:.4f} (before clipping: {max_norm_before:.4f})  "
        f"clipped={clipped_fraction:.4%}"
    )


def main() -> None:
    train_df = pd.read_csv(DATA_DIR / "train.csv")
    validation_df = pd.read_csv(DATA_DIR / "validation.csv")
    test_df = pd.read_csv(DATA_DIR / "test.csv")
    bank_a_train_df = train_df[train_df["bank"] == "A"]

    splits = {
        "train": train_df,
        "validation": validation_df,
        "test": test_df,
        "bank_A_train": bank_a_train_df,
    }

    for name, split_df in splits.items():
        scaled, clipped_fraction, max_norm_before = preprocess(split_df)
        scaled.to_csv(DATA_DIR / f"{name}_scaled.csv", index=False)
        print_summary(name, scaled, clipped_fraction, max_norm_before)


if __name__ == "__main__":
    main()
