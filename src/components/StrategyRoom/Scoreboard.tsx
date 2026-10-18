// Owner: Mai (look). Round counter and running scores.

interface Props {
  round: number;
  totalRounds: number;
  you: number;
  them: number;
}

export default function Scoreboard({ round, totalRounds, you, them }: Props) {
  return (
    <div className="sr-round-header">
      <h2>Round {round} / {totalRounds}</h2>
      <div className="sr-scores">
        <span className="sr-score sr-score-you">You: {you}</span>
        <span className="sr-score sr-score-them">Them: {them}</span>
      </div>
    </div>
  );
}
