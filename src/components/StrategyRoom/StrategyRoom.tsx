// Strategy Room container: loads data, holds the game state, and arranges the pieces.
// Each piece of the screen lives in its own file in this folder; styles are in StrategyRoom.css.
// Game rules live in src/game/.

import { useEffect, useState } from "react";
import { getInitialState, playRound } from "../../game/engine";
import type { GameParams, GameState, Move } from "../../game/types";
import type { Experiment } from "../../types/experiment";
import Debrief from "./Debrief";
import EvidencePanel from "./EvidencePanel";
import IntroScreen from "./IntroScreen";
import PayoffMatrix from "./PayoffMatrix";
import Replay from "./Replay";
import RoundPlay from "./RoundPlay";
import ScoreChart from "./ScoreChart";
import Scoreboard from "./Scoreboard";
import TrustMeter from "./TrustMeter";
import "./StrategyRoom.css";

type Phase = "intro" | "playing" | "debrief" | "replay";

const DEMO_SEED = 12345;
const DEMO_OPPONENT = "titForTat";

interface Props {
  modelId?: string; // privacy level chosen in the Experiment Lab
}

export default function StrategyRoom({ modelId = "baseline" }: Props) {
  const [params, setParams] = useState<GameParams | null>(null);
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [opponentChoice, setOpponentChoice] = useState("titForTat");
  const [replayStep, setReplayStep] = useState(0);

  useEffect(() => {
    fetch("/config/game.json").then((r) => r.json()).then(setParams);
    fetch("/results/experiment.json").then((r) => r.json()).then(setExperiment);
  }, []);

  if (!params) return <div className="sr-loading">Loading Game Data...</div>;

  const startGame = (seed = Math.floor(Math.random() * 10000), opponentId = opponentChoice) => {
    setState(getInitialState(params, opponentId, seed));
    setPhase("playing");
    setReplayStep(0);
  };

  const handleMove = (move: Move) => {
    if (!state) return;
    const next = playRound(state, move);
    setState(next);
    if (next.history.length >= params.rounds) setPhase("debrief");
  };

  const isReplay = phase === "replay";

  return (
    <div className="sr-container">
      <h1 className="sr-title">Strategy Room</h1>

      {phase === "intro" && (
        <IntroScreen
          opponentId={opponentChoice}
          onOpponentChange={setOpponentChoice}
          onStart={() => startGame()}
          onDemo={() => startGame(DEMO_SEED, DEMO_OPPONENT)}
        />
      )}

      {phase !== "intro" && state && (
        <div className="sr-board">
          <div>
            {/* TODO: after the last round this shows "Round 7 / 6". */}
            <Scoreboard
              round={isReplay ? replayStep : state.history.length + 1}
              totalRounds={params.rounds}
              you={state.playerCumulative}
              them={state.opponentCumulative}
            />
            <TrustMeter value={state.trustMeter} />

            {phase === "playing" && <RoundPlay onMove={handleMove} />}

            {phase === "debrief" && (
              <Debrief
                opponentId={state.opponentId}
                onReplay={() => setPhase("replay")}
                onPlayAgain={() => setPhase("intro")}
              />
            )}

            {isReplay && (
              <Replay
                step={replayStep}
                maxStep={state.history.length}
                onPrev={() => setReplayStep((s) => s - 1)}
                onNext={() => setReplayStep((s) => s + 1)}
              />
            )}

            <PayoffMatrix
              params={params}
              currentRound={state.history[isReplay ? Math.max(0, replayStep - 1) : state.history.length - 1]}
            />
          </div>

          <div>
            <ScoreChart history={state.history} />
            {experiment && <EvidencePanel experiment={experiment} modelId={modelId} />}
          </div>
        </div>
      )}
    </div>
  );
}
