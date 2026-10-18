import './AboutSection.css';
const points = [
 {title: 'What it’s for', text: 'Explore the balance between privacy protection, catching fraud, and review costs.'},
 {title: 'Who it helps', text: 'Students, analysts, and anyone curious about privacy and banking decisions.'},
 {title: 'What you get', text: 'Model comparisons, estimated costs, and simulated strategy outcomes to help you understand the trade-offs.'},
];
export default function AboutSection() {
 return <section id="about" className="about-section" aria-labelledby="about-title">
  <div className="about-statement"><p>Explore the decisions <em>behind the data.</em></p></div>
  <div className="about-blue"><div className="about-inner">
   <svg className="about-orbit" viewBox="0 0 700 520" fill="none" aria-hidden="true"><path fill="currentColor" d="M680 12C450 58 67 342 35 425C-6 530 626 246 685 215C764 175 296 339 119 423C291 353 656 198 692 211C736 230 209 490 40 458C-94 432 433 61 680 12Z"/><path fill="currentColor" d="M150 338C350 129 600 9 651 75C707 146 427 364 76 452C325 362 663 133 617 86C573 42 315 190 150 338Z"/><path fill="currentColor" d="M46 457C230 441 622 398 682 409C728 420 260 503 48 478C220 490 603 431 658 416C490 420 199 465 46 457Z"/></svg>
   <div className="about-intro"><p className="about-eyebrow">About PrivacyLab</p><h2 id="about-title">Understand the choices<br/><em>behind the numbers.</em></h2><p className="about-description">PrivacyLab helps you explore how privacy choices affect fraud detection and business cost—then consider how banks might cooperate or compete.</p></div>
   <div className="about-columns">{points.map((point,index)=><article key={point.title}><span className="about-number">0{index+1}</span><h3>{point.title}</h3><p>{point.text}</p></article>)}</div>
   <footer className="about-footer"><p>A hackathon demo built on real, anonymized credit card transactions (ULB Kaggle dataset), with two simulated banks.</p><span>PrivacyLab</span></footer>
  </div></div>
 </section>;
}
