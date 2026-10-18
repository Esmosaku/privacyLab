import type {Move} from '../../game/types';
import {gameCopy as c} from './copy';
export default function RoundPlay({onMove}:{onMove:(move:Move)=>void}){
 return <div className="sg-move-panel"><h2>{c.moveTitle}</h2><p className="sg-muted">Your rival chooses without seeing your decision.</p><div className="sg-choices"><button className="sg-share" onClick={()=>onMove('share')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/></svg><strong>{c.share}</strong><small>Cooperate. Your outcome depends on their choice.</small></button><button className="sg-private" onClick={()=>onMove('solo')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m12 2 8 3v6c0 5-8 10-8 10S4 16 4 11V5Z"/></svg><strong>{c.solo}</strong><small>Go solo. Keep your data separate.</small></button></div></div>;
}
