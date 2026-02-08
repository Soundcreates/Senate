import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Shield, Clock, DollarSign, Users, Loader2, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { useWalletContext } from '../context/WalletContext';
import { checkUSDCAllowance, approveUSDC, createEscrow } from '../Apis/escrowApi';
import { linkEscrowToProject } from '../Apis/projectApis';
import { getOracleStatus } from '../Apis/oracleApi';
import { shortenAddress } from '../contracts/utils';
import { BLOCK_EXPLORER } from '../contracts/addresses/sepolia';

/**
 * DeployEscrowModal — Full escrow deployment flow.
 * 1. Connect wallet
 * 2. Enter contributor wallets, milestone budgets, deadlines
 * 3. Approve USDC
 * 4. Deploy escrow via Factory
 * 5. Link escrow to project in backend
 *
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - project: { _id, name, team, budget }
 * - onDeployed: (escrowAddress) => void
 */
const DeployEscrowModal = ({ isOpen, onClose, project, onDeployed }) => {
    const { account, isConnected, isCorrectNetwork, usdcBalance, connect, refreshBalances } = useWalletContext();

    // Form state
    const [oracle, setOracle] = useState('');
    const [arbitrator, setArbitrator] = useState('');
    const [contributors, setContributors] = useState(['']);
    const [milestones, setMilestones] = useState([{ budget: '', deadline: '' }]);

    // Flow state
    const [step, setStep] = useState('form'); // form | approve | deploy | linking | done
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [txHash, setTxHash] = useState(null);
    const [escrowAddress, setEscrowAddress] = useState(null);

    // Auto-populate oracle from backend
    useEffect(() => {
        if (isOpen) {
            getOracleStatus().then(res => {
                if (res.ok && res.oracle) setOracle(res.oracle);
            });
        }
    }, [isOpen]);

    // Pre-fill contributors from project team if they have wallet addresses
    useEffect(() => {
        if (isOpen && project?.team?.length > 0) {
            const wallets = project.team
                .map(m => m.walletAddress || '')
                .filter(w => /^0x[a-fA-F0-9]{40}$/.test(w));
            if (wallets.length > 0) {
                setContributors(wallets);
            }
        }
    }, [isOpen, project]);

    const totalBudget = milestones.reduce((s, m) => s + (parseFloat(m.budget) || 0), 0);

    const addContributor = () => setContributors([...contributors, '']);
    const removeContributor = (i) => setContributors(contributors.filter((_, j) => j !== i));
    const updateContributor = (i, val) => {
        const next = [...contributors];
        next[i] = val;
        setContributors(next);
    };

    const addMilestone = () => setMilestones([...milestones, { budget: '', deadline: '' }]);
    const removeMilestone = (i) => setMilestones(milestones.filter((_, j) => j !== i));
    const updateMilestone = (i, field, val) => {
        const next = [...milestones];
        next[i] = { ...next[i], [field]: val };
        setMilestones(next);
    };

    const validateForm = () => {
        if (!oracle || !/^0x[a-fA-F0-9]{40}$/.test(oracle)) return 'Invalid oracle address';
        if (!arbitrator || !/^0x[a-fA-F0-9]{40}$/.test(arbitrator)) return 'Invalid arbitrator address';
        const validContributors = contributors.filter(c => /^0x[a-fA-F0-9]{40}$/.test(c));
        if (validContributors.length === 0) return 'At least one valid contributor address required';
        if (milestones.some(m => !m.budget || parseFloat(m.budget) <= 0)) return 'All milestones need a positive budget';
        if (milestones.some(m => !m.deadline)) return 'All milestones need a deadline';
        if (totalBudget > parseFloat(usdcBalance)) return `Insufficient USDC balance (need $${totalBudget}, have $${parseFloat(usdcBalance).toFixed(2)})`;
        return null;
    };

    const handleApproveAndDeploy = async () => {
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }
        setError(null);

        const validContributors = contributors.filter(c => /^0x[a-fA-F0-9]{40}$/.test(c));
        const budgets = milestones.map(m => m.budget);
        const deadlines = milestones.map(m => Math.floor(new Date(m.deadline).getTime() / 1000));

        setIsLoading(true);

        try {
            // Step 1: Check & approve USDC allowance
            setStep('approve');
            const allowance = await checkUSDCAllowance(account);
            const needed = budgets.reduce((s, b) => s + parseFloat(b), 0);
            const allowanceNum = parseFloat(allowance.toString()) / 1e6;

            if (allowanceNum < needed) {
                await approveUSDC(String(needed));
            }

            // Step 2: Deploy escrow
            setStep('deploy');
            const result = await createEscrow({
                oracle,
                arbitrator,
                contributors: validContributors,
                milestoneBudgets: budgets,
                milestoneDeadlines: deadlines,
            });

            setTxHash(result.txHash);
            setEscrowAddress(result.escrowAddress);

            // Step 3: Link to backend
            setStep('linking');
            await linkEscrowToProject(project._id, {
                escrowAddress: result.escrowAddress,
                txHash: result.txHash,
                chainId: 11155111,
            });

            setStep('done');
            await refreshBalances();
            onDeployed?.(result.escrowAddress);
        } catch (err) {
            console.error('Escrow deploy failed:', err);
            setError(err.reason || err.message || 'Deployment failed');
            setStep('form');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, fontFamily: "'Jost', sans-serif" }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ background: '#fbf7ef', borderRadius: '20px', width: '560px', maxWidth: '95vw', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
                >
                    {/* Header */}
                    <div style={{ padding: '20px 24px', background: 'white', borderBottom: '1px solid rgba(169, 146, 125, 0.15)', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: '500', color: '#2d2a26', margin: 0 }}>Deploy Escrow</h2>
                            <p style={{ fontSize: '12px', color: '#a9927d', margin: '4px 0 0' }}>{project?.name || 'Project'}</p>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a9927d' }}><X size={20} /></button>
                    </div>

                    <div style={{ padding: '20px 24px' }}>
                        {/* Step: Done */}
                        {step === 'done' && (
                            <div style={{ textAlign: 'center', padding: '30px 0' }}>
                                <CheckCircle2 size={48} style={{ color: '#16a34a', marginBottom: '16px' }} />
                                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2d2a26', margin: '0 0 8px' }}>Escrow Deployed!</h3>
                                <p style={{ fontSize: '13px', color: '#5e503f', margin: '0 0 16px' }}>
                                    Contract: <a href={`${BLOCK_EXPLORER}/address/${escrowAddress}`} target="_blank" rel="noreferrer" style={{ color: '#a9927d', fontFamily: 'monospace' }}>{shortenAddress(escrowAddress)}</a>
                                </p>
                                <a href={`${BLOCK_EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#a9927d', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', textDecoration: 'none' }}>
                                    View Transaction <ExternalLink size={10} />
                                </a>
                                <button onClick={onClose} style={{ marginTop: '24px', padding: '10px 32px', borderRadius: '10px', border: 'none', background: '#a9927d', color: 'white', fontSize: '13px', cursor: 'pointer' }}>
                                    Done
                                </button>
                            </div>
                        )}

                        {/* Step: Loading states */}
                        {(step === 'approve' || step === 'deploy' || step === 'linking') && (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <Loader2 size={36} style={{ color: '#a9927d', animation: 'spin 1s linear infinite' }} />
                                <p style={{ fontSize: '14px', color: '#5e503f', margin: '16px 0 0' }}>
                                    {step === 'approve' && 'Approving USDC...'}
                                    {step === 'deploy' && 'Deploying escrow contract...'}
                                    {step === 'linking' && 'Linking escrow to project...'}
                                </p>
                                <p style={{ fontSize: '12px', color: '#a9927d', margin: '6px 0 0' }}>Please confirm in MetaMask</p>
                                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                            </div>
                        )}

                        {/* Step: Form */}
                        {step === 'form' && (
                            <>
                                {/* Wallet check */}
                                {!isConnected ? (
                                    <div style={{ textAlign: 'center', padding: '20px' }}>
                                        <Wallet size={32} style={{ color: '#a9927d', marginBottom: '12px' }} />
                                        <p style={{ fontSize: '14px', color: '#5e503f', marginBottom: '16px' }}>Connect your wallet to deploy an escrow</p>
                                        <button onClick={connect} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: '#a9927d', color: 'white', fontSize: '13px', cursor: 'pointer' }}>
                                            Connect MetaMask
                                        </button>
                                    </div>
                                ) : !isCorrectNetwork ? (
                                    <div style={{ textAlign: 'center', padding: '20px' }}>
                                        <AlertTriangle size={32} style={{ color: '#ea580c', marginBottom: '12px' }} />
                                        <p style={{ fontSize: '14px', color: '#ea580c' }}>Please switch to Sepolia testnet</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Balance display */}
                                        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                                            <div style={{ flex: 1, background: 'white', borderRadius: '10px', padding: '12px', border: '1px solid rgba(169, 146, 125, 0.15)' }}>
                                                <p style={{ fontSize: '11px', color: '#a9927d', margin: 0 }}>Your USDC</p>
                                                <p style={{ fontSize: '18px', fontWeight: '600', color: '#2d2a26', margin: '4px 0 0' }}>${parseFloat(usdcBalance).toFixed(2)}</p>
                                            </div>
                                            <div style={{ flex: 1, background: 'white', borderRadius: '10px', padding: '12px', border: '1px solid rgba(169, 146, 125, 0.15)' }}>
                                                <p style={{ fontSize: '11px', color: '#a9927d', margin: 0 }}>Total Budget</p>
                                                <p style={{ fontSize: '18px', fontWeight: '600', color: totalBudget > parseFloat(usdcBalance) ? '#dc2626' : '#2d2a26', margin: '4px 0 0' }}>${totalBudget.toFixed(2)}</p>
                                            </div>
                                        </div>

                                        {/* Oracle + Arbitrator */}
                                        <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: '500', color: '#5e503f', display: 'block', marginBottom: '4px' }}>
                                                    <Shield size={12} style={{ display: 'inline', marginRight: '4px' }} /> Oracle Address
                                                </label>
                                                <input value={oracle} onChange={(e) => setOracle(e.target.value)} placeholder="0x..." style={inputStyle} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: '500', color: '#5e503f', display: 'block', marginBottom: '4px' }}>
                                                    <Shield size={12} style={{ display: 'inline', marginRight: '4px' }} /> Arbitrator Address
                                                </label>
                                                <input value={arbitrator} onChange={(e) => setArbitrator(e.target.value)} placeholder="0x..." style={inputStyle} />
                                            </div>
                                        </div>

                                        {/* Contributors */}
                                        <div style={{ marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: '500', color: '#5e503f' }}>
                                                    <Users size={12} style={{ display: 'inline', marginRight: '4px' }} /> Contributors ({contributors.length})
                                                </label>
                                                <button onClick={addContributor} style={addBtnStyle}>+ Add</button>
                                            </div>
                                            {contributors.map((c, i) => (
                                                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                                                    <input value={c} onChange={(e) => updateContributor(i, e.target.value)} placeholder={`Contributor ${i + 1} wallet (0x...)`} style={{ ...inputStyle, flex: 1 }} />
                                                    {contributors.length > 1 && (
                                                        <button onClick={() => removeContributor(i)} style={{ ...addBtnStyle, color: '#dc2626', borderColor: 'rgba(220, 38, 38, 0.3)' }}>×</button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Milestones */}
                                        <div style={{ marginBottom: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: '500', color: '#5e503f' }}>
                                                    <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} /> Milestones ({milestones.length})
                                                </label>
                                                <button onClick={addMilestone} style={addBtnStyle}>+ Add</button>
                                            </div>
                                            {milestones.map((ms, i) => (
                                                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <input type="number" value={ms.budget} onChange={(e) => updateMilestone(i, 'budget', e.target.value)} placeholder={`Budget (USDC)`} style={inputStyle} />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <input type="datetime-local" value={ms.deadline} onChange={(e) => updateMilestone(i, 'deadline', e.target.value)} style={inputStyle} />
                                                    </div>
                                                    {milestones.length > 1 && (
                                                        <button onClick={() => removeMilestone(i)} style={{ ...addBtnStyle, color: '#dc2626', borderColor: 'rgba(220, 38, 38, 0.3)' }}>×</button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {error && (
                                            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(220, 38, 38, 0.08)', color: '#dc2626', fontSize: '12px', marginBottom: '16px' }}>
                                                {error}
                                            </div>
                                        )}

                                        <button
                                            onClick={handleApproveAndDeploy}
                                            disabled={isLoading}
                                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #a9927d, #5e503f)', color: 'white', fontSize: '14px', fontWeight: '500', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                        >
                                            <DollarSign size={16} /> Deploy Escrow (${totalBudget.toFixed(2)} USDC)
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(169, 146, 125, 0.3)',
    fontSize: '13px',
    fontFamily: "'Jost', sans-serif",
    color: '#2d2a26',
    background: 'white',
    boxSizing: 'border-box',
};

const addBtnStyle = {
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid rgba(169, 146, 125, 0.3)',
    background: 'white',
    color: '#5e503f',
    fontSize: '11px',
    cursor: 'pointer',
};

export default DeployEscrowModal;
