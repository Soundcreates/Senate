import React, { useEffect } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Register from './pages/Register'
import Login from './pages/Login'
import Admin from './pages/Admin'
import { AuthProvider } from './context/AuthContext'
import Lenis from 'lenis'
import Dashboard from './pages/Dashboard'

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
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path ="/dashboard" element={<Dashboard />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App