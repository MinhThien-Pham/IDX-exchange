import { Analytics } from '@vercel/analytics/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ListingsPage from '../pages/ListingsPage';
import NotFoundPage from '../pages/NotFoundPage';
import PropertyDetailPage from '../pages/PropertyDetailPage';
import ErrorBoundary from '../shared/ui/ErrorBoundary';
import AppProviders from './providers';
import AppLayout from './AppLayout';

export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<ListingsPage />} />
              <Route path="/property/:id" element={<PropertyDetailPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Analytics />
      </AppProviders>
    </ErrorBoundary>
  );
}
