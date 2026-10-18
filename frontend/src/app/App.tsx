import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ListingsPage from '../pages/ListingsPage';
import PropertyDetailPage from '../pages/PropertyDetailPage';
import ErrorBoundary from '../shared/ui/ErrorBoundary';
import AppProviders from './providers';

export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ListingsPage />} />
            <Route path="/property/:id" element={<PropertyDetailPage />} />
            <Route
              path="*"
              element={
                <main className="listings-page">
                  <h1>Page not found</h1>
                  <a href="/">Browse properties</a>
                </main>
              }
            />
          </Routes>
        </BrowserRouter>
      </AppProviders>
    </ErrorBoundary>
  );
}
