import { useState, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'   // ← new import
import KanbanBoard from './pages/KanbanBoard'
import AnalyticsPage from './pages/AnalyticsPage'
import AICenter from './pages/AICenter'
import ResumeManager from './pages/ResumeManager'

function hasToken() {
  return Boolean(localStorage.getItem('token'))
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(hasToken)
  const [showRegister, setShowRegister] = useState(false)  // ← new state

  const handleLogin = useCallback(() => {
    setAuthenticated(true)
    setShowRegister(false)
  }, [])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
    setAuthenticated(false)
  }, [])

  // Not logged in — show login OR register
  if (!authenticated) {
    if (showRegister) {
      return (
        <RegisterPage
          onLogin={handleLogin}
          onSwitchToLogin={() => setShowRegister(false)}
        />
      )
    }
    return (
      <LoginPage
        onLogin={handleLogin}
        onSwitchToRegister={() => setShowRegister(true)}
      />
    )
  }

  return (
    <Routes>
      <Route path="/" element={<KanbanBoard onLogout={handleLogout} />} />
      <Route path="/analytics" element={<AnalyticsPage onLogout={handleLogout} />} />
      <Route path="/ai-center" element={<AICenter onLogout={handleLogout} />} />
      <Route path="/resumes" element={<ResumeManager onLogout={handleLogout} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}