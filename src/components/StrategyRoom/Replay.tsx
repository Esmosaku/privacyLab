// Owner: Kai. Step through a finished game.
// TODO(Kai): replay starts at "Round 0"; it should start at round 1.

interface Props {
  step: number;
  maxStep: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function Replay({ step, maxStep, onPrev, onNext }: Props) {
  return (
    <div className="sr-card sr-replay">
      <button disabled={step === 0} onClick={onPrev}>Prev</button>
      <strong>Viewing Round {step}</strong>
      <button disabled={step === maxStep} onClick={onNext}>Next</button>
    </div>
  );
}
