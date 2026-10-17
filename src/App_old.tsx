import ExperimentLab from "./components/ExperimentLab";
import { useExperiment } from "./hooks/useExperiment";

export default function App() {
  const { data, loading, error } = useExperiment();

  if (loading) {
    return <p>Loading experiment results...</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (!data) {
    return <p>No experiment results available.</p>;
  }

  return <ExperimentLab data={data} />;
}