import { useEffect, useState } from 'react';
import ExperimentLab from './components/ExperimentLab';
import StrategyRoom from './components/StrategyRoom/StrategyRoom';
import HomePage, { SiteHeader } from './components/HomePage';
import type { Page } from './components/HomePage';
import { useExperiment } from './hooks/useExperiment';

function currentPage(): Page {
  const page = window.location.hash.slice(1).split('?')[0];

  return page === 'about' ||
    page === 'experiment' ||
    page === 'strategy'
    ? page
    : 'home';
}

function ExperimentScreen() {
  const { data, loading, error } = useExperiment();

  if (loading) {
    return (
      <main className="lab-state" role="status">
        Loading experiment results…
      </main>
    );
  }

  if (error) {
    return (
      <main className="lab-state" role="alert">
        <h1>We couldn’t load the experiment</h1>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Try again
        </button>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="lab-state">
        No experiment results available.
      </main>
    );
  }

  return <ExperimentLab data={data} onOpenStrategyRoom={(id) => {
    window.location.hash = 'strategy?model=' + encodeURIComponent(id);
  }} />;
}

export default function App() {
  const [page, setPage] = useState<Page>(currentPage);

  useEffect(() => {
    const change = () => {
      setPage(currentPage());
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', change);

    return () => {
      window.removeEventListener('hashchange', change);
    };
  }, []);

  useEffect(() => {
    const titles: Record<Page, string> = {
      home: 'Home',
      about: 'About',
      experiment: 'Experiment Lab',
      strategy: 'Strategy Room',
    };

    document.title = `${titles[page]} | PrivacyLab`;
  }, [page]);

  if (page === 'experiment') {
    return (
      <>
        <div className="app-lab-nav">
          <SiteHeader page={page} />
        </div>
        <ExperimentScreen />
      </>
    );
  }

  if (page === 'strategy') {
    const query = window.location.hash.split('?')[1] ?? '';
    const modelId = new URLSearchParams(query).get('model') ?? 'baseline';
    return <StrategyRoom modelId={modelId} />;
  }

  return (
    <div className="home-page">
      <SiteHeader page={page} />

      {page === 'home' ? (
        <HomePage />
      ) : (
        <main className="home-info">
          <h1>About PrivacyLab</h1>
          <p>
            Explore how privacy choices affect fraud detection
            and business costs.
          </p>
          <p>
            Experiment Lab compares model results. Strategy Room
            lets you test banking strategies and explore trade-offs.
          </p>
          <p className="home-note">
            A hackathon project using synthetic data
            and simulated scenarios.
          </p>
          <a className="home-return" href="#home">
            Back to Home →
          </a>
        </main>
      )}
    </div>
  );
}