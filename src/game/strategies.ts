import type { Move, RoundHistory } from "./types";
export function createRNG(seed: number) {
  let a = seed;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type StrategyFn = (history: RoundHistory[], rng: () => number) => Move;

export const strategies: Record<string, StrategyFn> = {
  alwaysShare: () => "share",
  alwaysSolo: () => "solo",
  titForTat: (history) => {
    if (history.length === 0) return "share";
    return history[history.length - 1].playerMove;
  },
  grimTrigger: (history) => {
    const betrayed = history.some((h) => h.playerMove === "solo");
    return betrayed ? "solo" : "share";
  },
  random: (_, rng) => (rng() > 0.5 ? "share" : "solo"),
};
