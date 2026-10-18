// Owner: Kai (logic) + Linh (wording). Shown after the last round.
// TODO(Kai): say which equilibrium the game ended in, and show the strategy in plain English, not its code id.
// TODO(Linh): make the lesson depend on what actually happened.

interface Props {
  opponentId: string;
  onReplay: () => void;
  onPlayAgain: () => void;
}

export default function Debrief({ opponentId, onReplay, onPlayAgain }: Props) {
  return (
    <div className="sr-card sr-debrief">
      <h3>Game Over</h3>
      <p>Opponent Strategy Revealed: <strong>{opponentId}</strong></p>
      <p className="sr-lesson">
        Lesson: Trust is hard to build and easy to destroy, but mutual sharing remains the mathematically
        superior long-term play.
      </p>
      <div className="sr-debrief-actions">
        <button className="sr-btn sr-btn-primary" onClick={onReplay}>View Replay</button>
        <button className="sr-btn sr-btn-accent" onClick={onPlayAgain}>Play Again</button>
      </div>
    </div>
  );
}
