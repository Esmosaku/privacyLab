import HomePage, { SiteHeader } from './HomePage';
import AboutSection from './AboutSection';
export default function LandingPage({aboutActive}: {aboutActive: boolean}) {
 return <div className="landing-page"><div id="home" className="home-page landing-hero"><SiteHeader page={aboutActive?'about':'home'}/><HomePage/></div><AboutSection/></div>;
}
