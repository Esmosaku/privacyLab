# PrivacyLab

**Privacy has a price. PrivacyLab shows what it is, and when banks should pool their data anyway.**

Built at **DubHacks 2026** (University of Washington) · Chef's Choice track

**Live demo:** privacy-lab-one.vercel.app
---

## The problem

Banks catch more fraud when they train their fraud-detection models on more data, and they'd catch even more by pooling data with other banks. But that data is about real customers, and machine learning models can leak information about the people they were trained on.

There are techniques that protect customers' privacy, like **differential privacy**, but they make models less accurate. So banks face two hard questions:

1. **How much does protecting privacy actually cost?** In missed fraud, false alarms, and dollars.
2. **When is it worth pooling data with another bank?** Especially when you can't be sure the other bank will share too.

## What PrivacyLab does

PrivacyLab answers both questions in two connected parts.

### 1. Experiment Lab: what privacy costs
We trained real fraud-detection models on **284,807 real credit card transactions**, with no privacy protection and at three levels of differential privacy. Pick a privacy level and see:
- how much fraud the model catches, and how many legitimate customers it wrongly flags
- what that costs a bank in dollars (with a slider for the cost of reviewing each false alarm)
- how much a smaller bank gains by pooling its data with a bigger one

### 2. Strategy Room: when to pool
A short game. You run a bank for 6 quarters, and each quarter you choose to **share your fraud data** with a rival bank or **keep it private**. If you both share, you both catch more fraud. If you share and they don't, you exposed your data for nothing.

The twist: **the reward for sharing comes from the measured results in the Experiment Lab.** So the privacy level you choose changes the game:

| Privacy level | Measured pooling gain | What the game tells you |
| --- | --- | --- |
| No privacy | $10 | Don't pool: the gain isn't worth exposing your data |
| Low (ε = 10) | $650 | Don't pool |
| Medium (ε = 2) | $1,861 | Pool only if both banks keep their word |
| High (ε = 0.5) | $2,732 | Pool, with a partner you trust |

Each rival bank has a hidden personality (one copies you, one never forgives a betrayal, one never shares, one is random), revealed at the end along with how much you saved compared to never sharing.

## Key findings

All costs are per 56,962 test transactions (99 of them fraud). Private models are averages of 5 runs.

| Model | Fraud caught | Total cost | Pooling gain for the smaller bank |
| --- | --- | --- | --- |
| No privacy | 83.8% | $2,653 | $10 |
| Low privacy (ε = 10) | 83.4% | $2,662 | $650 |
| Medium privacy (ε = 2) | 68.3% | $4,367 | $1,861 |
| High privacy (ε = 0.5) | 52.5% | $6,738 | $2,732 |

- **Weak privacy is nearly free;** strong privacy costs about 2.5× more, mostly from fraud slipping through.
- **Strong privacy is unpredictable:** at ε = 0.5, the same recipe caught anywhere from 35% to 72% of fraud depending on random noise.
- **The more privacy you need, the more cooperation is worth.** At ε = 0.5, the smaller bank alone catches only 14.6% of fraud; pooled, it catches 52.5%.

> **What is ε (epsilon)?** It's the privacy dial. Smaller ε means stronger privacy: any single customer has less influence on the model, so less can be learned about them. Stronger privacy requires adding more random noise during training, which is what costs accuracy.

## How it works

```
Kaggle credit card data ──▶ Python ML pipeline ──▶ experiment.json ──▶ React web app
(284,807 transactions)      (train, evaluate,       (one results file)    ├─ Experiment Lab
                             measure pooling)                              └─ Strategy Room
```

- **All machine learning runs offline** in Python and writes a single results file, `public/results/experiment.json`.
- **The web app is static.** It loads that file in the browser, so there's no backend and no customer data on the site.
- **Every number shown comes from a real model run.** Nothing is hand-edited, and the results are reproducible with one command.

## Tech stack

| Area | Tools |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Charts | Recharts |
| Machine learning | Python, scikit-learn (baseline model), IBM diffprivlib (differentially private model), NumPy, pandas |
| Testing | pytest (ML results), Vitest (game logic) |
| Code quality | ESLint, Ruff |
| Deployment | Vercel (auto-deploys from `main`) |
| Data | [ULB Credit Card Fraud Detection dataset](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud) |

## Run it locally

**Web app** (requires Node.js):
```bash
npm install
npm run dev      # start at http://localhost:5173
npm test         # game logic tests
npm run build    # production build
```

**ML pipeline** (requires Python 3.9+), only needed to regenerate the results:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r ml/requirements.txt
# download creditcard.csv from Kaggle into ml/data/creditcard.csv
python ml/run.py         # writes public/results/experiment.json
pytest ml/tests -v       # validates the results file
```

## Project structure

```
privacyLab/
├── ml/                          # Python ML pipeline (see ml/README.md)
│   ├── load_data.py, split.py, preprocess.py, train.py, evaluate.py, pooling.py, export.py
│   ├── run.py                   # runs the whole pipeline
│   ├── tests/test_schema.py     # checks the results file
│   └── ASSUMPTIONS.md           # every data and privacy design choice
├── public/
│   ├── results/experiment.json  # ML results (the only link between Python and the app)
│   └── config/game.json         # Strategy Room settings
└── src/
    ├── components/              # Home, About, Experiment Lab, Strategy Room
    ├── game/                    # game rules, rival strategies, tests
    └── types/experiment.ts      # the shape of experiment.json
```

## How we handled privacy honestly

- **Fixed bounds, chosen in advance:** every feature is clipped to fixed limits, and each transaction's overall size is capped, so no single customer can have unlimited influence. Nothing about the scaling is learned from the data, since that would itself leak privacy.
- **Separate data for tuning:** each model's flagging threshold is chosen on a validation set, and the test set is used only once, for final results.
- **Five runs per private model,** reported as averages with ranges, because privacy noise is random.

Full details are in [`ml/README.md`](ml/README.md) and [`ml/ASSUMPTIONS.md`](ml/ASSUMPTIONS.md).

## Limitations

- **The two banks are simulated** by randomly splitting one card issuer's data; real banks have different customers.
- **The data covers two days in 2013** from one European card issuer, so today's fraud patterns differ.
- **The privacy guarantee covers model training only.** Threshold tuning isn't privacy-protected, and the dataset's features were anonymized by its creators before release.
- **In our simulation, pooling means combining data.** In practice, banks would use a trusted third party or techniques like federated learning.
- **In the Strategy Room, only the sharing bonus is measured.** The other payoffs are modeled assumptions, and the app labels them that way.

## Team

- **Esther:** machine learning pipeline and privacy experiments
- **Mai:** frontend and UI design
- **Kai:** game theory and Strategy Room logic
- **Linh:** frontend support, ideating, and testing

## Acknowledgements

Dataset: Machine Learning Group, Université Libre de Bruxelles (Dal Pozzolo et al.), [Credit Card Fraud Detection on Kaggle](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud). Built in about 24 hours at DubHacks 2026.
