// Types for public/results/experiment.json (schema_version 1.0).
// Any change here must be approved by both ML (Esther) and Frontend (Mai).

export interface Experiment {
  schema_version: string;
  is_sample: boolean; // true = fake numbers for UI development
  generated_at: string; // ISO timestamp
  seed: number;
  dataset: Dataset;
  privacy: PrivacyInfo;
  cost_assumptions: CostAssumptions;
  models: ModelResult[]; // ordered: baseline first, then decreasing epsilon
  pooling: Pooling;
}

export interface Dataset {
  synthetic: boolean;
  n_transactions: number;
  fraud_rate: number; // 0..1
  feature_names: string[];
  split: { train: number; validation: number; test: number };
  test_size: number;
  test_fraud_count: number;
  banks: Record<"A" | "B", { n_transactions: number; fraud_rate: number }>;
}

export interface PrivacyInfo {
  library: string;
  mechanism: string;
  delta: number; // 0 = pure epsilon-DP
  data_norm: number;
  adjacency: string;
  feature_bounds: Record<string, [number, number]>;
  threshold_tuned_on: string;
  notes: string;
}

export interface CostAssumptions {
  currency: "USD";
  review_cost_usd: number; // default; UI may let users change it
}

export interface ModelResult {
  id: string; // "baseline" | "eps_10" | "eps_2" | "eps_0_5"
  label: string; // display name
  dp: boolean;
  epsilon: number | null; // null for the non-private baseline
  n_seeds: number; // values below are means across seeds
  threshold: number; // 0..1
  metrics: { recall: number; precision: number; pr_auc: number }; // each 0..1
  confusion: { tp: number; fp: number; fn: number; tn: number };
  cost: {
    missed_fraud_usd: number; // sum of amounts of missed fraud
    false_alarms: number; // equals confusion.fp
    total_usd: number; // at the default review cost
  };
  range: { recall: [number, number]; total_usd: [number, number] }; // min, max across seeds
}

export interface Pooling {
  evaluated_on: string;
  results: PoolingResult[]; // one per model, same ids as models[]
}

export interface PoolingResult {
  model_id: string;
  solo: { recall: number; total_usd: number }; // Bank A trained alone
  pooled: { recall: number; total_usd: number }; // Bank A + B combined
  gain_usd: number; // solo.total_usd - pooled.total_usd
}

// Recompute total cost when the user changes the review cost.
export function totalCost(model: ModelResult, reviewCostUsd: number): number {
  return model.cost.missed_fraud_usd + model.cost.false_alarms * reviewCostUsd;
}