// Shows what the measured pooling gain (from the Experiment Lab) means for the game:
// at this privacy level, should banks pool their data or not?

import { verdicts } from './copy';
import { formatUsd } from './verdict';
import type { VerdictInfo } from './verdict';
import './PoolingVerdict.css';

export default function PoolingVerdict({ info }: { info: VerdictInfo }) {
  const copy = verdicts[info.verdict];
  return (
    <section className={`sg-verdict sg-verdict--${info.verdict}`} aria-label="Should banks pool their data?">
      <p className="sg-verdict-eyebrow">
        {info.modelLabel} · measured pooling gain {formatUsd(info.gainUsd)}
      </p>
      <h2>{copy.title}</h2>
      <p>{copy.text}</p>
      <a href="#experiment">Try another privacy level →</a>
    </section>
  );
}
