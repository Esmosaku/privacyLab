// The player's choice each round.
// TODO: add the reveal: "rival is deciding...", both moves flip, outcome banner, then "Next round".

import type { Move } from "../../game/types";

interface Props {
  onMove: (move: Move) => void;
}

export default function RoundPlay({ onMove }: Props) {
  return (
    <div className="sr-choices">
      <button className="sr-btn sr-btn-primary" onClick={() => onMove("share")}>Share Data</button>
      <button className="sr-btn sr-btn-accent" onClick={() => onMove("solo")}>Go Solo</button>
    </div>
  );
}
