
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { useAuth } from '../context/AuthContext';
import { startGithubLogin } from '@/Apis/github-authApi';
import { fetchWakatimeSession, startWakatimeOAuth } from '@/Apis/wakatime-authApi';
import { useWallet } from '../hooks/useWeb3';

const Register = () => {
    const containerRef = useRef(null);
    const oauthProcessedRef = useRef(false);
    const [step, setStep] = useState(1);
    const [manualEmail, setManualEmail] = useState('');
    const [manualEmailError, setManualEmailError] = useState('');
    const [wakatimeConnected, setWakatimeConnected] = useState(false);
    const [githubConnected, setGithubConnected] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const { account, isConnected, isConnecting, connectWallet } = useWallet();
  
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
  
    const handleWakatimeConnect = () => {
        startWakatimeOAuth();
    };

    const handleGithubConnect = () => {
        startGithubLogin(manualEmail.trim(), "register");
    };

    const handleManualEmailContinue = () => {
        const trimmedEmail = manualEmail.trim().toLowerCase();
        if (!trimmedEmail) {
            setManualEmailError('Please enter your email.');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            setManualEmailError('Please enter a valid email address.');
            return;
        }
        setManualEmailError('');
        setStep(3);
    };

    const handleWalletConnect = async () => {
        await connectWallet();
    };

    const handleCompleteRegistration = () => {
        navigate('/dashboard');
    };

    const getProgress = () => {
        return (step / 4) * 100;
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('oauth') !== 'success') return;
        if (oauthProcessedRef.current) return;

        const provider = params.get('provider');

        const hydrateFromSession = async () => {
            oauthProcessedRef.current = true;
            const result = await fetchWakatimeSession();
            if (result.ok && result.user) {
                setUser(result.user);
                setWakatimeConnected(Boolean(result.user.wakatimeConnected));
                setGithubConnected(Boolean(result.user.githubConnected));
                if (provider === 'wakatime') {
                    setStep(2);
                }
                if (provider === 'github') {
                    navigate('/dashboard');
                }
                // Clean up URL
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
            }
        };

        hydrateFromSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search]);
  
    return (
      <div ref={containerRef} className="min-h-screen bg-zinc-800 flex items-center justify-center p-6">
        <div className="step-card w-full max-w-lg bg-zinc-700 rounded-2xl p-10 shadow-xl">
             {/* Progress Indicator */}
             <div className="mb-8">
                <div className="h-2 bg-zinc-600 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-zinc-400 transition-all duration-500 ease-out"
                        style={{ width: `${getProgress()}%` }}
                    />
                </div>
            </div>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-white mb-3">
              Create Account
            </h1>
            <p className="text-zinc-400 text-base">
                Step {step} of 4: {step === 1 ? 'Connect WakaTime' : step === 2 ? 'Enter Email' : step === 3 ? 'Connect Wallet' : 'Connect GitHub'}
            </p>
          </div>
  
          <div className="space-y-6">
            {/* Step 1: WakaTime */}
            {step === 1 && (
                <div className="space-y-5">
                    <button 
                        onClick={handleWakatimeConnect}
                        className="w-full bg-zinc-600 hover:bg-zinc-500 text-white py-4 px-6 rounded-xl font-medium transition-all text-center"
                    >
                        <div className="text-lg font-semibold mb-1">Connect WakaTime</div>
                        <div className="text-sm text-zinc-300">Track your coding statistics</div>
                    </button>
                    <p className="text-sm text-center text-zinc-400 leading-relaxed">
                        This allows us to generate your productivity analytics automatically.
                    </p>
                </div>
            )}

            {/* Step 2: Email */}
            {step === 2 && (
                 <div className="space-y-5">
                     <div className="bg-zinc-600 rounded-xl p-4 text-center">
                        <span className="text-sm text-zinc-300">✓ WakaTime Connected</span>
                     </div>

                     <div className="space-y-4">
                         <label className="block text-sm text-zinc-400 text-left">
                             Enter your email address
                         </label>
                         <input
                             type="email"
                             value={manualEmail}
                             onChange={(event) => setManualEmail(event.target.value)}
                             onKeyDown={(e) => e.key === 'Enter' && handleManualEmailContinue()}
                             className="w-full rounded-xl bg-zinc-600 border border-zinc-500 px-4 py-3 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                             placeholder="you@example.com"
                         />
                         {manualEmailError && (
                             <p className="text-sm text-red-400 text-left">{manualEmailError}</p>
                         )}
                         <button
                             onClick={handleManualEmailContinue}
                             className="w-full bg-zinc-500 hover:bg-zinc-400 text-white py-3 px-6 rounded-xl font-medium transition-all"
                         >
                             Continue to Wallet
                         </button>
                     </div>
                </div>
            )}

            {/* Step 3: Wallet */}
            {step === 3 && (
                <div className="space-y-5">
                    <div className="bg-zinc-600 rounded-xl p-4 text-center">
                        <span className="text-sm text-zinc-300">✓ Email Confirmed</span>
                    </div>

                    {!isConnected ? (
                        <>
                            <button 
                                onClick={handleWalletConnect}
                                disabled={isConnecting}
                                className="w-full bg-zinc-600 hover:bg-zinc-500 text-white py-4 px-6 rounded-xl font-medium transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="text-lg font-semibold mb-1">
                                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                                </div>
                                <div className="text-sm text-zinc-300">MetaMask or compatible wallet</div>
                            </button>
                            <p className="text-sm text-center text-zinc-400 leading-relaxed">
                                We'll use your wallet address to enable blockchain features and interactions.
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="bg-zinc-600 rounded-xl p-5 space-y-2">
                                <div className="text-center">
                                    <span className="text-sm text-zinc-300 font-medium">✓ Wallet Connected</span>
                                </div>
                                <p className="text-xs text-zinc-400 text-center font-mono">
                                    {account?.slice(0, 6)}...{account?.slice(-4)}
                                </p>
                            </div>
                            <button
                                onClick={() => setStep(4)}
                                className="w-full bg-zinc-500 hover:bg-zinc-400 text-white py-3 px-6 rounded-xl font-medium transition-all"
                            >
                                Continue to GitHub
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Step 4: GitHub */}
            {step === 4 && (
                <div className="space-y-5">
                    <div className="bg-zinc-600 rounded-xl p-4 text-center">
                        <span className="text-sm text-zinc-300">✓ Wallet Connected</span>
                    </div>

                    <button 
                        onClick={handleGithubConnect}
                        className="w-full bg-zinc-600 hover:bg-zinc-500 text-white py-4 px-6 rounded-xl font-medium transition-all text-center"
                    >
                        <div className="text-lg font-semibold mb-1">Connect GitHub</div>
                        <div className="text-sm text-zinc-300">Import repositories & contributions</div>
                    </button>
                    <p className="text-sm text-center text-zinc-400 leading-relaxed">
                        Final step! Connect GitHub to analyze your code contributions and projects.
                    </p>
                </div>
            )}
          </div>
  
          <div className="mt-10 text-center pt-6 border-t border-zinc-600">
            <p className="text-zinc-400 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-zinc-300 font-medium hover:text-white transition-colors underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  };
  
  export default Register;
