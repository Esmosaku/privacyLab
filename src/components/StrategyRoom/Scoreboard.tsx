import {gameCopy as c} from './copy';
import {formatSavings} from './verdict';
interface Props {round:number;totalRounds:number;you:number;them:number}
export default function Scoreboard({round,totalRounds,you,them}:Props){
 const shown=Math.max(1,Math.min(round,totalRounds));
 return <section className="sg-scoreboard" aria-label="Game score"><div>{c.you}<strong>{formatSavings(you)}<small> saved</small></strong></div><div className="sg-round"><span>Quarter {shown} of {totalRounds}</span><div className="sg-dots" aria-hidden="true">{Array.from({length:totalRounds},(_,i)=><i key={i} className={i<shown?'is-filled':''}/>)}</div></div><div>{c.them}<strong>{formatSavings(them)}<small> saved</small></strong></div></section>;
}
