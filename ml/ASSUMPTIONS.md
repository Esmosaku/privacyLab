# Assumptions

Every modeling choice behind the real-data pipeline, recorded so results are
reproducible and explainable. Seed: `numpy.random.default_rng(42)`.

## Data source

- Real transactions: the Kaggle ULB credit card fraud dataset
  (`ml/data/creditcard.csv`), 284,807 transactions, 492 fraud (~0.173%).
  Features are `Time`, `V1`-`V28` (PCA-anonymized), `Amount`; label is
  `Class` (1 = fraud).
- `Time` is dropped as a model feature: it's elapsed seconds since the first
  transaction in this dataset's ~2-day collection window, not a general
  fraud signal that would transfer beyond this specific snapshot.
- Say "real (anonymized) data" everywhere results are shown — this is not
  synthetic data.

## Bank A/B assignment

- `bank` is the one synthetic part of the pipeline: assigned independently
  of `Class` via a seeded random 30/70 split
  (`rng.random(n) < 0.30` -> Bank A, else Bank B). Both banks end up with
  approximately the same fraud rate; Bank A just has less data (~30% of
  rows), so pooling with Bank B should help it in the pooling-gain step.

## Preprocessing (final, validated in `ml/spike.py`)

All bounds below are FIXED public constants, chosen in advance and never
fit on any split (fitting a scaler on training data would leak information
about that split into a value that's supposed to be a public constant).

- **V1-V28**: clip to `[-5, 5]`, divide by 5 -> `[-1, 1]`.
  Chosen over the dataset's full observed range (down to -113, up to 120)
  because those bounds were almost entirely wasted on a handful of extreme
  outliers — a wide bound gives every normal row a value near 0, which
  starves the model (and the DP noise budget) of resolution where the real
  signal lives. `[-5, 5]` keeps the bulk of the distribution spread across
  the usable range instead.
- **Amount**: `log1p(Amount)`, clipped to `[0, log1p(5000)]`, scaled to
  `[0, 1]`. Log-scaling compresses the long tail (amounts run from $0 to
  $25,691.16) so a handful of large transactions don't dominate the
  feature the way they would on a linear scale. The raw (unscaled, un-logged)
  `Amount` is kept separately alongside the model features — it's needed
  for dollar-cost math (`missed_fraud_usd`, `total_usd`) and must never be
  the log/scaled version.
- **`data_norm = 3.0`**, a fixed constant — NOT `sqrt(n_features)`. Every
  row's L2 norm is explicitly clipped down to 3.0 before training (if a
  row's natural norm exceeds 3.0, it's rescaled down; rows already under
  3.0 are untouched). This is DP-safe because the threshold itself is a
  public constant decided in advance, independent of what's actually in
  the data — the same idea as gradient clipping in DP-SGD. Measured in the
  spike: with the bounds above, only ~0.3% of rows in any split exceed
  norm 3.0 before clipping, so this discards very little information while
  giving diffprivlib a much tighter (and less noisy) data_norm to work with
  than the theoretical worst case (`sqrt(29) ≈ 5.39`).

## Row-norm clipping hits fraud rows much harder than normal rows

Checked in the train set: **46.8% of fraud rows** get their L2 norm clipped
down to `data_norm = 3.0`, versus only **0.23% of non-fraud rows** (138 of
295 fraud rows, vs. 396 of 170,589 non-fraud rows). Fraud transactions in
this dataset tend to have larger-magnitude PCA components (that's part of
why they're separable at all), so they're disproportionately likely to sit
above the norm cap and get shrunk toward the origin before training.

This is still DP-safe — the 3.0 threshold is a fixed constant, not derived
from the data — but it means the clipping isn't neutral: it specifically
dampens the signal on the minority class we most want to detect. Worth
re-checking if DP recall looks worse than expected, and a candidate thing
to tune later if so (e.g. a slightly higher data_norm) rather than treating
the current value as untouchable.

The baseline (non-DP) model is trained on this same row-clipped data, so
model-to-model differences in the results isolate the effect of DP noise
specifically, not a mix of DP noise plus a preprocessing difference. The
tradeoff: a baseline without row-norm clipping (not needed for a non-private
model, which has no data_norm to honor) would likely perform somewhat
better than what's reported here, since it wouldn't lose the extra fraud
signal that clipping discards. The baseline numbers in this pipeline should
be read as "logistic regression under DP-compatible preprocessing," not
the best a non-private logistic regression could do on this data.

## Why this preprocessing, not the first attempt

An earlier version used `[-30, 30]` bounds for V1-V28 (the dataset's
near-full range) and linear Amount scaling with `data_norm = sqrt(29)`. That
produced a numerically unstable DP fit: diffprivlib's optimizer pushed
coefficients to extreme magnitudes (|coef| > 50), causing sigmoid saturation
and a degenerate "flag nothing" model at epsilon=0.5. The tighter bounds and
explicit row-norm clipping above fixed this — same epsilon=0.5 setup went
from recall=0% to recall=72% in a one-seed spike run.

## Evaluation: one shared test set, not per-bank

Because banks were simulated by a random split, both banks' data follow the
same distribution. We grade all models on one shared held-out test set for
more stable estimates (Bank A's own test slice would have only ~29 fraud
cases). The test set is never used for training. With real banks whose
customers differ, each bank should be evaluated on its own data.

Concretely: one global stratified 60/20/20 split is done on the full
(Bank A + Bank B) dataset. Bank A's training data is the Bank A rows within
that shared 60% train set -- not a separate per-bank split. Every model,
solo (Bank A only) or pooled (Bank A + B), is evaluated on the same shared
20% test set. In the exported JSON, `pooling.evaluated_on` is
`"Shared held-out test set (Banks A and B are random splits of one population)"`.

## Known limitation

A single DP training seed is noisy: in a quick check, `diffprivlib`
`LogisticRegression` at epsilon=0.5 (same data, same epsilon, 5 different
seeds) swung from PR-AUC 0.011 to 0.40. This is why the real pipeline (step
4) trains each DP model with 5 seeds and reports mean plus min/max ranges,
rather than trusting a single run.
