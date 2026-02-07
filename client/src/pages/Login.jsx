
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { Github, Clock, ArrowRight, Layers, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchWakatimeSession, startWakatimeOAuth } from '@/Apis/wakatime-authApi';
import { startGithubLogin } from '@/Apis/github-authApi';


const Login = () => {
    const containerRef = useRef(null);

    const [step, setStep] = useState(1);
    const [wakatimeConnected, setWakatimeConnected] = useState(false);
    const [githubConnected, setGithubConnected] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { setUser } = useAuth();
  
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
          setWakatimeConnected(true);
          setStep(2);
          window.history.replaceState({}, '', location.pathname);
        }
      };

      hydrateFromSession();
    }, [location.pathname, location.search, setUser]);
  

    const handleGithubLogin = () => {
        console.log("Starting githublogin");
        startGithubLogin();
    }
      
  
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
                    style={{ width: step === 1 ? '50%' : '100%' }}
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
                {step === 1 ? 'Step 1: Authenticate with WakaTime' : 'Step 2: Verify with GitHub'}
            </p>
          </div>
  
          <div className="space-y-6">
            {step === 1 && (
                <div className="space-y-4">
                    <button 
                        onClick={() => startWakatimeOAuth()}
                        className="w-full bg-[#2c2c2c] hover:bg-[#383838] text-white py-4 rounded-2xl font-bold border border-zinc-700 transition-all flex items-center justify-between px-6 group"
                    >
                        <div className="flex items-center gap-4">
                            <Clock className="text-blue-400" size={24} />
                            <div className="text-left">
                                <span className="block text-sm font-medium">Continue with WakaTime</span>
                                <span className="block text-xs text-zinc-500">Primary Authentication</span>
                            </div>
                        </div>
                        <ArrowRight className="text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" size={20}/>
                    </button>
                    <p className="text-xs text-center text-zinc-500">
                        We use WakaTime to verify your coding activity.
                    </p>
                    <button onClick = {() => setStep(2)}>
                      Go to github auth
                    </button>
                </div>
            )}

            {step === 2 && (
                 <div className="space-y-4">
                     <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-3 mb-4">
                        <CheckCircle2 className="text-green-500" size={20} />
                        <span className="text-sm text-green-400">WakaTime Connected Successfully</span>
                     </div>

                    <button 
                        onClick={handleGithubLogin}
                        className="w-full bg-[#24292e] hover:bg-[#2f363d] text-white py-4 rounded-2xl font-bold border border-zinc-700 transition-all flex items-center justify-between px-6 group"
                    >
                         <div className="flex items-center gap-4">
                            <Github className="text-white" size={24} />
                            <div className="text-left">
                                <span className="block text-sm font-medium">Connect GitHub</span>
                                <span className="block text-xs text-zinc-500">Sync Repositories</span>
                            </div>
                        </div>
                         <ArrowRight className="text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" size={20}/>
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
