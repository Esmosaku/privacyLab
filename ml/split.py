"""Split the real dataset into train/validation/test, stratified on Class.

One global stratified split -- NOT a separate split per bank. See
ASSUMPTIONS.md for why: banks are a random split of one population, so
Bank A's training data is just the Bank A rows within this shared train
set, and every model (solo or pooled) is evaluated on the same shared test
set rather than Bank A's own (much smaller) test slice.

Writes ml/data/{train,validation,test}.csv -- each keeps the bank column.

Run: python ml/split.py
"""

import pandas as pd
from config import DATA_DIR, LABEL_COLUMN, SEED, SPLIT
from load_data import load_with_banks
from sklearn.model_selection import train_test_split


def split_data(df: pd.DataFrame) -> dict[str, pd.DataFrame]:
    train_df, temp_df = train_test_split(
        df,
        test_size=SPLIT["validation"] + SPLIT["test"],
        stratify=df[LABEL_COLUMN],
        random_state=SEED,
    )

    # temp_df is 40% of the data; split it 50/50 to get 20% validation, 20% test.
    val_fraction_of_temp = SPLIT["test"] / (SPLIT["validation"] + SPLIT["test"])
    validation_df, test_df = train_test_split(
        temp_df,
        test_size=val_fraction_of_temp,
        stratify=temp_df[LABEL_COLUMN],
        random_state=SEED,
    )

    return {"train": train_df, "validation": validation_df, "test": test_df}


def print_summary(splits: dict[str, pd.DataFrame]) -> None:
    for name, split_df in splits.items():
        n = len(split_df)
        fraud = int(split_df[LABEL_COLUMN].sum())
        print(f"{name:<14} n={n:,}  fraud={fraud:,}  fraud_rate={split_df[LABEL_COLUMN].mean():.4%}")

    train_df = splits["train"]
    bank_a_train = train_df[train_df["bank"] == "A"]
    n = len(bank_a_train)
    fraud = int(bank_a_train[LABEL_COLUMN].sum())
    print(
        f"{'bank_A_train':<14} n={n:,}  fraud={fraud:,}  "
        f"fraud_rate={bank_a_train[LABEL_COLUMN].mean():.4%}"
    )


def main() -> None:
    df = load_with_banks()
    splits = split_data(df)

    for name, split_df in splits.items():
        split_df.to_csv(DATA_DIR / f"{name}.csv", index=False)

    print(f"Loaded {len(df):,} rows")
    print()
    print_summary(splits)


if __name__ == "__main__":
    main()
