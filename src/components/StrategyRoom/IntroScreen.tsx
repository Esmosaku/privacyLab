// Owner: Linh. The first screen: scene-setting, opponent picker, Start and Demo buttons.
// TODO(Linh): "Bank A/B/C" clashes with the ML banks; replace with rival personas.

interface Props {
  opponentId: string;
  onOpponentChange: (id: string) => void;
  onStart: () => void;
  onDemo: () => void;
}

export default function IntroScreen({ opponentId, onOpponentChange, onStart, onDemo }: Props) {
  return (
    <div className="sr-card">
      <p className="sr-intro-text">
        You run a regional bank. Sharing fraud intelligence catches more criminals, but if you share
        and a rival doesn't, you bleed data for nothing.
      </p>
      <label className="sr-label" htmlFor="sr-opponent">Select Opponent Profile</label>
      <select
        id="sr-opponent"
        className="sr-select"
        value={opponentId}
        onChange={(e) => onOpponentChange(e.target.value)}
      >
        <option value="titForTat">Bank A (Unknown Strategy)</option>
        <option value="grimTrigger">Bank B (Unknown Strategy)</option>
        <option value="alwaysSolo">Bank C (Unknown Strategy)</option>
      </select>
      <div className="sr-actions">
        <button className="sr-btn sr-btn-primary" onClick={onStart}>Start Game</button>
        <button className="sr-btn sr-btn-ghost" onClick={onDemo}>Demo Mode</button>
      </div>
    </div>
  );
}
