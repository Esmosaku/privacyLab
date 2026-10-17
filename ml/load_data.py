"""Load the real Kaggle ULB credit card fraud dataset and assign Bank A/B.

Replaces the old synthetic generate_data.py. The transactions themselves are
real; the only synthetic part left is the bank label, assigned via a seeded
random 30/70 split, independent of fraud, so both banks see roughly the same
fraud rate and differ only in volume -- Bank A has less data, so pooling
with Bank B should help it (see pooling-gain step later in the pipeline).

Run: python ml/load_data.py
"""

import numpy as np
import pandas as pd
from config import BANK_A_SHARE, LABEL_COLUMN, RAW_DATA_PATH, SEED


def load_with_banks() -> pd.DataFrame:
    df = pd.read_csv(RAW_DATA_PATH)
    rng = np.random.default_rng(SEED)
    df["bank"] = np.where(rng.random(len(df)) < BANK_A_SHARE, "A", "B")
    return df


def print_summary(df: pd.DataFrame) -> None:
    n = len(df)
    fraud_count = int(df[LABEL_COLUMN].sum())
    fraud_rate = df[LABEL_COLUMN].mean()
    print(f"Total transactions: {n:,}")
    print(f"Overall fraud: {fraud_count:,} rows, rate = {fraud_rate:.4%}")
    print()

    print("Per-bank breakdown:")
    for bank in sorted(df["bank"].unique()):
        bank_df = df[df["bank"] == bank]
        bank_fraud = int(bank_df[LABEL_COLUMN].sum())
        print(
            f"  Bank {bank}: {len(bank_df):,} rows "
            f"({len(bank_df) / n:.1%} of total), "
            f"fraud = {bank_fraud:,} rows (rate = {bank_df[LABEL_COLUMN].mean():.4%})"
        )


def main() -> None:
    df = load_with_banks()
    print_summary(df)


if __name__ == "__main__":
    main()
