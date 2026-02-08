
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { useAuth } from '../context/AuthContext';
import { useWalletContext } from '../context/WalletContext';
import { startGithubLogin } from '@/Apis/github-authApi';
import { fetchWakatimeSession, startWakatimeOAuth } from '@/Apis/wakatime-authApi';
import { uploadResume } from '@/Apis/resumeApi';
import { registerAdmin } from '@/Apis/admin-authApi';
import { registerDeveloper } from '@/Apis/authApi';
import { submitToVectorDB } from '@/Apis/vectorDbApi';

const Register = () => {
    const containerRef = useRef(null);
    const resumeInputRef = useRef(null);
    const oauthProcessedRef = useRef(false);
    const [step, setStep] = useState(1);
    const [roleChoice, setRoleChoice] = useState(null);
    const [manualEmail, setManualEmail] = useState('');
    const [developerEmail, setDeveloperEmail] = useState('');
    const [developerPassword, setDeveloperPassword] = useState('');
    const [developerPasswordConfirm, setDeveloperPasswordConfirm] = useState('');
    const [developerError, setDeveloperError] = useState('');
    const [isSubmittingDeveloper, setIsSubmittingDeveloper] = useState(false);
    const [role, setRole] = useState('developer');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
    const [adminError, setAdminError] = useState('');
    const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
    const [wakatimeConnected, setWakatimeConnected] = useState(false);
    const [githubConnected, setGithubConnected] = useState(false);
    const [resumeFile, setResumeFile] = useState(null);
    const [resumeError, setResumeError] = useState('');
    const [isUploadingResume, setIsUploadingResume] = useState(false);
    const [fullName, setFullName] = useState('');
    const [developerRole, setDeveloperRole] = useState('developer');
    const [tier, setTier] = useState('junior');
    const [walletAddress, setWalletAddress] = useState('');
    const [profileError, setProfileError] = useState('');
    const [isConnectingWallet, setIsConnectingWallet] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { setUser, setToken } = useAuth();
    const { account: walletAccount, isConnected: isWalletConnected, connect: connectMetaMask } = useWalletContext();

    // Sync MetaMask connected address to walletAddress state
    useEffect(() => {
        if (walletAccount && isWalletConnected) {
            setWalletAddress(walletAccount);
        }
    }, [walletAccount, isWalletConnected]);

    const handleConnectWallet = async () => {
        setIsConnectingWallet(true);
        try {
            const addr = await connectMetaMask();
            if (addr) {
                setWalletAddress(addr);
            }
        } catch (err) {
            setProfileError('Failed to connect wallet. Make sure MetaMask is installed.');
        } finally {
            setIsConnectingWallet(false);
        }
    };

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
        startGithubLogin(manualEmail.trim(), "register", role);
    };

    const handleRoleContinue = () => {
        if (roleChoice === 'admin') {
            setRole('admin');
            return;
        }
        setRole('developer');
        setStep(1);
    };

    const handleAdminRegister = async () => {
        if (isSubmittingAdmin) return;
        const trimmedEmail = adminEmail.trim().toLowerCase();
        if (!trimmedEmail || !adminPassword) {
            setAdminError('Email and password are required.');
            return;
        }
        if (adminPassword !== adminPasswordConfirm) {
            setAdminError('Passwords do not match.');
            return;
        }

        setAdminError('');
        setIsSubmittingAdmin(true);
        const result = await registerAdmin({ email: trimmedEmail, password: adminPassword, name: 'Admin' });
        if (!result.ok) {
            setAdminError(result.error === 'email_in_use' ? 'Email already in use.' : 'Registration failed.');
            setIsSubmittingAdmin(false);
            return;
        }

        setToken(result.token);
        setUser(result.user);
        navigate('/dashboard');
    };

    const handleDeveloperRegister = async () => {
        if (isSubmittingDeveloper) return;
        const trimmedEmail = developerEmail.trim().toLowerCase();
        if (!trimmedEmail || !developerPassword) {
            setDeveloperError('Email and password are required.');
            return;
        }
        if (developerPassword !== developerPasswordConfirm) {
            setDeveloperError('Passwords do not match.');
            return;
        }

        setDeveloperError('');
        setIsSubmittingDeveloper(true);
        const result = await registerDeveloper({ email: trimmedEmail, password: developerPassword, name: trimmedEmail });
        if (!result.ok) {
            setDeveloperError(result.error === 'email_in_use' ? 'Email already in use.' : 'Registration failed.');
            setIsSubmittingDeveloper(false);
            return;
        }

        setUser(result.user);
        setManualEmail(trimmedEmail);
        try {
            localStorage.setItem('register.email', trimmedEmail);
        } catch (_error) {
            // ignore storage failures
        }
        setStep(2);
    };

    const handleResumeUpload = (event) => {
        const file = event.target.files?.[0];
        setResumeFile(file || null);
        setResumeError('');
    };

    const handleResumeDragOver = (event) => {
        event.preventDefault();
    };

    const handleResumeDrop = (event) => {
        event.preventDefault();
        const file = event.dataTransfer?.files?.[0];
        if (file) {
            setResumeFile(file);
            setResumeError('');
        }
    };

    const handleProfileContinue = () => {
        if (!fullName.trim() || !walletAddress.trim()) {
            setProfileError('Please fill in all required fields.');
            return;
        }
        // Basic wallet address validation (0x followed by 40 hex characters)
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress.trim())) {
            setProfileError('Invalid wallet address format.');
            return;
        }
        setProfileError('');
        setStep(5);
    };

    const handleCompleteRegistration = async () => {
        if (!resumeFile || isUploadingResume) return;
        setResumeError('');
        setIsUploadingResume(true);

        // First, upload resume to our backend
        const resumeResult = await uploadResume(resumeFile);
        if (!resumeResult.ok) {
            setResumeError('Resume upload failed. Please try again.');
            setIsUploadingResume(false);
            return;
        }

        // Then, submit to vector database workflow
        const vectorDbResult = await submitToVectorDB({
            name: fullName.trim(),
            role: developerRole,
            tier: tier,
            walletAddress: walletAddress.trim(),
            resume: resumeFile
        });

        if (!vectorDbResult.ok) {
            console.warn('Vector DB submission failed, but continuing registration');
        }

        navigate('/dashboard');
    };

    const getProgress = () => {
        if (roleChoice !== 'developer') return 0;
        return (step / 5) * 100;
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
                setRoleChoice('developer');
                setRole('developer');
                try {
                    const storedEmail = localStorage.getItem('register.email');
                    if (storedEmail) {
                        setManualEmail(storedEmail);
                    }
                } catch (_error) {
                    // ignore storage failures
                }
                setWakatimeConnected(Boolean(result.user.wakatimeConnected));
                setGithubConnected(Boolean(result.user.githubConnected));
                if (provider === 'wakatime') {
                    setStep(3);
                }
                if (provider === 'github') {
                    try {
                        localStorage.removeItem('register.email');
                    } catch (_error) {
                        // ignore storage failures
                    }
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
        <div ref={containerRef} className="min-h-screen bg-[#fbf7ef] flex items-center justify-center p-6 text-[#2d2a26]">
            <div className="bg-glow absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#a9927d]/10 rounded-full blur-[100px] -z-10" />
            <div className="bg-glow absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#a9927d]/10 rounded-full blur-[100px] -z-10" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(169,146,125,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(169,146,125,0.03)_1px,transparent_1px)] bg-[size:24px_24px] -z-10" />

            <div className="step-card w-full max-w-lg bg-white rounded-2xl p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#a9927d]/10">
                {/* Progress Indicator */}
                <div className="mb-8">
                    <div className="h-2 bg-[#f0eadd] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#a9927d] transition-all duration-500 ease-out"
                            style={{ width: `${getProgress()}%` }}
                        />
                    </div>
                </div>

                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-[#2d2a26] mb-3 font-['Jost']">
                        Create Account
                    </h1>
                    <p className="text-[#a9927d] text-base font-['Jost']">
                        {roleChoice === 'admin'
                            ? 'Create an admin account'
                            : roleChoice === 'developer'
                                ? `Step ${step} of 5: ${step === 1 ? 'Create Account' : step === 2 ? 'Connect WakaTime' : step === 3 ? 'Connect GitHub' : step === 4 ? 'Profile Details' : 'Upload Resume'}`
                                : 'Choose your role to begin'}
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Step 0: Role Selection */}
                    {!roleChoice && (
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <p className="text-sm text-[#5e503f] text-left font-['Jost']">Select your role</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setRoleChoice('developer')}
                                        className={`rounded-xl px-4 py-3 text-sm font-medium transition-all font-['Jost'] border ${roleChoice === 'developer'
                                            ? 'bg-[#a9927d] text-white border-[#a9927d]'
                                            : 'bg-[#fbf7ef] text-[#5e503f] border-[#a9927d]/10 hover:bg-[#f0eadd]'
                                            }`}
                                    >
                                        Developer
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRoleChoice('admin')}
                                        className={`rounded-xl px-4 py-3 text-sm font-medium transition-all font-['Jost'] border ${roleChoice === 'admin'
                                            ? 'bg-[#a9927d] text-white border-[#a9927d]'
                                            : 'bg-[#fbf7ef] text-[#5e503f] border-[#a9927d]/10 hover:bg-[#f0eadd]'
                                            }`}
                                    >
                                        Admin
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Admin Registration */}
                    {roleChoice === 'admin' && (
                        <div className="space-y-5">
                            <div className="space-y-4">
                                <label className="block text-sm text-[#5e503f] text-left font-['Jost']">Admin email</label>
                                <input
                                    type="email"
                                    value={adminEmail}
                                    onChange={(event) => setAdminEmail(event.target.value)}
                                    className="w-full rounded-xl bg-[#fbf7ef] border border-[#a9927d]/10 px-4 py-3 text-[#2d2a26] placeholder-[#a9927d]/50 focus:outline-none focus:ring-2 focus:ring-[#a9927d]/20 focus:border-[#a9927d] transition-all font-['Jost']"
                                    placeholder="admin@example.com"
                                />
                                <label className="block text-sm text-[#5e503f] text-left font-['Jost']">Password</label>
                                <input
                                    type="password"
                                    value={adminPassword}
                                    onChange={(event) => setAdminPassword(event.target.value)}
                                    className="w-full rounded-xl bg-[#fbf7ef] border border-[#a9927d]/10 px-4 py-3 text-[#2d2a26] placeholder-[#a9927d]/50 focus:outline-none focus:ring-2 focus:ring-[#a9927d]/20 focus:border-[#a9927d] transition-all font-['Jost']"
                                    placeholder="••••••••"
                                />
                                <label className="block text-sm text-[#5e503f] text-left font-['Jost']">Confirm password</label>
                                <input
                                    type="password"
                                    value={adminPasswordConfirm}
                                    onChange={(event) => setAdminPasswordConfirm(event.target.value)}
                                    className="w-full rounded-xl bg-[#fbf7ef] border border-[#a9927d]/10 px-4 py-3 text-[#2d2a26] placeholder-[#a9927d]/50 focus:outline-none focus:ring-2 focus:ring-[#a9927d]/20 focus:border-[#a9927d] transition-all font-['Jost']"
                                    placeholder="••••••••"
                                />
                                {adminError && (
                                    <p className="text-sm text-red-500 text-left">{adminError}</p>
                                )}
                                <button
                                    onClick={handleAdminRegister}
                                    disabled={isSubmittingAdmin}
                                    className="w-full bg-[#a9927d] hover:bg-[#8c7a6b] text-white py-3 px-6 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed font-['Jost'] shadow-lg shadow-[#a9927d]/20"
                                >
                                    {isSubmittingAdmin ? 'Creating account...' : 'Create Admin Account'}
                                </button>
                            </div>
                        </div>
                    )}
                    {/* Step 1: WakaTime */}
                    {roleChoice === 'developer' && step === 1 && (
                        <div className="space-y-5">
                            <div className="space-y-4">
                                <label className="block text-sm text-[#5e503f] text-left font-['Jost']">Email</label>
                                <input
                                    type="email"
                                    value={developerEmail}
                                    onChange={(event) => setDeveloperEmail(event.target.value)}
                                    className="w-full rounded-xl bg-[#fbf7ef] border border-[#a9927d]/10 px-4 py-3 text-[#2d2a26] placeholder-[#a9927d]/50 focus:outline-none focus:ring-2 focus:ring-[#a9927d]/20 focus:border-[#a9927d] transition-all font-['Jost']"
                                    placeholder="you@example.com"
                                />
                                <label className="block text-sm text-[#5e503f] text-left font-['Jost']">Password</label>
                                <input
                                    type="password"
                                    value={developerPassword}
                                    onChange={(event) => setDeveloperPassword(event.target.value)}
                                    className="w-full rounded-xl bg-[#fbf7ef] border border-[#a9927d]/10 px-4 py-3 text-[#2d2a26] placeholder-[#a9927d]/50 focus:outline-none focus:ring-2 focus:ring-[#a9927d]/20 focus:border-[#a9927d] transition-all font-['Jost']"
                                    placeholder="••••••••"
                                />
                                <label className="block text-sm text-[#5e503f] text-left font-['Jost']">Confirm password</label>
                                <input
                                    type="password"
                                    value={developerPasswordConfirm}
                                    onChange={(event) => setDeveloperPasswordConfirm(event.target.value)}
                                    className="w-full rounded-xl bg-[#fbf7ef] border border-[#a9927d]/10 px-4 py-3 text-[#2d2a26] placeholder-[#a9927d]/50 focus:outline-none focus:ring-2 focus:ring-[#a9927d]/20 focus:border-[#a9927d] transition-all font-['Jost']"
                                    placeholder="••••••••"
                                />
                                {developerError && (
                                    <p className="text-sm text-red-500 text-left">{developerError}</p>
                                )}
                                <button
                                    onClick={handleDeveloperRegister}
                                    disabled={isSubmittingDeveloper}
                                    className="w-full bg-[#a9927d] hover:bg-[#8c7a6b] text-white py-3 px-6 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed font-['Jost'] shadow-lg shadow-[#a9927d]/20"
                                >
                                    {isSubmittingDeveloper ? 'Creating account...' : 'Continue to WakaTime'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Email */}
                    {roleChoice === 'developer' && step === 2 && (
                        <div className="space-y-5">
                            <div className="bg-[#fbf7ef] rounded-xl p-4 text-center border border-[#a9927d]/10">
                                <span className="text-sm text-[#a9927d]">✓ Account Created</span>
                            </div>
                            <button
                                onClick={handleWakatimeConnect}
                                className="w-full bg-[#fbf7ef] hover:bg-[#f0eadd] text-[#2d2a26] py-4 px-6 rounded-xl font-medium transition-all text-center border border-[#a9927d]/20"
                            >
                                <div className="text-lg font-semibold mb-1 font-['Jost']">Connect WakaTime</div>
                                <div className="text-sm text-[#a9927d]">Track your coding statistics</div>
                            </button>
                            <p className="text-sm text-center text-[#5e503f] leading-relaxed font-['Jost']">
                                This allows us to generate your productivity analytics automatically.
                            </p>
                        </div>
                    )}

                    {/* Step 3: GitHub */}
                    {roleChoice === 'developer' && step === 3 && (
                        <div className="space-y-5">
                            <div className="bg-[#fbf7ef] rounded-xl p-4 text-center border border-[#a9927d]/10">
                                <span className="text-sm text-[#a9927d]">✓ WakaTime Connected</span>
                            </div>

                            <button
                                onClick={handleGithubConnect}
                                className="w-full bg-[#fbf7ef] hover:bg-[#f0eadd] text-[#2d2a26] py-4 px-6 rounded-xl font-medium transition-all text-center border border-[#a9927d]/20"
                            >
                                <div className="text-lg font-semibold mb-1 font-['Jost']">Connect GitHub</div>
                                <div className="text-sm text-[#a9927d]">Import repositories & contributions</div>
                            </button>
                            {githubConnected && (
                                <div className="bg-[#fbf7ef] rounded-xl p-4 text-center border border-[#a9927d]/10">
                                    <span className="text-sm text-[#a9927d]">✓ GitHub Connected</span>
                                </div>
                            )}
                            <button
                                onClick={() => setStep(4)}
                                disabled={!githubConnected}
                                className="w-full bg-[#a9927d] hover:bg-[#8c7a6b] text-white py-3 px-6 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed font-['Jost'] shadow-lg shadow-[#a9927d]/20"
                            >
                                Continue
                            </button>
                            <p className="text-sm text-center text-[#5e503f] leading-relaxed font-['Jost']">
                                Connect GitHub to analyze your contributions.
                            </p>
                        </div>
                    )}

                    {/* Step 4: Profile Details */}
                    {roleChoice === 'developer' && step === 4 && (
                        <div className="space-y-5">
                            <div className="bg-[#fbf7ef] rounded-xl p-4 text-center border border-[#a9927d]/10">
                                <span className="text-sm text-[#a9927d]">✓ GitHub Connected</span>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-[#5e503f] mb-2 font-['Jost']">Full Name *</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Enter your full name"
                                        className="w-full px-4 py-3 bg-[#fbf7ef] border border-[#a9927d]/20 rounded-xl focus:outline-none focus:border-[#a9927d] transition-colors font-['Jost']"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-[#5e503f] mb-2 font-['Jost']">Role *</label>
                                    <select
                                        value={developerRole}
                                        onChange={(e) => setDeveloperRole(e.target.value)}
                                        className="w-full px-4 py-3 bg-[#fbf7ef] border border-[#a9927d]/20 rounded-xl focus:outline-none focus:border-[#a9927d] transition-colors font-['Jost']"
                                    >
                                        <option value="developer">developer</option>
                                        <option value="hr">hr</option>
                                        <option value="legal">legal</option>
                                        <option value="finance">finance</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm text-[#5e503f] mb-2 font-['Jost']">Experience Tier *</label>
                                    <select
                                        value={tier}
                                        onChange={(e) => setTier(e.target.value)}
                                        className="w-full px-4 py-3 bg-[#fbf7ef] border border-[#a9927d]/20 rounded-xl focus:outline-none focus:border-[#a9927d] transition-colors font-['Jost']"
                                    >
                                        <option value="intern">intern</option>
                                        <option value="junior">junior</option>
                                        <option value="senior">senior</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm text-[#5e503f] mb-2 font-['Jost']">Wallet Address *</label>
                                    {isWalletConnected && walletAddress ? (
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 px-4 py-3 bg-[#fbf7ef] border border-green-300 rounded-xl font-['Jost'] font-mono text-sm text-[#2d2a26] flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                                                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                                            </div>
                                            <span className="text-xs text-green-600 font-['Jost']">Connected</span>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleConnectWallet}
                                            disabled={isConnectingWallet}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#fbf7ef] border border-[#a9927d]/20 rounded-xl hover:bg-[#f0eadd] transition-colors font-['Jost'] text-sm text-[#5e503f] disabled:opacity-50"
                                        >
                                            {isConnectingWallet ? 'Connecting...' : 'Connect MetaMask Wallet'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {profileError && (
                                <p className="text-sm text-red-500 text-center">{profileError}</p>
                            )}

                            <button
                                onClick={handleProfileContinue}
                                className="w-full bg-[#a9927d] hover:bg-[#8c7a6b] text-white py-3 px-6 rounded-xl font-medium transition-all font-['Jost'] shadow-lg shadow-[#a9927d]/20"
                            >
                                Continue to Resume Upload
                            </button>
                        </div>
                    )}

                    {/* Step 5: Resume */}
                    {roleChoice === 'developer' && step === 5 && (
                        <div className="space-y-5">
                            <div className="bg-[#fbf7ef] rounded-xl p-4 text-center border border-[#a9927d]/10">
                                <span className="text-sm text-[#a9927d]">✓ Profile Complete</span>
                            </div>
                            <div
                                className="border-2 border-dashed border-[#a9927d]/30 rounded-xl p-6 text-center bg-[#fbf7ef]/50 hover:bg-[#fbf7ef] transition-colors cursor-pointer"
                                onClick={() => resumeInputRef.current?.click()}
                                onDragOver={handleResumeDragOver}
                                onDrop={handleResumeDrop}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        resumeInputRef.current?.click();
                                    }
                                }}
                            >
                                <input
                                    type="file"
                                    className="hidden"
                                    id="resume-upload"
                                    onChange={handleResumeUpload}
                                    accept="application/pdf"
                                    ref={resumeInputRef}
                                />
                                <label htmlFor="resume-upload" className="cursor-pointer text-[#5e503f] font-['Jost']">
                                    {resumeFile ? resumeFile.name : 'Upload resume (PDF)'}
                                </label>
                            </div>
                            {resumeError && (
                                <p className="text-sm text-red-500 text-center">{resumeError}</p>
                            )}
                            <button
                                onClick={handleCompleteRegistration}
                                disabled={!resumeFile || isUploadingResume}
                                className="w-full bg-[#a9927d] hover:bg-[#8c7a6b] text-white py-3 px-6 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed font-['Jost'] shadow-lg shadow-[#a9927d]/20"
                            >
                                {isUploadingResume ? 'Uploading...' : 'Complete Registration'}
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-10 text-center pt-6 border-t border-[#a9927d]/10">
                    <p className="text-[#5e503f] text-sm font-['Jost']">
                        Already have an account?{' '}
                        <Link to="/login" className="text-[#a9927d] font-medium hover:text-[#8c7a6b] transition-colors underline">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
