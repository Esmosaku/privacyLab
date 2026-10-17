# PrivacyLab ML Pipeline

This folder trains fraud-detection models with and without differential privacy, measures what privacy costs in dollars, and measures how much a small bank gains by pooling data. Its only output is `public/results/experiment.json`, which powers the app.

## Key findings

| Model | Fraud caught (recall) | Total cost* | Pooling gain for Bank A |
| --- | --- | --- | --- |
| No privacy | 83.8% | $2,653 | $10 |
| ε = 10 | 83.4% | $2,662 | $650 |
| ε = 2 | 68.3% | $4,367 | $1,861 |
| ε = 0.5 | 52.5% | $6,738 | $2,732 |

\*Per 56,962 test transactions (99 fraud). Private models are averages of 5 runs.

- Weak privacy (ε = 10) is nearly free; strong privacy (ε = 0.5) costs about 2.5× more, mostly from missed fraud.
- Strong privacy is unpredictable: at ε = 0.5, recall ranged from 35% to 72% across runs.
- The stronger the privacy, the more pooling data helps.

## Data

We use the [ULB Credit Card Fraud Detection dataset](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud) (Machine Learning Group, Université Libre de Bruxelles): 284,807 European card transactions from 2013, 492 of them fraud. Features `V1`–`V28` were anonymized by the dataset creators; we also use `Amount`.

The dataset is not committed to this repo. Download `creditcard.csv` from Kaggle and place it at `ml/data/creditcard.csv`.

Two banks are simulated by a seeded random 30/70 split (Bank A / Bank B).

## How to run

Requires Python 3.9+.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r ml/requirements.txt

python ml/run.py          # runs the full pipeline and writes public/results/experiment.json
pytest ml/tests -v        # validates the exported JSON
```

Everything is seeded (`seed = 42`), so rerunning reproduces the same results.

## Pipeline

| Step | File | What it does |
| --- | --- | --- |
| Settings | `config.py` | Seed, feature bounds, `data_norm`, ε levels, review cost |
| 1. Load | `load_data.py` | Loads the CSV and assigns Bank A / Bank B |
| 2. Split | `split.py` | Stratified 60/20/20 train / validation / test |
| 3. Preprocess | `preprocess.py` | Clips features to fixed bounds and caps each row's norm at 3.0 |
| 4. Train | `train.py` | Baseline logistic regression + diffprivlib models at ε = 10, 2, 0.5 (5 seeds each) |
| 5. Evaluate | `evaluate.py` | Picks cost-minimizing thresholds on validation; grades on test |
| 6. Pool + export | `export.py` | Bank A solo vs. pooled comparison; writes the JSON |
| Run all | `run.py` | Runs steps 1–6 in order |
| Tests | `tests/test_schema.py` | Checks schema, invariants, and that there are no NaNs |

## Privacy details

- **Mechanism:** diffprivlib's differentially private logistic regression (pure ε-DP, δ = 0)
- **Adjacency:** adding or removing one transaction
- **Bounds:** `V1`–`V28` clipped to [-5, 5]; `Amount` log-transformed with a $5,000 cap; every row's L2 norm capped at `data_norm = 3.0`. All bounds are fixed in advance, never computed from the data.
- **Scope:** the guarantee covers model training only. Thresholds are tuned on a separate validation set without privacy protection.

See [`ASSUMPTIONS.md`](ASSUMPTIONS.md) for every design choice and its limitations.