
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { Github, Clock, FileText, ArrowRight, Layers, CheckCircle2, UploadCloud } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { startGithubLogin } from '@/Apis/github-authApi';

const Register = () => {
    const containerRef = useRef(null);
    const [step, setStep] = useState(1);
    const [resumeFile, setResumeFile] = useState(null);
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
        setTimeout(() => setStep(2), 1000);
    };

    const handleGithubConnect = () => {
        startGithubLogin();
    };

    const handleResumeUpload = (e) => {
        const file = e.target.files[0];
        if(file) setResumeFile(file);
    };

    const handleFinalizeDetails = () => {
        // Final registration logic
        setUser({ name: 'New User', email: 'new@example.com' });
        navigate('/dashboard');
    };

    const getProgress = () => {
        return (step / 3) * 100;
    };
  
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
                Step {step} of 3: {step === 1 ? 'Connect WakaTime' : step === 2 ? 'Connect GitHub' : 'Professional Details'}
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

            {/* Step 2: GitHub */}
            {step === 2 && (
                 <div className="space-y-4">
                     <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-3 mb-4">
                        <CheckCircle2 className="text-green-500" size={20} />
                        <span className="text-sm text-green-400">WakaTime Connected</span>
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
                </div>
            )}

            {/* Step 3: Resume */}
             {step === 3 && (
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
                         disabled={!resumeFile}
                         className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 mt-4 ${
                             resumeFile 
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/20' 
                              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                         }`}
                    >
                        Complete Registration
                    </button>
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
