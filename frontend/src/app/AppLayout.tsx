import { useLayoutEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import ThemeToggle from '../shared/ui/ThemeToggle';

export default function AppLayout() {
  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-header">
        <div className="app-header-inner page-container">
          <Link className="brand" to="/" aria-label="IDX Exchange home">
            <span className="wordmark">
              id<em>x</em>
              <small>.</small>
            </span>
            <span className="brand-sub">
              EX
              <br />
              CHANGE
            </span>
          </Link>
          <nav aria-label="Main navigation">
            <Link className="browse-link" to="/">
              Browse homes
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </header>
      <Outlet />
    </>
  );
}
