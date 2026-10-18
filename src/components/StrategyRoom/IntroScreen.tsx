import { useId } from 'react';
import { introCopy as copy, rivals } from './copy';
import './StrategyIntro.css';
import BrandMark from '../BrandMark';
import PoolingVerdict from './PoolingVerdict';
import type { VerdictInfo } from './verdict';
interface Props {
  opponentId: string;
  onOpponentChange: (id: string) => void;
  onStart: () => void;
  ready?: boolean;
  verdict?: VerdictInfo | null;
}
function RivalMark({symbol}: {symbol: string}) {
  const id = useId();
  return <svg viewBox="0 0 160 100" fill="none" aria-hidden="true" focusable="false">
    <defs><linearGradient id={id} x1="20" y1="5" x2="135" y2="95" gradientUnits="userSpaceOnUse"><stop stopColor="#e6fbda"/><stop offset=".45" stopColor="#b4edc0"/><stop offset="1" stopColor="#548dee"/></linearGradient></defs>
    {symbol==='waves'?<g fill={`url(#${id})`}><path d="M12 40Q49 2 85 24T150 20Q118 59 81 40T12 40Z"/><path d="M12 60Q49 22 85 44T150 40Q118 79 81 60T12 60Z"/><path d="M12 80Q49 42 85 64T150 60Q118 99 81 80T12 80Z"/></g>:symbol==='rings'?<g stroke={`url(#${id})`} strokeWidth="8"><ellipse cx="65" cy="59" rx="40" ry="29" transform="rotate(-35 65 59)"/><ellipse cx="97" cy="40" rx="40" ry="29" transform="rotate(-35 97 40)"/></g>:symbol==='peaks'?<g stroke={`url(#${id})`} strokeWidth="7" strokeLinejoin="miter"><path d="M14 78 80 13 146 78"/><path d="M36 82 80 39 124 82"/><path d="M58 86 80 65 102 86"/></g>:<g fill={`url(#${id})`}><path d="M20 16Q80 66 140 16Q112 89 20 16Z"/><path d="M20 39Q80 89 140 39Q112 112 20 39Z"/><path d="M20 62Q80 112 140 62Q112 135 20 62Z"/></g>}
  </svg>;
}
export default function IntroScreen({opponentId,onOpponentChange,onStart,ready=true,verdict}: Props) {
 return <div className="sr-intro-page">
  <header className="sr-intro-header"><a className="sr-intro-brand" href="#home"><BrandMark/>{copy.brand}</a><nav aria-label="Main navigation"><a href="#home">{copy.home}</a><a href="#about">{copy.about}</a></nav></header>
  <main className="sr-intro-main"><section className="sr-intro-hero" aria-labelledby="sr-intro-title"><h1 id="sr-intro-title">{copy.title}</h1><p className="sr-intro-subtitle">{copy.subtitle}</p><p className="sr-intro-description">{copy.description}</p><p className="sr-intro-goal">{copy.goal}</p><ol className="sr-intro-steps">{copy.steps.map((step,index)=><li key={step.title}><span className="sr-intro-step-number" aria-hidden="true">{index+1}</span><div><strong>{step.title}</strong><p>{step.text}</p></div></li>)}</ol>{verdict&&<PoolingVerdict info={verdict}/>}</section>
  <section className="sr-intro-selection" aria-labelledby="sr-rival-title"><h2 id="sr-rival-title">{copy.rivalTitle}</h2><p id="sr-rival-hint">{copy.rivalHint}</p><div className="sr-intro-rivals" role="group" aria-labelledby="sr-rival-title" aria-describedby="sr-rival-hint">{rivals.map(rival=><button type="button" className="sr-intro-rival" key={rival.id} aria-pressed={opponentId===rival.id} onClick={()=>onOpponentChange(rival.id)}>{opponentId===rival.id&&<span className="sr-intro-check" aria-hidden="true">✓</span>}<RivalMark symbol={rival.symbol}/><span>{rival.name}</span></button>)}</div><button type="button" className="sr-intro-start" onClick={onStart} disabled={!ready}>{ready?copy.start:'Loading results…'}<span aria-hidden="true">→</span></button><p className="sr-intro-note">{copy.note}</p></section></main>
 </div>;
}
