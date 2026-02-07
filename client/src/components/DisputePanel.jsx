import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Shield, X, Send, CheckCircle2 } from 'lucide-react';
import { raiseDispute, resolveDispute, finalizeMilestone, MilestoneStatusLabels, MilestoneStatusColors } from '../Apis/escrowApi';
import { useWalletContext } from '../context/WalletContext';

/**
 * DisputePanel — Shows milestone dispute/finalize actions.
 * @param {{ escrowAddress: string, milestones: Array, contributors: string[], oracle: string, arbitrator: string, onRefresh: () => void }} props
 */
const DisputePanel = ({ escrowAddress, milestones, contributors, oracle, arbitrator, onRefresh }) => {
    const { account } = useWalletContext();
    const [selectedMilestone, setSelectedMilestone] = useState(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [showDisputeForm, setShowDisputeForm] = useState(false);

    const isArbitrator = account?.toLowerCase() === arbitrator?.toLowerCase();

    const handleRaiseDispute = async (milestoneId) => {
        if (!disputeReason.trim()) return;
        setIsSubmitting(true);
        setResult(null);
        try {
            const { txHash } = await raiseDispute(escrowAddress, milestoneId, disputeReason);
            setResult({ ok: true, txHash, action: 'dispute raised' });
            setShowDisputeForm(false);
            setDisputeReason('');
            onRefresh?.();
        } catch (err) {
            setResult({ ok: false, error: err.reason || err.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFinalize = async (milestoneId) => {
        setIsSubmitting(true);
        setResult(null);
        try {
            const { txHash } = await finalizeMilestone(escrowAddress, milestoneId);
            setResult({ ok: true, txHash, action: 'milestone finalized' });
            onRefresh?.();
        } catch (err) {
            setResult({ ok: false, error: err.reason || err.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid rgba(169, 146, 125, 0.15)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={18} style={{ color: '#a9927d' }} /> Disputes & Finalization
                </h3>
                {isArbitrator && (
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontWeight: '500' }}>
                        You are Arbitrator
                    </span>
                )}
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
                {milestones.map((ms, i) => {
                    const sc = MilestoneStatusColors[ms.status] || MilestoneStatusColors[0];
                    const canDispute = ms.status === 1 && ms.disputeDeadline && Date.now() / 1000 <= ms.disputeDeadline;
                    const canFinalize = ms.status === 1 && ms.disputeDeadline && Date.now() / 1000 > ms.disputeDeadline;
                    const isInDispute = ms.status === 2;

                    return (
                        <div key={i} style={{ background: '#fbf7ef', borderRadius: '10px', padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#2d2a26' }}>Milestone {i + 1}</span>
                                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: sc.bg, color: sc.text, fontWeight: '500' }}>
                                        {MilestoneStatusLabels[ms.status]}
                                    </span>
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: '500', color: '#5e503f' }}>${ms.budget}</span>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {canDispute && (
                                    <button
                                        onClick={() => { setSelectedMilestone(i); setShowDisputeForm(true); }}
                                        style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(234, 88, 12, 0.3)', background: 'white', color: '#ea580c', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <AlertTriangle size={10} /> Raise Dispute
                                    </button>
                                )}
                                {canFinalize && (
                                    <button
                                        onClick={() => handleFinalize(i)}
                                        disabled={isSubmitting}
                                        style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#16a34a', color: 'white', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', opacity: isSubmitting ? 0.6 : 1 }}
                                    >
                                        <CheckCircle2 size={10} /> Finalize
                                    </button>
                                )}
                                {isInDispute && (
                                    <span style={{ fontSize: '11px', color: '#ea580c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <AlertTriangle size={10} /> Awaiting arbitrator resolution
                                    </span>
                                )}
                                {ms.status === 3 && (
                                    <span style={{ fontSize: '11px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <CheckCircle2 size={10} /> Finalized
                                    </span>
                                )}
                            </div>

                            {ms.disputeDeadline > 0 && ms.status === 1 && (
                                <p style={{ fontSize: '10px', color: '#a9927d', margin: '6px 0 0' }}>
                                    Dispute window {canDispute ? 'closes' : 'closed'}: {new Date(ms.disputeDeadline * 1000).toLocaleString()}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Dispute Form Modal */}
            <AnimatePresence>
                {showDisputeForm && selectedMilestone !== null && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                        onClick={() => setShowDisputeForm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '420px', maxWidth: '90vw' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>Raise Dispute — Milestone {selectedMilestone + 1}</h4>
                                <button onClick={() => setShowDisputeForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a9927d' }}>
                                    <X size={18} />
                                </button>
                            </div>
                            <textarea
                                value={disputeReason}
                                onChange={(e) => setDisputeReason(e.target.value)}
                                placeholder="Explain why you're disputing the scores..."
                                style={{ width: '100%', minHeight: '100px', borderRadius: '10px', border: '1px solid rgba(169, 146, 125, 0.3)', padding: '12px', fontSize: '13px', fontFamily: "'Jost', sans-serif", resize: 'vertical', boxSizing: 'border-box' }}
                            />
                            <button
                                onClick={() => handleRaiseDispute(selectedMilestone)}
                                disabled={isSubmitting || !disputeReason.trim()}
                                style={{ marginTop: '12px', width: '100%', padding: '10px', borderRadius: '10px', border: 'none', background: '#ea580c', color: 'white', fontSize: '13px', fontWeight: '500', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: (isSubmitting || !disputeReason.trim()) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                                <Send size={14} /> {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Result toast */}
            {result && (
                <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: result.ok ? 'rgba(22, 163, 74, 0.08)' : 'rgba(220, 38, 38, 0.08)', color: result.ok ? '#16a34a' : '#dc2626', fontSize: '12px' }}>
                    {result.ok ? `Success: ${result.action} (${result.txHash.slice(0, 10)}...)` : `Error: ${result.error}`}
                </div>
            )}
        </div>
    );
};

export default DisputePanel;
