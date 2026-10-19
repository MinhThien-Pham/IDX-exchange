import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main id="main-content" className="page-container page-message">
      <h1>Page not found</h1>
      <Link to="/">Browse homes</Link>
    </main>
  );
}
