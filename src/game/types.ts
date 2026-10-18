export type Move = "share" | "solo";

export interface GameParams {
  soloValue: number;
  poolingBonus: number;
  privacyRisk: number;
  freeRideBonus: number;
  suckerCost: number;
  rounds: number;
}

export type Payoff = [number, number];

export interface RoundHistory {
  round: number;
  playerMove: Move;
  opponentMove: Move;
  playerScore: number;
  opponentScore: number;
  playerCumulative: number;
  opponentCumulative: number;
  trustMeter: number;
}

export interface GameState {
  params: GameParams;
  history: RoundHistory[];
  playerCumulative: number;
  opponentCumulative: number;
  trustMeter: number;
  seed: number;
  opponentId: string;
}
