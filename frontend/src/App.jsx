import { useState, useCallback } from 'react';
import {
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import KanbanBoard from './pages/KanbanBoard';
import AnalyticsPage from './pages/AnalyticsPage';

function hasToken() {
  return Boolean(localStorage.getItem('token'));
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(hasToken);

  const handleLogin = useCallback(() => {
    setAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    setAuthenticated(false);
  }, []);

  if (!authenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<KanbanBoard onLogout={handleLogout} />}
      />

      <Route
        path="/analytics"
        element={<AnalyticsPage onLogout={handleLogout} />}
      />

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}