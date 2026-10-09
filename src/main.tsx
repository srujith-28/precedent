import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { PrecedentStoreProvider } from './store/usePrecedentStore.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrecedentStoreProvider>
      <App />
    </PrecedentStoreProvider>
  </StrictMode>
);
