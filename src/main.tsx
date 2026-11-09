import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './hooks/useAuth';
import './index.css';

// En prod, retirer les bases de démo laissées par les anciennes versions dans le navigateur
if (import.meta.env.PROD) {
  try {
    ['enf_compta_mock_db_v2', 'saint_martin_compta_mock_db_v2'].forEach((key) => localStorage.removeItem(key));
  } catch {
    // stockage indisponible (navigation privée) : rien à nettoyer
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
