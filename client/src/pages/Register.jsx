
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { Github, Clock, FileText, ArrowRight, Layers, CheckCircle2, UploadCloud } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { startGithubLogin } from '@/Apis/github-authApi';
import { uploadResume } from '@/Apis/resumeApi';
import { fetchWakatimeSession, startWakatimeOAuth } from '@/Apis/wakatime-authApi';

const Register = () => {
    const containerRef = useRef(null);
    const [step, setStep] = useState(1);
    const [resumeFile, setResumeFile] = useState(null);
    const [manualEmail, setManualEmail] = useState('');
    const [manualEmailError, setManualEmailError] = useState('');
    const [wakatimeConnected, setWakatimeConnected] = useState(false);
    const [githubConnected, setGithubConnected] = useState(false);
    const [isUploadingResume, setIsUploadingResume] = useState(false);
    const [resumeError, setResumeError] = useState('');
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
        startWakatimeOAuth();
    };

    const handleGithubConnect = () => {
        startGithubLogin(manualEmail.trim(), "register");
    };

    const handleManualEmailContinue = () => {
        const trimmedEmail = manualEmail.trim().toLowerCase();
        if (!trimmedEmail) {
            setManualEmailError('Please enter your WakaTime email.');
            return;
        }
        setManualEmailError('');
        setStep(3);
    };

    const handleResumeUpload = (e) => {
        const file = e.target.files[0];
        if(file) setResumeFile(file);
    };

    const handleFinalizeDetails = async () => {
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

        const provider = params.get('provider');

        const hydrateFromSession = async () => {
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
                window.history.replaceState({}, '', location.pathname);
            }
        };

        hydrateFromSession();
    }, [location.pathname, location.search, setUser]);
  
    return (
      <div ref={containerRef} className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden text-white">
        <div className="bg-glow absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] -z-10" />
        <div className="bg-glow absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] -z-10" />
        <div className="absolute inset-0 bg-grid-zinc-900/50 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] -z-10" />
  
        <div className="step-card w-full max-w-md bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl relative">
             {/* Progress Indicator */}
             <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800 rounded-t-3xl overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
                    style={{ width: `${getProgress()}%` }}
                />
            </div>

          <div className="text-center mb-8 pt-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 mb-4 shadow-lg shadow-indigo-500/20">
              <Layers size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              Create Account
            </h1>
            <p className="text-zinc-500 text-sm mt-2">
                Step {step} of 4: {step === 1 ? 'Connect WakaTime' : step === 2 ? 'Confirm Email' : step === 3 ? 'Connect GitHub' : 'Professional Details'}
            </p>
          </div>
  
          <div className="space-y-6">
            {/* Step 1: WakaTime */}
            {step === 1 && (
                <div className="space-y-4">
                    <button 
                        onClick={handleWakatimeConnect}
                        className="w-full bg-[#2c2c2c] hover:bg-[#383838] text-white py-4 rounded-2xl font-bold border border-zinc-700 transition-all flex items-center justify-between px-6 group"
                    >
                         <div className="flex items-center gap-4">
                            <Clock className="text-blue-400" size={24} />
                            <div className="text-left">
                                <span className="block text-sm font-medium">Connect WakaTime</span>
                                <span className="block text-xs text-zinc-500">Track Coding Stats</span>
                            </div>
                        </div>
                        <ArrowRight className="text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" size={20}/>
                    </button>
                    <p className="text-xs text-center text-zinc-500 px-4">
                        This allows us to generate your productivity analytics automatically.
                    </p>
                </div>
            )}

                        {/* Step 2: Manual Email */}
            {step === 2 && (
                 <div className="space-y-4">
                     <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-3 mb-4">
                        <CheckCircle2 className="text-green-500" size={20} />
                        <span className="text-sm text-green-400">WakaTime Connected</span>
                     </div>

                                        <div className="space-y-3">
                                                <label className="text-xs uppercase tracking-wider text-zinc-500">
                                                    Enter the email you used for WakaTime
                                                </label>
                                                <input
                                                    type="email"
                                                    value={manualEmail}
                                                    onChange={(event) => setManualEmail(event.target.value)}
                                                    className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="you@example.com"
                                                />
                                                {manualEmailError && (
                                                    <p className="text-xs text-rose-400">{manualEmailError}</p>
                                                )}
                                                <button
                                                    onClick={handleManualEmailContinue}
                                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-semibold transition-all"
                                                >
                                                    Continue to GitHub
                                                </button>
                                        </div>
                </div>
            )}

                        {/* Step 3: GitHub */}
                        {step === 3 && (
                                 <div className="space-y-4">
                                         <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-3 mb-4">
                                                <CheckCircle2 className="text-green-500" size={20} />
                                                <span className="text-sm text-green-400">Email Confirmed</span>
                                         </div>
                     
                                        <button 
                                                onClick={handleGithubConnect}
                                                className="w-full bg-[#24292e] hover:bg-[#2f363d] text-white py-4 rounded-2xl font-bold border border-zinc-700 transition-all flex items-center justify-between px-6 group"
                                        >
                                                 <div className="flex items-center gap-4">
                                                        <Github className="text-white" size={24} />
                                                        <div className="text-left">
                                                                <span className="block text-sm font-medium">Connect GitHub</span>
                                                                <span className="block text-xs text-zinc-500">Import Repositories</span>
                                                        </div>
                                                </div>
                                                <ArrowRight className="text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" size={20}/>
                                        </button>
                                        {githubConnected && (
                                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-3">
                                                <CheckCircle2 className="text-green-500" size={20} />
                                                <span className="text-sm text-green-400">GitHub Connected</span>
                                            </div>
                                        )}
                                 </div>
                        )}

            {/* Step 4: Resume */}
             {step === 4 && (
                 <div className="space-y-4">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-3 mb-4">
                        <CheckCircle2 className="text-green-500" size={20} />
                        <span className="text-sm text-green-400">GitHub Connected</span>
                     </div>

                    <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-8 text-center hover:border-indigo-500/50 hover:bg-zinc-800/30 transition-all cursor-pointer relative group">
                        <input 
                            type="file" 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                            onChange={handleResumeUpload}
                        />
                        <div className="flex flex-col items-center justify-center gap-2">
                             <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <UploadCloud className="text-indigo-400" size={24}/>
                             </div>
                             <p className="text-sm font-medium text-zinc-300">
                                {resumeFile ? resumeFile.name : 'Upload Resume (PDF)'}
                             </p>
                             <p className="text-xs text-zinc-500">
                                {resumeFile ? 'Click to change' : 'Drag & drop or click to browse'}
                             </p>
                        </div>
                    </div>

                    <button 
                         onClick={handleFinalizeDetails}
                         disabled={!resumeFile || isUploadingResume}
                         className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 mt-4 ${
                             resumeFile && !isUploadingResume
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/20' 
                              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                         }`}
                    >
                        {isUploadingResume ? 'Uploading Resume...' : 'Complete Registration'}
                    </button>
                    {resumeError && (
                      <p className="text-xs text-rose-400 text-center mt-2">{resumeError}</p>
                    )}
                </div>
             )}
          </div>
  
          <div className="mt-8 text-center pt-6 border-t border-zinc-800">
            <p className="text-zinc-500 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  };
  
  export default Register;
