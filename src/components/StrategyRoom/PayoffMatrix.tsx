import {payoffMatrix,findNashEquilibria} from '../../game/logic';
import type {GameParams,Move,RoundHistory} from '../../game/types';
import {gameCopy as c} from './copy';
export default function PayoffMatrix({params,currentRound}:{params:GameParams;currentRound?:RoundHistory}){
 const m=payoffMatrix(params),stable=findNashEquilibria(params);
 const pairs:[Move,Move][]=[['share','share'],['share','solo'],['solo','share'],['solo','solo']];
 return <section className="sg-outcomes sg-glass"><header><h2>{c.outcomes}</h2><div><span>{c.assumption}</span><p>{c.outcomeCaption}</p></div></header><dl>{pairs.map(([a,b],i)=><div key={a+b} className={currentRound?.playerMove===a&&currentRound?.opponentMove===b?'is-last':''}><dt>{c.rows[i]} {stable.some(([x,y])=>x===a&&y===b)&&<small className="sg-stable">Stable</small>}</dt><dd>{m[`${a}_${b}`][0]} / {m[`${a}_${b}`][1]}</dd></div>)}</dl><details className="sg-stable-note"><summary>What does Stable mean?</summary><p>Neither side gains by changing its move alone for that outcome—a Nash equilibrium. These payoffs are game assumptions.</p></details></section>;
}
