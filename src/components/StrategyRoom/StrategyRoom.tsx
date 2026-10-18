import {useEffect,useRef,useState} from 'react';
import {getInitialState,playRound} from '../../game/engine';
import type {GameParams,GameState,Move} from '../../game/types';
import type {Experiment} from '../../types/experiment';
import IntroScreen from './IntroScreen';
import GameBoard from './GameBoard';
import type {BoardPhase} from './GameBoard';
export default function StrategyRoom({modelId='baseline'}:{modelId?:string}){
 const [params,setParams]=useState<GameParams|null>(null);const [experiment,setExperiment]=useState<Experiment|null>(null);const [error,setError]=useState<string|null>(null);const [evidenceError,setEvidenceError]=useState<string|null>(null);
 const [state,setState]=useState<GameState|null>(null);const [phase,setPhase]=useState<'intro'|BoardPhase>('intro');const [opponentChoice,setOpponentChoice]=useState('titForTat');const [replayStep,setReplayStep]=useState(1);const timer=useRef<ReturnType<typeof setTimeout>|null>(null);const locked=useRef(false);
 useEffect(()=>{const controller=new AbortController();async function get<T,>(path:string):Promise<T>{const r=await fetch(path,{signal:controller.signal});if(!r.ok)throw new Error(`Could not load ${path} (${r.status}).`);return r.json() as Promise<T>}
 void get<GameParams>('/config/game.json').then(p=>{if(!controller.signal.aborted)setParams(p)}).catch(e=>{if(!controller.signal.aborted)setError(String(e))});
 void get<Experiment>('/results/experiment.json').then(d=>{if(!controller.signal.aborted)setExperiment(d)}).catch(()=>{if(!controller.signal.aborted)setEvidenceError('Experiment evidence could not be loaded. The game is still available.')});
 return()=>{controller.abort();if(timer.current)clearTimeout(timer.current)}},[]);
 if(error)return <main className="sg-load" role="alert"><h1>Could not load the game</h1><p>{error}</p><button onClick={()=>window.location.reload()}>Try again</button><a href="#home">Home</a></main>;
 if(!params)return <main className="sg-load" role="status">Loading game…</main>;
 const start=()=>{locked.current=false;setState(getInitialState(params,opponentChoice,Math.floor(Math.random()*100000)));setReplayStep(1);setPhase('playing');window.scrollTo(0,0)};
 const move=(choice:Move)=>{if(!state||phase!=='playing'||locked.current||state.history.length>=params.rounds)return;locked.current=true;const next=playRound(state,choice);setPhase('deciding');timer.current=setTimeout(()=>{setState(next);setPhase('reveal');locked.current=false;timer.current=null},800)};
 if(phase==='intro'||!state)return <IntroScreen opponentId={opponentChoice} onOpponentChange={setOpponentChoice} onStart={start}/>;
 const next=()=>setPhase(phase==='replay'||state.history.length>=params.rounds?'debrief':'playing');
 return <GameBoard state={state} phase={phase} experiment={experiment} evidenceError={evidenceError} modelId={modelId} replayStep={replayStep} onMove={move} onNext={next} onReplay={()=>{setReplayStep(1);setPhase('replay')}} onRestart={()=>setPhase('intro')} onReplayStep={n=>setReplayStep(Math.max(1,Math.min(state.history.length,n)))}/>;
}
