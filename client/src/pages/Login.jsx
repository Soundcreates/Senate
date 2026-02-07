
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { Layers } from 'lucide-react';
import { fetchWakatimeSession } from '@/Apis/wakatime-authApi';
import { useAuth } from '../context/AuthContext';
import { loginAdmin } from '@/Apis/admin-authApi';
import { loginDeveloper } from '@/Apis/authApi';


const Login = () => {
    const containerRef = useRef(null);
    const step = 1;
    const [roleChoice, setRoleChoice] = useState(null);
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [adminError, setAdminError] = useState('');
    const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
    const [developerEmail, setDeveloperEmail] = useState('');
    const [developerPassword, setDeveloperPassword] = useState('');
    const [developerError, setDeveloperError] = useState('');
    const [isSubmittingDeveloper, setIsSubmittingDeveloper] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { setUser, setToken } = useAuth();
  
    useEffect(() => {
      const ctx = gsap.context(() => {
        gsap.to('.bg-glow', {
          scale: 1.2,
          duration: 4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
        
        gsap.from('.step-card', {
            y: 20,
            opacity: 0,
            duration: 0.6,
            ease: 'power2.out',
            clearProps: 'all'
        });

      }, containerRef);
  
      return () => ctx.revert();
    }, [step]);

    useEffect(() => {
      const params = new URLSearchParams(location.search);
      if (params.get('oauth') !== 'success') return;

      const hydrateFromSession = async () => {
        const result = await fetchWakatimeSession();
        if (result.ok && result.user) {
          setUser(result.user);
          window.history.replaceState({}, '', location.pathname);
          navigate('/dashboard');
        }
      };

      hydrateFromSession();
    }, [location.pathname, location.search, navigate, setUser]);

    const handleDeveloperLogin = async () => {
      if (isSubmittingDeveloper) return;
      const trimmedEmail = developerEmail.trim().toLowerCase();
      if (!trimmedEmail || !developerPassword) {
        setDeveloperError('Email and password are required.');
        return;
      }

      setDeveloperError('');
      setIsSubmittingDeveloper(true);
      const result = await loginDeveloper({ email: trimmedEmail, password: developerPassword });
      if (!result.ok) {
        setDeveloperError('Invalid credentials.');
        setIsSubmittingDeveloper(false);
        return;
      }

      setUser(result.user);
      navigate('/dashboard');
    };

    const handleAdminLogin = async () => {
      if (isSubmittingAdmin) return;
      const trimmedEmail = adminEmail.trim().toLowerCase();
      if (!trimmedEmail || !adminPassword) {
        setAdminError('Email and password are required.');
        return;
      }

      setAdminError('');
      setIsSubmittingAdmin(true);
      const result = await loginAdmin({ email: trimmedEmail, password: adminPassword });
      if (!result.ok) {
        setAdminError('Invalid credentials.');
        setIsSubmittingAdmin(false);
        return;
      }

      setToken(result.token);
      setUser(result.user);
      navigate('/dashboard');
    };
      
  
    return (
      <div ref={containerRef} className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden text-white">
        <div className="bg-glow absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] -z-10" />
        <div className="bg-glow absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] -z-10" />
        <div className="absolute inset-0 bg-grid-zinc-900/50 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] -z-10" />
  
        <div className="step-card w-full max-w-md bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl relative">
            {/* Progress Indicator */}
            <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800 rounded-t-3xl overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
                style={{ width: '100%' }}
              />
            </div>

          <div className="text-center mb-8 pt-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 mb-4 shadow-lg shadow-indigo-500/20">
              <Layers size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              Welcome Back
            </h1>
            <p className="text-zinc-500 text-sm mt-2">
              {roleChoice === 'admin' ? 'Sign in as admin.' : 'Sign in with WakaTime to continue.'}
            </p>
          </div>
  
          <div className="space-y-6">
            {!roleChoice && (
              <div className="space-y-4">
                <p className="text-xs text-center text-zinc-500">Choose your role to continue.</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRoleChoice('developer')}
                    className="rounded-2xl px-4 py-3 text-sm font-medium bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-all"
                  >
                    Developer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleChoice('admin')}
                    className="rounded-2xl px-4 py-3 text-sm font-medium bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-all"
                  >
                    Admin
                  </button>
                </div>
              </div>
            )}

            {roleChoice === 'developer' && (
              <div className="space-y-4">
                <label className="block text-sm text-zinc-400 text-left">Email</label>
                <input
                  type="email"
                  value={developerEmail}
                  onChange={(event) => setDeveloperEmail(event.target.value)}
                  className="w-full rounded-2xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
                <label className="block text-sm text-zinc-400 text-left">Password</label>
                <input
                  type="password"
                  value={developerPassword}
                  onChange={(event) => setDeveloperPassword(event.target.value)}
                  className="w-full rounded-2xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                {developerError && (
                  <p className="text-xs text-red-400 text-left">{developerError}</p>
                )}
                <button
                  onClick={handleDeveloperLogin}
                  disabled={isSubmittingDeveloper}
                  className="w-full bg-zinc-700 hover:bg-zinc-600 text-white py-3 rounded-2xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingDeveloper ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            )}

            {roleChoice === 'admin' && (
              <div className="space-y-4">
                <label className="block text-sm text-zinc-400 text-left">Admin email</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(event) => setAdminEmail(event.target.value)}
                  className="w-full rounded-2xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                  placeholder="admin@example.com"
                />
                <label className="block text-sm text-zinc-400 text-left">Password</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  className="w-full rounded-2xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                {adminError && (
                  <p className="text-xs text-red-400 text-left">{adminError}</p>
                )}
                <button
                  onClick={handleAdminLogin}
                  disabled={isSubmittingAdmin}
                  className="w-full bg-zinc-700 hover:bg-zinc-600 text-white py-3 rounded-2xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingAdmin ? 'Signing in...' : 'Sign in as Admin'}
                </button>
              </div>
            )}
          </div>
  
          <div className="mt-8 text-center pt-6 border-t border-zinc-800">
            <p className="text-zinc-500 text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  };
  
  export default Login;
