import { useEffect, useState } from 'react';
import App from './App';
import LandingPage from './components/LandingPage';
// Keep the existing App for Experiment Lab and Strategy Room.
export default function PrivacyLabApp() {
 const [hash,setHash]=useState(()=>window.location.hash);
 useEffect(()=>{const sync=()=>setHash(window.location.hash);window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[]);
 const isLanding=hash!=='#experiment'&&hash!=='#strategy';
 useEffect(()=>{
  if(!isLanding)return;
  document.title=hash==='#about'?'About | PrivacyLab':'Home | PrivacyLab';
  const frame=requestAnimationFrame(()=>{
   if(hash==='#about')document.getElementById('about')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
   else window.scrollTo({top:0,behavior:'instant'});
  });
  return()=>cancelAnimationFrame(frame);
 },[hash,isLanding]);
 return isLanding?<LandingPage aboutActive={hash==='#about'}/>:<App/>;
}
