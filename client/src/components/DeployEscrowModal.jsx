import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, AlertTriangle } from 'lucide-react';

const DeployEscrowModal = ({ isOpen, onClose, project }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, fontFamily: "'Jost', sans-serif" }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ background: '#fbf7ef', borderRadius: '20px', width: '560px', maxWidth: '95vw', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
                >
                    <div style={{ padding: '20px 24px', background: 'white', borderBottom: '1px solid rgba(169, 146, 125, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: '500', color: '#2d2a26', margin: 0 }}>Deploy Escrow</h2>
                            <p style={{ fontSize: '12px', color: '#a9927d', margin: '4px 0 0' }}>{project?.name || 'Project'}</p>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a9927d' }} aria-label="Close escrow modal">
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ padding: '24px' }}>
                        <div style={{ textAlign: 'center', padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid rgba(169, 146, 125, 0.15)' }}>
                            <AlertTriangle size={36} style={{ color: '#ea580c', marginBottom: '12px' }} />
                            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2d2a26', margin: '0 0 8px' }}>Escrow deployment is unavailable</h3>
                            <p style={{ fontSize: '13px', color: '#5e503f', margin: 0, lineHeight: 1.6 }}>
                                Wallet-based escrow deployment has been removed from the client. On-chain creation and approval actions are disabled in this build.
                            </p>
                            <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '999px', background: 'rgba(169, 146, 125, 0.08)', color: '#5e503f', fontSize: '12px' }}>
                                <Shield size={14} /> Read-only project view
                            </div>
                        </div>

                        <button onClick={onClose} style={{ marginTop: '20px', width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: '#a9927d', color: 'white', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                            Close
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default DeployEscrowModal;
