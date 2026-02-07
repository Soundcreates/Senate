import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ProjectCreation from './pages/ProjectCreation';
import Dashboard from './pages/Dashboard';
import DeveloperStats from './pages/DeveloperStats';
import Login from './pages/Login';
import Register from './pages/Register';
import Sidebar from './components/Sidebar';

const Layout = ({ children }) => {
  const location = useLocation();
  const isAuthPage = ['/login', '/register', '/'].includes(location.pathname);

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white font-sans selection:bg-indigo-500/30">
      {!isAuthPage && <Sidebar />}
      <div className={`flex-1 ${!isAuthPage ? '' : 'w-full'}`}>
        {children}
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/create-project" element={<ProjectCreation />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/stats" element={<DeveloperStats />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;