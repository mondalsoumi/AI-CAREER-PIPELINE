import { useState, useCallback } from 'react';
import LoginPage from './pages/LoginPage';
import KanbanBoard from './pages/KanbanBoard';

function hasToken() {
  return Boolean(localStorage.getItem('token'));
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(hasToken);

  const handleLogin = useCallback(() => setAuthenticated(true), []);
  const handleLogout = useCallback(() => setAuthenticated(false), []);

  if (!authenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <KanbanBoard onLogout={handleLogout} />;
}
