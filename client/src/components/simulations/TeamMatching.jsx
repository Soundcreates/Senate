import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, CheckCircle2, User, Code, Paintbrush, Terminal } from 'lucide-react'

export function TeamMatchingSimulation() {
    const [matches, setMatches] = useState([]) // Array of matched candidates

    useEffect(() => {
        const sequence = async () => {
            while (true) {
                setMatches([])
                await new Promise(r => setTimeout(r, 1000))

                // Match 1: Designer
                await new Promise(r => setTimeout(r, 1000))
                setMatches(prev => [...prev, { id: 1, role: 'Designer', icon: Paintbrush, x: 80, y: -40, delay: 0 }])

                // Match 2: Frontend
                await new Promise(r => setTimeout(r, 1500))
                setMatches(prev => [...prev, { id: 2, role: 'Frontend', icon: Code, x: -80, y: 40, delay: 0.2 }])

                // Match 3: Smart Contract
                await new Promise(r => setTimeout(r, 1500))
                setMatches(prev => [...prev, { id: 3, role: 'Contract', icon: Terminal, x: 90, y: 50, delay: 0.4 }])

                await new Promise(r => setTimeout(r, 4000))
            }
        }
        sequence()
    }, [])

    return (
        <div style={{
            height: '100%',
            minHeight: '280px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            background: 'transparent'
        }}>
            {/* Central Node (Project) */}
            <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#a9927d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    boxShadow: '0 4px 12px rgba(169, 146, 125, 0.3)'
                }}
            >
                <Users color="white" size={24} />
            </motion.div>

            {/* Searching Rings */}
            {matches.length < 3 && (
                <>
                    <motion.div
                        initial={{ opacity: 0.5, scale: 1 }}
                        animate={{ opacity: 0, scale: 3 }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        style={{ position: 'absolute', width: '60px', height: '60px', borderRadius: '50%', border: '1px solid #a9927d' }}
                    />
                </>
            )}

            {/* Candidates */}
            <AnimatePresence>
                {matches.map((m) => (
                    <React.Fragment key={m.id}>
                        {/* Connection Line */}
                        <svg style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}>
                            <motion.line
                                x1="50%" y1="50%" x2={`calc(50% + ${m.x}px)`} y2={`calc(50% + ${m.y}px)`}
                                stroke="#a9927d"
                                strokeWidth="2"
                                strokeDasharray="4 4"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                            />
                        </svg>

                        {/* Avatar Node */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0, x: m.x * 1.5, y: m.y * 1.5 }}
                            animate={{ opacity: 1, scale: 1, x: m.x, y: m.y }}
                            exit={{ opacity: 0, scale: 0 }}
                            style={{
                                position: 'absolute',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px',
                                zIndex: 5
                            }}
                        >
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fdfbf7', border: '2px solid #a9927d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <m.icon size={18} color="#2d2a26" />
                            </div>
                            <div style={{ background: '#a9927d', color: 'white', fontSize: '9px', padding: '2px 6px', borderRadius: '8px' }}>{m.role}</div>
                        </motion.div>
                    </React.Fragment>
                ))}
            </AnimatePresence>

            {/* Success Check */}
            <AnimatePresence>
                {matches.length === 3 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            color: '#16a34a'
                        }}
                    >
                        <CheckCircle2 size={24} />
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    )
}
