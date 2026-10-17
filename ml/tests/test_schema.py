"""Schema and cross-field invariant checks for public/results/experiment.json.

Checks the exported JSON against src/types/experiment.ts and the invariants
documented in CLAUDE.md (confusion sums to test_size, false_alarms equals
confusion.fp, total_usd derives from missed_fraud_usd + false_alarms *
review_cost_usd, gain_usd derives from solo/pooled totals, no NaN/Infinity).

Run: pytest ml/tests/test_schema.py
"""

import json
import math
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
EXPERIMENT_PATH = REPO_ROOT / "public" / "results" / "experiment.json"

EXPECTED_MODEL_IDS = ["baseline", "eps_10", "eps_2", "eps_0_5"]
TOLERANCE = 0.01


@pytest.fixture(scope="module")
def experiment() -> dict:
    with open(EXPERIMENT_PATH, encoding="utf-8") as f:
        return json.load(f)


def is_number(value) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def assert_finite(value, path: str) -> None:
    assert is_number(value), f"{path} is not a number: {value!r}"
    assert not math.isnan(value), f"{path} is NaN"
    assert not math.isinf(value), f"{path} is infinite"


# --- Top-level (Experiment) ---


def test_top_level_fields(experiment):
    for field, typ in [
        ("schema_version", str),
        ("is_sample", bool),
        ("generated_at", str),
    ]:
        assert field in experiment, f"missing field: {field}"
        assert isinstance(experiment[field], typ), f"{field} has wrong type"
    assert_finite(experiment["seed"], "seed")
    for field in ("dataset", "privacy", "cost_assumptions", "models", "pooling"):
        assert field in experiment, f"missing field: {field}"


def test_is_sample_is_false(experiment):
    assert experiment["is_sample"] is False


# --- Dataset ---


def test_dataset_fields(experiment):
    dataset = experiment["dataset"]
    assert isinstance(dataset["synthetic"], bool)
    assert_finite(dataset["n_transactions"], "dataset.n_transactions")
    assert_finite(dataset["fraud_rate"], "dataset.fraud_rate")
    assert 0 <= dataset["fraud_rate"] <= 1

    assert isinstance(dataset["feature_names"], list)
    assert all(isinstance(name, str) for name in dataset["feature_names"])

    split = dataset["split"]
    for key in ("train", "validation", "test"):
        assert key in split
        assert_finite(split[key], f"dataset.split.{key}")

    assert_finite(dataset["test_size"], "dataset.test_size")
    assert_finite(dataset["test_fraud_count"], "dataset.test_fraud_count")

    banks = dataset["banks"]
    assert set(banks.keys()) == {"A", "B"}
    for bank_id, bank in banks.items():
        assert_finite(bank["n_transactions"], f"dataset.banks.{bank_id}.n_transactions")
        assert_finite(bank["fraud_rate"], f"dataset.banks.{bank_id}.fraud_rate")
        assert 0 <= bank["fraud_rate"] <= 1


# --- Privacy ---


def test_privacy_fields(experiment):
    privacy = experiment["privacy"]
    assert isinstance(privacy["library"], str)
    assert isinstance(privacy["mechanism"], str)
    assert_finite(privacy["delta"], "privacy.delta")
    assert privacy["delta"] == 0  # pure epsilon-DP
    assert_finite(privacy["data_norm"], "privacy.data_norm")
    assert isinstance(privacy["adjacency"], str)
    assert isinstance(privacy["threshold_tuned_on"], str)
    assert isinstance(privacy["notes"], str)

    feature_bounds = privacy["feature_bounds"]
    assert isinstance(feature_bounds, dict)
    for name, bounds in feature_bounds.items():
        assert isinstance(bounds, list) and len(bounds) == 2
        low, high = bounds
        assert_finite(low, f"privacy.feature_bounds.{name}[0]")
        assert_finite(high, f"privacy.feature_bounds.{name}[1]")
        assert low <= high


# --- Cost assumptions ---


def test_cost_assumptions(experiment):
    cost_assumptions = experiment["cost_assumptions"]
    assert cost_assumptions["currency"] == "USD"
    assert_finite(cost_assumptions["review_cost_usd"], "cost_assumptions.review_cost_usd")
    assert cost_assumptions["review_cost_usd"] >= 0


# --- Models ---


def test_model_ids_in_order(experiment):
    ids = [model["id"] for model in experiment["models"]]
    assert ids == EXPECTED_MODEL_IDS


@pytest.mark.parametrize("model_id", EXPECTED_MODEL_IDS)
def test_model_schema_and_invariants(experiment, model_id):
    models_by_id = {m["id"]: m for m in experiment["models"]}
    model = models_by_id[model_id]
    review_cost_usd = experiment["cost_assumptions"]["review_cost_usd"]
    test_size = experiment["dataset"]["test_size"]

    assert isinstance(model["id"], str)
    assert isinstance(model["label"], str)
    assert isinstance(model["dp"], bool)
    assert model["epsilon"] is None or is_number(model["epsilon"])
    assert_finite(model["n_seeds"], f"{model_id}.n_seeds")
    assert_finite(model["threshold"], f"{model_id}.threshold")
    assert 0 <= model["threshold"] <= 1

    metrics = model["metrics"]
    for key in ("recall", "precision", "pr_auc"):
        assert_finite(metrics[key], f"{model_id}.metrics.{key}")
        assert 0 <= metrics[key] <= 1, f"{model_id}.metrics.{key} out of [0, 1]: {metrics[key]}"

    confusion = model["confusion"]
    for key in ("tp", "fp", "fn", "tn"):
        assert_finite(confusion[key], f"{model_id}.confusion.{key}")
        assert confusion[key] >= 0

    confusion_sum = confusion["tp"] + confusion["fp"] + confusion["fn"] + confusion["tn"]
    assert (
        abs(confusion_sum - test_size) <= TOLERANCE
    ), f"{model_id} confusion matrix sums to {confusion_sum}, expected {test_size}"

    cost = model["cost"]
    for key in ("missed_fraud_usd", "false_alarms", "total_usd"):
        assert_finite(cost[key], f"{model_id}.cost.{key}")
        assert cost[key] >= 0, f"{model_id}.cost.{key} is negative"

    assert cost["false_alarms"] == pytest.approx(confusion["fp"], abs=TOLERANCE)

    expected_total = cost["missed_fraud_usd"] + cost["false_alarms"] * review_cost_usd
    assert cost["total_usd"] == pytest.approx(expected_total, abs=TOLERANCE)

    denom = confusion["tp"] + confusion["fp"]
    expected_precision = confusion["tp"] / denom if denom else 0.0
    assert metrics["precision"] == pytest.approx(
        expected_precision, abs=TOLERANCE
    ), f"{model_id} precision {metrics['precision']} != tp/(tp+fp) {expected_precision}"

    range_ = model["range"]
    for key in ("recall", "total_usd"):
        low, high = range_[key]
        assert_finite(low, f"{model_id}.range.{key}[0]")
        assert_finite(high, f"{model_id}.range.{key}[1]")
        assert low <= high, f"{model_id}.range.{key} has min > max"


def test_baseline_is_not_dp(experiment):
    models_by_id = {m["id"]: m for m in experiment["models"]}
    baseline = models_by_id["baseline"]
    assert baseline["dp"] is False
    assert baseline["epsilon"] is None


@pytest.mark.parametrize("model_id", ["eps_10", "eps_2", "eps_0_5"])
def test_dp_models_have_epsilon(experiment, model_id):
    models_by_id = {m["id"]: m for m in experiment["models"]}
    model = models_by_id[model_id]
    assert model["dp"] is True
    assert model["epsilon"] is not None


# --- Pooling ---


def test_pooling_ids_match_models(experiment):
    model_ids = [m["id"] for m in experiment["models"]]
    pooling_ids = [r["model_id"] for r in experiment["pooling"]["results"]]
    assert pooling_ids == model_ids


def test_pooling_evaluated_on_is_string(experiment):
    assert isinstance(experiment["pooling"]["evaluated_on"], str)
    assert experiment["pooling"]["evaluated_on"]


@pytest.mark.parametrize("model_id", EXPECTED_MODEL_IDS)
def test_pooling_result_invariants(experiment, model_id):
    results_by_id = {r["model_id"]: r for r in experiment["pooling"]["results"]}
    result = results_by_id[model_id]

    for group in ("solo", "pooled"):
        entry = result[group]
        assert_finite(entry["recall"], f"pooling.{model_id}.{group}.recall")
        assert 0 <= entry["recall"] <= 1
        assert_finite(entry["total_usd"], f"pooling.{model_id}.{group}.total_usd")
        assert entry["total_usd"] >= 0

    assert_finite(result["gain_usd"], f"pooling.{model_id}.gain_usd")
    expected_gain = result["solo"]["total_usd"] - result["pooled"]["total_usd"]
    assert result["gain_usd"] == pytest.approx(expected_gain, abs=TOLERANCE)


# --- Whole-document sweep ---


def test_no_nan_or_infinity_anywhere(experiment):
    def walk(obj, path):
        if isinstance(obj, dict):
            for key, value in obj.items():
                walk(value, f"{path}.{key}")
        elif isinstance(obj, list):
            for i, value in enumerate(obj):
                walk(value, f"{path}[{i}]")
        elif isinstance(obj, float):
            assert not math.isnan(obj), f"NaN at {path}"
            assert not math.isinf(obj), f"Infinity at {path}"

    walk(experiment, "experiment")
