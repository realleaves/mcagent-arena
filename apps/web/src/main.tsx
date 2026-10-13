import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import { Dashboard } from './pages/dashboard';
import { Arena } from './pages/arena';
import { Traces } from './pages/traces';
import { Results } from './pages/results';
import { api, type Config } from './lib/api';
import './styles/globals.css';
function App() {
  const [config, setConfig] = useState<Config>();
  useEffect(() => {
    api<Config>('/config')
      .then(setConfig)
      .catch(() => {});
  }, []);
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout config={config} />}>
          <Route index element={<Dashboard config={config} />} />
          <Route path="arena" element={<Arena config={config} />} />
          <Route path="arena/:id" element={<Arena config={config} />} />
          <Route path="traces" element={<Traces />} />
          <Route path="traces/:id" element={<Traces />} />
          <Route path="results" element={<Results />} />
          <Route
            path="*"
            element={
              <div className="empty">
                <h1>404</h1>
                <a href="/">Return to Dashboard</a>
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
