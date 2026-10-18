import { describe, it, expect } from "vitest";
import { payoffMatrix, findNashEquilibria, classifyRound, paramsWithMeasuredGain, poolingVerdict, payoff } from "./logic";
import { playRound, getInitialState } from "./engine";

const defaultParams = {
  soloValue: 2,
  poolingBonus: 3,
  privacyRisk: 1,
  freeRideBonus: 1,
  suckerCost: 1,
  rounds: 6,
};

describe("Game Logic", () => {
  it("calculates exact default payoffs", () => {
    const m = payoffMatrix(defaultParams);
    expect(m.share_share).toEqual([4, 4]);
    expect(m.solo_share).toEqual([3, 0]);
    expect(m.share_solo).toEqual([0, 3]);
    expect(m.solo_solo).toEqual([2, 2]);
  });

  it("finds the 2 pure Nash equilibria for the defaults", () => {
    const nash = findNashEquilibria(defaultParams);
    expect(nash.length).toBe(2);
    expect(nash).toContainEqual(["share", "share"]);
    expect(nash).toContainEqual(["solo", "solo"]);
  });
});

describe("Strategies & Engine", () => {
  it("Tit-for-Tat retaliates and recovers", () => {
    let state = getInitialState(defaultParams, "titForTat", 123);
    state = playRound(state, "solo");
    expect(state.history[0].opponentMove).toBe("share");
    
    state = playRound(state, "share");
    expect(state.history[1].opponentMove).toBe("solo");

    state = playRound(state, "share");
    expect(state.history[2].opponentMove).toBe("share");
  });

  it("Trust meter reacts properly", () => {
    let state = getInitialState(defaultParams, "alwaysShare", 1);
    expect(state.trustMeter).toBe(50);
    state = playRound(state, "share");
    expect(state.trustMeter).toBe(65);
    state = playRound(state, "solo");
    expect(state.trustMeter).toBe(50);
  });
});

describe('Round reveal classification',()=>{
 it.each([
 ['share','share','mutual'],['share','solo','betrayed'],['solo','share','freeRide'],['solo','solo','standoff']
 ] as const)('classifies %s / %s',(a,b,result)=>{expect(classifyRound(a,b)).toBe(result)});
 it('preserves a six-round Mirror recovery sequence',()=>{
  let s=getInitialState(defaultParams,'titForTat',12345);
  for(const move of ['share','share','solo','share','share','share'] as const)s=playRound(s,move);
  expect(s.history.map(h=>h.opponentMove)).toEqual(['share','share','share','solo','share','share']);
  expect(s.playerCumulative).toBe(19);expect(s.opponentCumulative).toBe(19);
 });
});

// Measured pooling gains from public/results/experiment.json
describe("Pooling verdict from measured gain", () => {
  const cases = [
    { model: "baseline", gain: 10, bonus: 0, verdict: "dontPool", bothShare: 1 },
    { model: "eps_10", gain: 649.93, bonus: 0.6, verdict: "dontPool", bothShare: 1.6 },
    { model: "eps_2", gain: 1860.51, bonus: 1.9, verdict: "trustNeeded", bothShare: 2.9 },
    { model: "eps_0_5", gain: 2731.55, bonus: 2.7, verdict: "pool", bothShare: 3.7 },
  ] as const;

  it.each(cases)("$model: gain $gain → $verdict", ({ gain, bonus, verdict, bothShare }) => {
    const params = paramsWithMeasuredGain(defaultParams, gain);
    expect(params.poolingBonus).toBe(bonus);
    expect(poolingVerdict(params)).toBe(verdict);
    expect(payoff("share", "share", params)).toEqual([bothShare, bothShare]);
  });

  it("only strong privacy makes mutual sharing a stable choice", () => {
    const at = (gain: number) => findNashEquilibria(paramsWithMeasuredGain(defaultParams, gain));
    expect(at(1860.51)).toEqual([["solo", "solo"]]);
    expect(at(2731.55)).toEqual([["share", "share"], ["solo", "solo"]]);
  });

  it("keeps the default game unchanged", () => {
    expect(poolingVerdict(defaultParams)).toBe("pool");
    expect(payoff("share", "share", defaultParams)).toEqual([4, 4]);
  });
});
