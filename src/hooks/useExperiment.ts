import { useEffect, useState } from "react";
import type { Experiment } from "../types/experiment";

export function useExperiment() {
  const [data, setData] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadExperiment() {
      try {
        const response = await fetch("/results/experiment.json", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Could not load experiment results (${response.status}).`,
          );
        }

        const experiment: Experiment = await response.json();

        if (!controller.signal.aborted) {
          setData(experiment);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong loading experiment results.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadExperiment();

    return () => controller.abort();
  }, []);

  return { data, loading, error };
}