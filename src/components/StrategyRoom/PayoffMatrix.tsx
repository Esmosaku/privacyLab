// The 2x2 table of points for each pair of moves.
// TODO: say whose number is whose ("You / Rival") and that these are points, not dollars.

import { findNashEquilibria, payoffMatrix } from "../../game/logic";
import type { GameParams, Move, RoundHistory } from "../../game/types";

interface Props {
  params: GameParams;
  currentRound?: RoundHistory; // highlights the cell that was just played
}

export default function PayoffMatrix({ params, currentRound }: Props) {
  const matrix = payoffMatrix(params);
  const nash = findNashEquilibria(params);

  const isNash = (you: Move, them: Move) => nash.some(([a, b]) => a === you && b === them);
  const isPlayed = (you: Move, them: Move) =>
    currentRound?.playerMove === you && currentRound?.opponentMove === them;

  const cell = (you: Move, them: Move) => {
    const [mine, theirs] = matrix[`${you}_${them}` as keyof typeof matrix];
    return (
      <div className={`sr-cell${isPlayed(you, them) ? " is-played" : ""}`}>
        {mine}, {theirs}
        {isNash(you, them) && <span className="sr-badge sr-badge-nash">NASH</span>}
      </div>
    );
  };

  return (
    <div className="sr-card sr-matrix-card">
      <div className="sr-tag">Modeled assumption</div>
      <h3>Payoff Matrix</h3>
      <div className="sr-matrix">
        <div />
        <div className="sr-cell">They Share</div>
        <div className="sr-cell">They Solo</div>

        <div className="sr-cell sr-cell-row">You Share</div>
        {cell("share", "share")}
        {cell("share", "solo")}

        <div className="sr-cell sr-cell-row">You Solo</div>
        {cell("solo", "share")}
        {cell("solo", "solo")}
      </div>
    </div>
  );
}
