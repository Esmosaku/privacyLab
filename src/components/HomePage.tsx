import './HomePage.css';
export type Page = 'home' | 'about' | 'experiment' | 'strategy';
export function SiteHeader({page}: {page: Page}) {
 return <header className="home-header"><a className="home-brand" href="#home" aria-label="PrivacyLab home"><svg viewBox="0 0 32 40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M10 2h12M12 2v13L3 32q-2 5 3 5h20q5 0 3-5l-9-17V2"/></svg>PrivacyLab</a><nav aria-label="Main navigation"><a href="#home" aria-current={page==='home'?'page':undefined}>Home</a><a href="#about" aria-current={page==='about'?'page':undefined}>About</a></nav></header>;
}
export default function HomePage() {
 return <main className="home-hero"><h1>Privacy has a price.<br/>Explore the <em>trade-off.</em></h1><p className="home-description">Test banking strategies.<br/>Compare fraud detection models.</p><div className="home-actions"><div><a className="home-bubble home-bubble-dark" href="#strategy">Strategy Room <span aria-hidden="true">→</span></a><p>Explore trade-offs.</p></div><div><a className="home-bubble home-bubble-glass" href="#experiment">Experiment Lab <span aria-hidden="true">→</span></a><p>Explore privacy choices.</p></div></div></main>;
}
