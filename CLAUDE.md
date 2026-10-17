# PrivacyLab — ML pipeline (Esther)

## Project in one paragraph
PrivacyLab is a DubHacks 2026 project (Chef's Choice track + Best Use of VEYZL). It shows the trade-off
between privacy and fraud detection at banks. A static React + TypeScript + Vite app (deployed on Vercel)
has two modules: an Experiment Lab (privacy vs. fraud-detection cost) and a Strategy Room (a stag hunt
game about whether banks should share data). All ML runs offline in Python. Its ONLY output is
`public/results/experiment.json`, which the frontend loads at runtime. I own the Python side.

## The contract with the frontend (do not break)
- Output path: `public/results/experiment.json`
- Schema: must match `src/types/experiment.ts` and the shape of the original sample file exactly.
  Field names, types and nesting are frozen. Schema changes need approval from Mai (frontend).
- Model ids, in this order: `baseline`, `eps_10`, `eps_2`, `eps_0_5`. `pooling.results[].model_id` must match.
- Set `"is_sample": false` in real output.
- No NaN or Infinity anywhere. If a model flags nothing, precision = 0.

## Pipeline (in order)
1. **Load real data** (`ml/load_data.py`):
   the Kaggle ULB credit card fraud dataset, loaded from `ml/data/creditcard.csv` (284,807 transactions,
   492 fraud, fraud rate ~0.173%). Features are `Time`, `V1`–`V28` (PCA-anonymized), and `Amount`;
   label is `Class` (1 = fraud). `Time` is dropped as a model feature (elapsed seconds since the first
   transaction in a ~2-day collection window; not meaningful as a general fraud signal). Each row is
   tagged bank `A` or `B` via a seeded (`numpy.random.default_rng(42)`) random 30/70 split, independent
   of fraud label; A has less data (~30%) so pooling helps it.
   Record every assumption (feature bounds, bank split, dropped columns) in `ml/ASSUMPTIONS.md`.
2. **Split** 60/20/20 train/validation/test, stratified on fraud.
3. **Preprocess for DP**: clip each feature to FIXED public bounds chosen in advance
   (amount [0, 5000], hour [0, 23], distance_from_home [0, 500], txn_count_24h [0, 30], is_online [0, 1]),
   then scale to [0, 1] with those bounds. Do NOT fit a scaler on training data (that leaks privacy).
   `data_norm = sqrt(n_features)`.
4. **Train**: baseline = scikit-learn `LogisticRegression`. Private = `diffprivlib.models.LogisticRegression`
   at epsilon 10, 2, 0.5, always with explicit `data_norm` (there must be no diffprivlib privacy-leak warning).
   Train each DP model with 5 seeds; report means plus min/max ranges for recall and total cost.
5. **Threshold**: per model, choose the threshold on the VALIDATION set that minimizes dollar cost.
   Never tune on train or test.
6. **Evaluate on test**: recall, precision, PR-AUC (`average_precision_score`), confusion matrix (tp, fp, fn, tn).
7. **Dollar cost**: `missed_fraud_usd` = sum of amounts of false negatives; `false_alarms` = fp count;
   `total_usd` = missed_fraud_usd + false_alarms × review_cost_usd (default $5).
8. **Pooling gain**: for each privacy level, train on Bank A only vs. Bank A + B, evaluate both on
   Bank A's test rows. `gain_usd = solo.total_usd - pooled.total_usd`.
9. **Export** `public/results/experiment.json` and validate with `ml/tests/test_schema.py`.

## Privacy facts to state correctly (docs and JSON)
- diffprivlib logistic regression gives pure epsilon-DP: delta = 0. No gradient clipping is involved.
- Adjacency: add or remove one transaction.
- Privacy budget covers training only; thresholds are tuned on a separate validation split.
- Data is the real (anonymized) Kaggle ULB credit card fraud dataset, not synthetic; say so everywhere
  results are shown. Bank A/B is a synthetic seeded split layered on top of real transactions.

## Rules
- Never fabricate or hand-edit results. Every number comes from running the pipeline.
- Everything reproducible from one command: `python ml/run.py`.
- pytest must check: all keys present, metrics in [0, 1], confusion matrix sums to test size,
  costs non-negative, no NaN, model ids match between `models` and `pooling`.
- Sanity-check results before pushing: privacy should generally cost recall; pooling should generally help.
  If not, investigate rather than ship.
- Work on branches and open PRs; `main` is protected and audited by VEYZL.

## Layout
```
ml/
  load_data.py
  train.py
  run.py
  tests/test_schema.py
  ASSUMPTIONS.md
  requirements.txt   (numpy, pandas, scikit-learn, diffprivlib, pytest)
public/results/experiment.json
src/types/experiment.ts
```

## Deadlines (Saturday)
- ~2:30 PM: synthetic data + baseline working
- ~4:30 PM: DP models verified
- 5:30 PM: real `experiment.json` pushed for the integration checkpoint (5:30–6:30)
- 9:30 PM: feature freeze

## How I want to work
Explain what each step does before writing large chunks of code. Build one script at a time and run it. 
Keep code readable; I need to explain it to judges.