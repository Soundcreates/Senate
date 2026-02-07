import React, { useEffect } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Register from './pages/Register'
import Admin from './pages/Admin'
import AdminDashboard from './pages/AdminDashboard'
import ProjectDetail from './pages/ProjectDetail'
import { AuthProvider } from './context/AuthContext'
import Lenis from 'lenis'

function App() {
  useEffect(() => {
    const lenis = new Lenis()

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    return () => {
      // lean cleanup if needed, though usually lenis cleans itself on destroy
      // lenis.destroy()
    }
  }, [])

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<Register />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/dashboard" element={<AdminDashboard />} />
          <Route path="/project/:id" element={<ProjectDetail />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App