// Helpers for the pooling verdict (kept separate from the component for React fast refresh).

import type { PoolingVerdict } from '../../game/logic';
import { USD_PER_POINT } from '../../game/logic';

export interface VerdictInfo {
  verdict: PoolingVerdict;
  gainUsd: number;     // measured pooling gain for Bank A at this privacy level
  modelLabel: string;  // e.g. "High privacy (ε = 0.5)"
  bonus: number;       // the sharing bonus in points that the game uses
}

export const formatUsd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

// The game keeps score in points behind the scenes; players see dollars of fraud losses avoided.
export const formatSavings = (points: number) => formatUsd(points * USD_PER_POINT);

export const bonusNote = (info: VerdictInfo) =>
  `“Both share” includes a ${formatSavings(info.bonus)} sharing bonus: the measured pooling gain (${formatUsd(info.gainUsd)}), rounded.`;
