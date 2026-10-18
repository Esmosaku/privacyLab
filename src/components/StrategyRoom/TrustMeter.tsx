import {gameCopy as c} from './copy';
export default function TrustMeter({value}:{value:number}){
 const safe=Math.max(0,Math.min(100,value));
 return <section className="sg-trust" aria-label="Trust"><h3>{c.trust}</h3><p><strong>{safe}</strong><span> / 100</span></p><div className="sg-trust-track" role="progressbar" aria-label="Trust" aria-valuemin={0} aria-valuemax={100} aria-valuenow={safe}><div style={{width:`${safe}%`,background:safe<30?'#e88383':safe<=70?'#ffcd59':'#a7e8ad'}}/></div><p className="sg-muted sg-trust-note">{c.trustNote}</p></section>;
}
