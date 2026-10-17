"""Run the full PrivacyLab ML pipeline: steps 1-6, then export
public/results/experiment.json (step 7).

Run: python ml/run.py
"""

import evaluate
import export
import load_data
import pooling
import preprocess
import split
import train


def main() -> None:
    print("=== Step 1: load data ===")
    load_data.main()

    print("\n=== Step 2: split ===")
    split.main()

    print("\n=== Step 3: preprocess ===")
    preprocess.main()

    print("\n=== Step 4: train ===")
    train.main()

    print("\n=== Step 5: evaluate ===")
    evaluate.main()

    print("\n=== Step 6: pooling ===")
    pooling.main()

    print("\n=== Step 7: export ===")
    export.main()


if __name__ == "__main__":
    main()
