import {gameCopy as c} from './copy';
interface Props {round:number;totalRounds:number;you:number;them:number}
export default function Scoreboard({round,totalRounds,you,them}:Props){
 const shown=Math.max(1,Math.min(round,totalRounds));
 return <section className="sg-scoreboard" aria-label="Game score"><div>{c.you}<strong>{you}<small> {c.points}</small></strong></div><div className="sg-round"><span>Round {shown} of {totalRounds}</span><div className="sg-dots" aria-hidden="true">{Array.from({length:totalRounds},(_,i)=><i key={i} className={i<shown?'is-filled':''}/>)}</div></div><div>{c.them}<strong>{them}<small> {c.points}</small></strong></div></section>;
}
