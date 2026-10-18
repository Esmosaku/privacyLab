// The trust bar, 0 to 100. The game logic in src/game/engine.ts sets the value.

interface Props {
  value: number;
}

export default function TrustMeter({ value }: Props) {
  return (
    <div className="sr-trust">
      <div className="sr-trust-labels">
        <span>Distrust</span>
        <span>Trust Meter</span>
        <span>Alliance</span>
      </div>
      <div className="sr-trust-track">
        <div className="sr-trust-fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
