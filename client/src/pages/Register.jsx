
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { useAuth } from '../context/AuthContext';
import { startGithubLogin } from '@/Apis/github-authApi';
import { fetchWakatimeSession, startWakatimeOAuth } from '@/Apis/wakatime-authApi';
import { uploadResume } from '@/Apis/resumeApi';

const Register = () => {
    const containerRef = useRef(null);
    const oauthProcessedRef = useRef(false);
    const [step, setStep] = useState(1);
    const [manualEmail, setManualEmail] = useState('');
    const [manualEmailError, setManualEmailError] = useState('');
    const [wakatimeConnected, setWakatimeConnected] = useState(false);
    const [githubConnected, setGithubConnected] = useState(false);
    const [resumeFile, setResumeFile] = useState(null);
    const [resumeError, setResumeError] = useState('');
    const [isUploadingResume, setIsUploadingResume] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
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
  
    const handleWakatimeConnect = () => {
        startWakatimeOAuth("register");
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

    const handleResumeUpload = (event) => {
        const file = event.target.files?.[0];
        setResumeFile(file || null);
        setResumeError('');
    };

    const handleCompleteRegistration = async () => {
        if (!resumeFile || isUploadingResume) return;
        setResumeError('');
        setIsUploadingResume(true);

        const result = await uploadResume(resumeFile);
        if (!result.ok) {
            setResumeError('Resume upload failed. Please try again.');
            setIsUploadingResume(false);
            return;
        }

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
                    setStep(4);
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
                Step {step} of 4: {step === 1 ? 'Connect WakaTime' : step === 2 ? 'Enter Email' : step === 3 ? 'Connect GitHub' : 'Upload Resume'}
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

            {/* Step 3: GitHub */}
            {step === 3 && (
                <div className="space-y-5">
                    <div className="bg-zinc-600 rounded-xl p-4 text-center">
                        <span className="text-sm text-zinc-300">✓ Email Confirmed</span>
                    </div>

                    <button 
                        onClick={handleGithubConnect}
                        className="w-full bg-zinc-600 hover:bg-zinc-500 text-white py-4 px-6 rounded-xl font-medium transition-all text-center"
                    >
                        <div className="text-lg font-semibold mb-1">Connect GitHub</div>
                        <div className="text-sm text-zinc-300">Import repositories & contributions</div>
                    </button>
                    {githubConnected && (
                        <div className="bg-zinc-600 rounded-xl p-4 text-center">
                            <span className="text-sm text-zinc-300">✓ GitHub Connected</span>
                        </div>
                    )}
                    <p className="text-sm text-center text-zinc-400 leading-relaxed">
                        Final step before resume upload. Connect GitHub to analyze your contributions.
                    </p>
                </div>
            )}

            {/* Step 4: Resume */}
            {step === 4 && (
                <div className="space-y-5">
                    <div className="bg-zinc-600 rounded-xl p-4 text-center">
                        <span className="text-sm text-zinc-300">✓ GitHub Connected</span>
                    </div>
                    <div className="border-2 border-dashed border-zinc-500 rounded-xl p-6 text-center bg-zinc-600/40">
                        <input
                            type="file"
                            className="hidden"
                            id="resume-upload"
                            onChange={handleResumeUpload}
                            accept="application/pdf"
                        />
                        <label htmlFor="resume-upload" className="cursor-pointer text-zinc-300">
                            {resumeFile ? resumeFile.name : 'Upload resume (PDF)'}
                        </label>
                    </div>
                    {resumeError && (
                        <p className="text-sm text-red-400 text-center">{resumeError}</p>
                    )}
                    <button
                        onClick={handleCompleteRegistration}
                        disabled={!resumeFile || isUploadingResume}
                        className="w-full bg-zinc-500 hover:bg-zinc-400 text-white py-3 px-6 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUploadingResume ? 'Uploading...' : 'Complete Registration'}
                    </button>
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
