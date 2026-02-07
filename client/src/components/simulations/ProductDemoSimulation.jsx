import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Users, FileText, BrainCircuit, Wallet, Lock, CheckCircle2,
    ArrowRight, Code, Paintbrush, Terminal, Coins
} from 'lucide-react'

export function ProductDemoSimulation() {
    const [step, setStep] = useState(0)

    useEffect(() => {
        let mounted = true;
        const sequence = async () => {
            while (mounted) {
                setStep(0) // Reset
                await new Promise(r => setTimeout(r, 1000))
                if (!mounted) break;

                setStep(1) // Post Project
                await new Promise(r => setTimeout(r, 2000))
                if (!mounted) break;

                setStep(2) // AI Matching
                await new Promise(r => setTimeout(r, 2500))
                if (!mounted) break;

                setStep(3) // Escrow
                await new Promise(r => setTimeout(r, 2000))
                if (!mounted) break;

                setStep(4) // Payout
                await new Promise(r => setTimeout(r, 3000))
            }
        }
        sequence()
        return () => { mounted = false; }
    }, [])

    return (
        <div style={{
            width: '100%',
            height: '400px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            background: 'transparent',
            overflow: 'hidden'
        }}>
            {/* Progress Bar */}
            <div style={{ position: 'absolute', top: 20, display: 'flex', gap: '8px' }}>
                {[1, 2, 3, 4].map((s) => (
                    <div key={s} style={{
                        width: '40px', height: '4px', borderRadius: '2px',
                        background: step >= s ? '#a9927d' : 'rgba(255,255,255,0.1)',
                        transition: 'background 0.5s'
                    }} />
                ))}
            </div>

            {/* Stage Text */}
            <motion.h3
                key={step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                    position: 'absolute', bottom: 40,
                    color: 'white', fontFamily: 'var(--font-serif)',
                    fontSize: '24px', textAlign: 'center'
                }}
            >
                {step === 1 && "1. Client Posts Project"}
                {step === 2 && "2. AI Auto-Matches Talent"}
                {step === 3 && "3. Smart Contract Escrow"}
                {step === 4 && "4. Instant Payout on Completion"}
            </motion.h3>

            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        style={{ display: 'flex', gap: '40px', alignItems: 'center' }}
                    >
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                                <Users size={40} color="#2d2a26" />
                            </div>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Client</span>
                        </div>
                        <ArrowRight size={32} color="#a9927d" />
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            style={{ textAlign: 'center' }}
                        >
                            <div style={{ width: '60px', height: '80px', borderRadius: '8px', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                                <FileText size={32} color="white" />
                            </div>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Spec</span>
                        </motion.div>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'relative', width: '300px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        {/* Brain */}
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#a9927d', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
                        >
                            <BrainCircuit size={40} color="white" />
                        </motion.div>

                        {/* Matches */}
                        {[
                            { icon: Paintbrush, label: 'Designer', x: -100, y: -40, delay: 0.2 },
                            { icon: Code, label: 'Frontend', x: 0, y: 100, delay: 0.4 },
                            { icon: Terminal, label: 'Contract', x: 100, y: -40, delay: 0.6 }
                        ].map((role, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                                animate={{ opacity: 1, scale: 1, x: role.x, y: role.y }}
                                transition={{ delay: role.delay }}
                                style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                            >
                                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#262626', border: '2px solid #a9927d', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                                    <role.icon size={24} color="white" />
                                </div>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>{role.label}</span>
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ textAlign: 'center' }}
                    >
                        <div style={{ width: '100px', height: '100px', borderRadius: '24px', background: 'rgba(255,255,255,0.05)', border: '2px solid #a9927d', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                            <Lock size={48} color="#a9927d" />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <span style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(169,146,125,0.2)', color: '#a9927d', fontSize: '14px' }}>Funds Locked</span>
                            <span style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(169,146,125,0.2)', color: '#a9927d', fontSize: '14px' }}>Milestones Set</span>
                        </div>
                    </motion.div>
                )}

                {step === 4 && (
                    <motion.div
                        key="step4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ display: 'flex', gap: '40px', alignItems: 'center' }}
                    >
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '2px dashed #a9927d', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                                <Lock size={32} color="#a9927d" style={{ opacity: 0.5 }} />
                            </div>
                            <span style={{ color: 'rgba(255,255,255,0.4)' }}>Escrow</span>
                        </div>

                        <div style={{ position: 'relative', width: '100px', height: '4px', background: 'rgba(255,255,255,0.1)' }}>
                            <motion.div
                                animate={{ x: [0, 100], opacity: [0, 1, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                style={{ position: 'absolute', top: -12, left: 0 }}
                            >
                                <Coins size={28} color="#16a34a" />
                            </motion.div>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                                <Wallet size={40} color="#16a34a" />
                            </div>
                            <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Paid!</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
