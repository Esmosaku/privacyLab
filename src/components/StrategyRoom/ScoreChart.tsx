// Cumulative score for both banks over the rounds.

import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RoundHistory } from "../../game/types";

const YOU_COLOR = "#0047ab";
const THEM_COLOR = "#ff1493";

interface Props {
  history: RoundHistory[];
}

export default function ScoreChart({ history }: Props) {
  return (
    <div className="sr-card sr-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history}>
          <XAxis dataKey="round" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="playerCumulative" stroke={YOU_COLOR} strokeWidth={3} name="Your Score" />
          <Line type="monotone" dataKey="opponentCumulative" stroke={THEM_COLOR} strokeWidth={3} name="Their Score" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
