import { describe, it, expect } from "vitest";
import { payoffMatrix, findNashEquilibria, classifyRound } from "./logic";
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
