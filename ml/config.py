"""Shared constants for the PrivacyLab ML pipeline (real data: Kaggle ULB
credit card fraud dataset).

Every script (load_data.py, split.py, preprocess.py, train.py, run.py)
imports from here so the seed, paths, and feature definitions are defined
exactly once. See ASSUMPTIONS.md for the reasoning behind these choices.
"""

from pathlib import Path

import numpy as np

# --- Reproducibility ---
SEED = 42

# --- Paths (resolved relative to this file, so scripts work from any cwd) ---
ML_DIR = Path(__file__).resolve().parent
DATA_DIR = ML_DIR / "data"
RAW_DATA_PATH = DATA_DIR / "creditcard.csv"

# --- Dataset ---
LABEL_COLUMN = "Class"
V_COLUMNS = [f"V{i}" for i in range(1, 29)]
# "amount_scaled" (not "Amount") -- the model feature is log1p(Amount) scaled
# to [0, 1]. Raw dollar Amount is kept as its own column for cost math.
FEATURE_COLUMNS = V_COLUMNS + ["amount_scaled"]  # Time is dropped; see ASSUMPTIONS.md

# Bank A gets a smaller share of the data so pooling with Bank B helps it.
# Assigned independently of fraud via a seeded random split.
BANK_A_SHARE = 0.30

# --- Train / validation / test split (stratified on Class) ---
SPLIT = {"train": 0.6, "validation": 0.2, "test": 0.2}

# --- Preprocessing: fixed public constants, never fit on any split ---
# V1-V28: clip to [-V_CLIP, V_CLIP], divide by V_CLIP -> [-1, 1].
V_CLIP = 5.0
# Amount: log1p, clip to [0, AMOUNT_LOG_BOUND], scale to [0, 1].
AMOUNT_CLIP_RAW = 5000.0
AMOUNT_LOG_BOUND = float(np.log1p(AMOUNT_CLIP_RAW))

# data_norm is a fixed constant (not sqrt(n_features)). Every row's L2 norm
# is explicitly clipped down to this before DP training -- the threshold is
# a public constant, so clipping to it doesn't cost privacy budget (same
# idea as gradient clipping in DP-SGD).
DATA_NORM = 3.0

# --- DP training ---
EPSILON_LEVELS = [10, 2, 0.5]
N_DP_SEEDS = 5

# --- Cost model ---
REVIEW_COST_USD = 5
