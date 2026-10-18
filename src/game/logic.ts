import type { Move, GameParams, Payoff } from "./types";

const round2 = (n: number) => Math.round(n * 100) / 100;

export function payoff(myMove: Move, theirMove: Move, params: GameParams): Payoff {
  const [mine, theirs] = rawPayoff(myMove, theirMove, params);
  return [round2(mine), round2(theirs)];
}

function rawPayoff(myMove: Move, theirMove: Move, params: GameParams): Payoff {
  if (myMove === "share" && theirMove === "share") {
    const val = params.soloValue + params.poolingBonus - params.privacyRisk;
    return [val, val];
  }
  if (myMove === "solo" && theirMove === "share") {
    return [
      params.soloValue + params.freeRideBonus,
      params.soloValue - params.privacyRisk - params.suckerCost
    ];
  }
  if (myMove === "share" && theirMove === "solo") {
    return [
      params.soloValue - params.privacyRisk - params.suckerCost,
      params.soloValue + params.freeRideBonus
    ];
  }
  return [params.soloValue, params.soloValue];
}

export function payoffMatrix(params: GameParams) {
  return {
    share_share: payoff("share", "share", params),
    share_solo: payoff("share", "solo", params),
    solo_share: payoff("solo", "share", params),
    solo_solo: payoff("solo", "solo", params),
  };
}

export function findNashEquilibria(params: GameParams): Array<[Move, Move]> {
  const matrix = payoffMatrix(params);
  const equilibria: Array<[Move, Move]> = [];
  const moves: Move[] = ["share", "solo"];

  for (const p1 of moves) {
    for (const p2 of moves) {
      const currentP1 = matrix[`${p1}_${p2}` as keyof typeof matrix][0];
      const currentP2 = matrix[`${p1}_${p2}` as keyof typeof matrix][1];

      const altP1Move = p1 === "share" ? "solo" : "share";
      const devP1 = matrix[`${altP1Move}_${p2}` as keyof typeof matrix][0];

      const altP2Move = p2 === "share" ? "solo" : "share";
      const devP2 = matrix[`${p1}_${altP2Move}` as keyof typeof matrix][1];

      if (devP1 <= currentP1 && devP2 <= currentP2) {
        equilibria.push([p1, p2]);
      }
    }
  }
  return equilibria;
}

export function classifyRound(playerMove: Move, opponentMove: Move): 'mutual' | 'betrayed' | 'freeRide' | 'standoff' {
 if(playerMove==='share')return opponentMove==='share'?'mutual':'betrayed';
 return opponentMove==='share'?'freeRide':'standoff';
}

// ---- Connecting the game to the Experiment Lab ----
// The reward for mutual sharing comes from the MEASURED pooling gain at the chosen privacy level
// (experiment.json → pooling.results[].gain_usd). Every other payoff stays a modeled assumption.
export const USD_PER_POINT = 1000;

export function paramsWithMeasuredGain(params: GameParams, gainUsd: number): GameParams {
  return { ...params, poolingBonus: Math.round((gainUsd / USD_PER_POINT) * 10) / 10 };
}

export type PoolingVerdict = "dontPool" | "trustNeeded" | "pool";

// What kind of game these payoffs create, from a bank's point of view.
export function poolingVerdict(params: GameParams): PoolingVerdict {
  const bothShare = params.soloValue + params.poolingBonus - params.privacyRisk;
  const bothSolo = params.soloValue;
  const freeRide = params.soloValue + params.freeRideBonus;
  if (bothShare <= bothSolo) return "dontPool";   // sharing is worse than a standoff
  if (bothShare < freeRide) return "trustNeeded"; // sharing beats a standoff, but free-riding tempts both banks
  return "pool";                                  // mutual sharing is a stable choice
}
