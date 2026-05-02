import React from 'react';
import { AlertTriangle, Shield, CheckCircle2 } from 'lucide-react';
import { MilestoneStatusLabels, MilestoneStatusColors } from '../Apis/escrowApi';

/**
 * DisputePanel — Shows milestone dispute/finalize actions.
 * @param {{ escrowAddress: string, milestones: Array, contributors: string[], oracle: string, arbitrator: string, onRefresh: () => void }} props
 */
const DisputePanel = ({ milestones }) => {
    return (
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid rgba(169, 146, 125, 0.15)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={18} style={{ color: '#a9927d' }} /> Disputes & Finalization
                </h3>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
                {milestones.map((ms, i) => {
                    const sc = MilestoneStatusColors[ms.status] || MilestoneStatusColors[0];
                    const canDispute = ms.status === 1 && ms.disputeDeadline && Date.now() / 1000 <= ms.disputeDeadline;
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

            <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(169, 146, 125, 0.08)', color: '#5e503f', fontSize: '12px' }}>
                On-chain dispute actions have been removed from the client.
            </div>
        </div>
    );
};

export default DisputePanel;
