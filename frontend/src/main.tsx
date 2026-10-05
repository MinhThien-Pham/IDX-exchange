import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Shared foundations precede feature styles in the CSS cascade.
import './index.css';
import App from './app/App';

const root = document.getElementById('root');
if (!root) throw new Error('Root element is missing');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
