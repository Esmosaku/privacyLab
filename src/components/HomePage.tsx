import './HomePage.css';
import BrandMark from './BrandMark';

export type Page = 'home' | 'about' | 'experiment' | 'strategy';

export function SiteHeader({ page }: { page: Page }) {
  return (
    <header className="home-header">
      <a
        className="home-brand"
        href="#home"
        aria-label="PrivacyLab home"
      >
        <BrandMark />
        PrivacyLab
      </a>

      <nav aria-label="Main navigation">
        <a
          href="#home"
          aria-current={page === 'home' ? 'page' : undefined}
        >
          Home
        </a>
        <a
          href="#about"
          aria-current={page === 'about' ? 'page' : undefined}
        >
          About
        </a>
      </nav>
    </header>
  );
}

export default function HomePage() {
  return (
    <main className="home-hero">
      <h1>
        Privacy has a price.
        <br />
        Explore the <em>trade-off.</em>
      </h1>

      <p className="home-description">
        Compare fraud detection models.
        <br />
        Test banking strategies.
      </p>

      <div className="home-actions">
        <div>
          <a
            className="home-bubble home-bubble-glass"
            href="#experiment"
          >
            Experiment Lab
            <span aria-hidden="true">→</span>
          </a>
          <p>Explore privacy choices.</p>
        </div>

        <div>
          <a
            className="home-bubble home-bubble-dark"
            href="#strategy"
          >
            Strategy Room
            <span aria-hidden="true">→</span>
          </a>
          <p>Test your strategy.</p>
        </div>
      </div>
    </main>
  );
}