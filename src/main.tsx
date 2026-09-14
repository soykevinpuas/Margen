import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.tsx';
import { AppProvider } from './context/AppContext.tsx';
import NuevaVersionBanner from './components/NuevaVersionBanner.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AppProvider>
        <NuevaVersionBanner />
        <App />
      </AppProvider>
    </AuthProvider>
  </StrictMode>
);
