import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wallet, ArrowRight, CheckCircle2 } from 'lucide-react'

export function InstantPayoutSimulation() {
    const [complete, setComplete] = useState(false)

    useEffect(() => {
        const loop = async () => {
            while (true) {
                setComplete(false)
                await new Promise(r => setTimeout(r, 3000))
                setComplete(true)
                await new Promise(r => setTimeout(r, 2000))
            }
        }
        loop()
    }, [])

    return (
        <div style={{
            height: '100%',
            minHeight: '200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            position: 'relative'
        }}>

            {/* Flow Container */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>

                {/* Escrow Box */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(169, 146, 125, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #a9927d' }} />
                    </div>
                    <span style={{ fontSize: '12px', color: '#a9927d', fontWeight: '600' }}>Escrow</span>
                </div>

                {/* Path */}
                <div style={{ position: 'relative', width: '100px', height: '2px', background: 'rgba(169, 146, 125, 0.2)' }}>
                    {/* Moving Coin */}
                    {!complete && (
                        <motion.div
                            animate={{ x: [0, 100] }}
                            transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }}
                            style={{ position: 'absolute', top: '-10px', left: 0, width: '20px', height: '20px', borderRadius: '50%', background: '#a9927d', boxShadow: '0 2px 8px rgba(169, 146, 125, 0.4)' }}
                        />
                    )}
                </div>

                {/* Wallet Box */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: complete ? '#dcfce7' : 'rgba(169, 146, 125, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.3s' }}>
                        <Wallet color={complete ? '#16a34a' : '#2d2a26'} size={24} />
                    </div>
                    <span style={{ fontSize: '12px', color: '#2d2a26', fontWeight: '600' }}>Wallet</span>
                </div>

            </div>

            {/* Status */}
            <motion.div
                animate={{ opacity: complete ? 1 : 0, y: complete ? 0 : 10 }}
                style={{ color: '#16a34a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}
            >
                <CheckCircle2 size={16} /> Funds Received
            </motion.div>

        </div>
    )
}
