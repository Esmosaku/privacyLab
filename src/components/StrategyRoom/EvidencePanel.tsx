// Measured ML results for the privacy level chosen in the Experiment Lab.
// Numbers here are dollars from experiment.json (measured); game scores are points (modeled).
// TODO: pass the chosen modelId in from App.tsx so this stops defaulting to the baseline.

import type { Experiment } from "../../types/experiment";

interface Props {
  experiment: Experiment;
  modelId: string;
}

export default function EvidencePanel({ experiment, modelId }: Props) {
  const results = experiment.pooling.results;
  const result = results.find((r) => r.model_id === modelId) ?? results[0];
  if (!result) return null;

  return (
    <div className="sr-card sr-evidence">
      <div className="sr-evidence-header">
        <h3>Machine Learning Evidence</h3>
        <div className="sr-evidence-meta">
          {experiment.is_sample && <span className="sr-badge sr-badge-sample">Sample Data</span>}
          <span className="sr-measured">Measured in<br />Experiment Lab</span>
        </div>
      </div>
      <p>Solo Recall: {(result.solo.recall * 100).toFixed(1)}%</p>
      <p>Pooled Recall: {(result.pooled.recall * 100).toFixed(1)}%</p>
      <p className="sr-gain">Pooling Gain: +${result.gain_usd.toLocaleString()}</p>
    </div>
  );
}
