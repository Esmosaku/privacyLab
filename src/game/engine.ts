import type { GameState, Move, RoundHistory, GameParams } from "./types";
import { payoff } from "./logic";
import { strategies, createRNG } from "./strategies";

export function getInitialState(params: GameParams, opponentId: string, seed: number): GameState {
  return {
    params,
    history: [],
    playerCumulative: 0,
    opponentCumulative: 0,
    trustMeter: 50,
    seed,
    opponentId,
  };
}

export function playRound(state: GameState, playerMove: Move): GameState {
  const rng = createRNG(state.seed + state.history.length);
  const strategy = strategies[state.opponentId] || strategies.alwaysSolo;
  const opponentMove = strategy(state.history, rng);

  const [pScore, oScore] = payoff(playerMove, opponentMove, state.params);

  const playerCumulative = Math.round((state.playerCumulative + pScore) * 100) / 100;
  const opponentCumulative = Math.round((state.opponentCumulative + oScore) * 100) / 100;

  let trustDelta = 0;
  if (playerMove === "share" && opponentMove === "share") trustDelta = 15;
  if (playerMove === "solo" && opponentMove === "solo") trustDelta = -5;
  if (playerMove === "solo" && opponentMove === "share") trustDelta = -15;
  if (playerMove === "share" && opponentMove === "solo") trustDelta = -25;

  const trustMeter = Math.max(0, Math.min(100, state.trustMeter + trustDelta));

  const roundRec: RoundHistory = {
    round: state.history.length + 1,
    playerMove,
    opponentMove,
    playerScore: pScore,
    opponentScore: oScore,
    playerCumulative,
    opponentCumulative,
    trustMeter,
  };

  return {
    ...state,
    history: [...state.history, roundRec],
    playerCumulative,
    opponentCumulative,
    trustMeter,
  };
}
