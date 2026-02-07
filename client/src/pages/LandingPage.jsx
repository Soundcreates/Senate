import React, { useState, useEffect, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  Brain, Shield, Zap, BarChart3, Users, ArrowRight, ChevronDown,
  Github, Twitter, Lock, Sparkles, DollarSign, CheckCircle2, Star,
  Layers, Bot, Wallet, GanttChart, Scale, Menu, X, Disc
} from 'lucide-react'
import VideoBackground, { getVideoByIndex } from '../components/VideoBackground'

/* ════════════════════════════════════════════════════════════════════════════
   MINIMAL EARTH TONE LANDING PAGE
   Palette: Black, Jet Black, White Smoke, Dusty Taupe, Stone Brown
   ════════════════════════════════════════════════════════════════════════════ */

/* ─── Animated Counter ─── */
function AnimatedCounter({ target, suffix = '', prefix = '', duration = 2000 }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  useEffect(() => {
    if (!inView) return
    let start = 0
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [inView, target, duration])

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>
}

/* ─── Section Wrapper ─── */
function Section({ children, className = '', id }) {
  return (
    <section
      id={id}
      className={className}
      style={{
        position: 'relative',
        padding: '160px 24px',
        background: '#0a0908'
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>{children}</div>
    </section>
  )
}

/* ─── FAQ Item ─── */
function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '2px solid rgba(94, 80, 63, 0.3)' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 0',
          background: 'transparent',
          border: 'none',
          textAlign: 'left',
          fontSize: '24px',
          fontWeight: '600',
          color: '#f2f4f3',
          cursor: 'pointer',
          transition: 'opacity 0.3s'
        }}
      >
        {question}
        <ChevronDown
          style={{
            width: '20px',
            height: '20px',
            color: '#5e503f',
            transition: 'transform 0.3s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
          >
            <p style={{
              paddingBottom: '24px',
              fontSize: '18px',
              lineHeight: '1.5',
              color: 'rgba(242, 244, 243, 0.7)',
              maxWidth: '83%'
            }}>
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}



/* ════════════════════════════════════════════════════════════════════════════
   MAIN LANDING PAGE
   ════════════════════════════════════════════════════════════════════════════ */

/* ─── Navigation ─── */
// ─── NAVIGATON (ORIGIN STYLE: FLOATING PILL) ───
function Navigation() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Comparison', href: '#comparison' },
    { label: 'FAQ', href: '#faq' },
  ]

  return (
    <nav style={{
      position: 'fixed',
      top: '24px',
      left: 0,
      right: 0,
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'center',
      pointerEvents: 'none' /* Passthrough for sides */
    }}>
      <div className="pill-nav" style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '40px',
        padding: '8px 24px',
        maxWidth: 'fit-content',
        transition: 'all 0.3s ease',
        boxShadow: scrolled ? '0 10px 40px rgba(0,0,0,0.4)' : 'none',
        borderRadius: '9999px',
        background: scrolled ? 'rgba(10, 9, 8, 0.9)' : 'rgba(10, 9, 8, 0.7)',
        border: scrolled ? '1px solid rgba(94, 80, 63, 0.3)' : '1px solid rgba(94, 80, 63, 0.1)',
        backdropFilter: 'blur(12px)'
      }}>
        {/* Logo */}
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <img src="/logo.png" alt="Senate" style={{ height: '24px', width: 'auto' }} />
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: '600', color: '#f2f4f3' }}>Senate</span>
        </a>

        {/* Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }} className="desktop-nav">
          {navLinks.map((l) => (
            <a key={l.label} href={l.href} style={{
              fontSize: '14px',
              fontWeight: '500',
              color: 'rgba(242, 244, 243, 0.7)',
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}
              onMouseEnter={(e) => e.target.style.color = '#f2f4f3'}
              onMouseLeave={(e) => e.target.style.color = 'rgba(242, 244, 243, 0.7)'}
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Action */}
        <button style={{
          background: '#a9927d',
          color: '#0a0908',
          border: 'none',
          padding: '8px 20px',
          borderRadius: '9999px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'transform 0.2s ease, background 0.2s'
        }}
          onMouseEnter={(e) => { e.target.style.transform = 'scale(1.05)'; e.target.style.background = '#bda692' }}
          onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; e.target.style.background = '#a9927d' }}
        >
          Launch App
        </button>

        {/* Mobile Menu Toggle (Hidden on desktop) */}
        <button className="mobile-menu-btn" style={{ display: 'none', background: 'none', border: 'none', color: '#f2f4f3' }}>
          <Menu size={20} />
        </button>
      </div>
    </nav>
  );
}

// ─── HERO (ORIGIN STYLE: CINEMATIC CENTERED) ───
function Hero() {
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i = 0) => ({
      opacity: 1, y: 0,
      transition: { duration: 0.8, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
    }),
  }

  return (
    <section style={{ position: 'relative', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', overflow: 'hidden' }}>
      {/* Cinematic Video Background - Darker Overlay */}
      <VideoBackground overlayOpacity={0.65} />

      {/* Origin Style Gradient Overlay at Bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40vh',
        background: 'linear-gradient(to top, #0a0908, transparent)',
        zIndex: 5
      }} />

      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: '900px' }}>
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 16px', borderRadius: '99px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.15)', fontSize: '13px', fontWeight: '500', color: '#f2f4f3', marginBottom: '40px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a9927d' }}></span>
            AI-Native Project Management
          </div>
        </motion.div>

        <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={1} style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'var(--font-hero)',
          lineHeight: '1.1',
          fontWeight: '500',
          color: '#f2f4f3',
          marginBottom: '24px',
          letterSpacing: '-0.03em'
        }}>
          Fair pay for <i style={{ fontFamily: 'var(--font-serif)', color: '#a9927d' }}>actual work.</i>
        </motion.h1>

        <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={2} style={{
          fontSize: '20px',
          lineHeight: '1.6',
          color: 'rgba(242, 244, 243, 0.8)',
          maxWidth: '600px',
          margin: '0 auto 48px',
          fontWeight: '300'
        }}>
          Senate replaces opaque timesheets with AI-verified productivity scoring and instant on-chain payouts.
        </motion.p>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          <button style={{
            background: '#a9927d',
            color: '#0a0908',
            border: 'none',
            padding: '16px 40px',
            borderRadius: '9999px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
            onMouseEnter={(e) => { e.target.style.transform = 'scale(1.05)'; e.target.style.boxShadow = '0 0 30px rgba(169, 146, 125, 0.3)' }}
            onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = 'none' }}
          >
            Start a Project
          </button>

          {/* Interactive "Input Simulation" Element */}
          <div className="input-simulation" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 20px',
            width: '100%',
            maxWidth: '420px',
            cursor: 'text',
            borderRadius: '9999px',
            border: '1px solid rgba(242, 244, 243, 0.1)',
            background: 'rgba(242, 244, 243, 0.05)',
            transition: 'all 0.2s ease'
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(242, 244, 243, 0.3)'; e.currentTarget.style.background = 'rgba(242, 244, 243, 0.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(242, 244, 243, 0.1)'; e.currentTarget.style.background = 'rgba(242, 244, 243, 0.05)' }}
          >
            <Sparkles size={16} color="#a9927d" />
            <span style={{ fontSize: '14px', color: 'rgba(242, 244, 243, 0.5)' }}>"Find me a React dev for $5k..."</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ─── FEATURES (ORIGIN STYLE: BENTO GRID) ───
function Features() {
  return (
    <Section id="features" style={{ padding: 'var(--spacing-section-lg) 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '56px', fontWeight: '500', color: '#f2f4f3', letterSpacing: '-0.02em' }}>
            Everything you need. <br />
            <span style={{ color: 'rgba(242, 244, 243, 0.5)' }}>Nothing you don't.</span>
          </h2>
        </motion.div>

        {/* Bento Grid Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px', gridAutoRows: 'minmax(300px, auto)' }}>

          {/* Large Card 1 - Team Matching */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{
              gridColumn: 'span 7',
              background: '#22333b',
              borderRadius: '32px',
              padding: '40px',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(94, 80, 63, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ position: 'relative', zIndex: 10 }}>
              <Brain style={{ width: '32px', height: '32px', color: '#a9927d', marginBottom: '24px' }} />
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', marginBottom: '16px', color: '#f2f4f3' }}>AI Team Matching</h3>
              <p style={{ fontSize: '18px', color: 'rgba(242, 244, 243, 0.7)', maxWidth: '400px' }}>Semantic search across thousands of profiles. Get optimal team compositions in seconds.</p>
            </div>
            {/* Floating UI Mockup */}
            <div style={{
              marginTop: '40px',
              background: 'rgba(10, 9, 8, 0.6)',
              borderRadius: '20px',
              padding: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)',
              transform: 'rotate(-2deg)',
              width: '80%',
              alignSelf: 'flex-end',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#a9927d' }} />
                <div>
                  <div style={{ width: '120px', height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', marginBottom: '6px' }} />
                  <div style={{ width: '80px', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(169, 146, 125, 0.2)', fontSize: '10px', color: '#a9927d' }}>React</div>
                <div style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(169, 146, 125, 0.2)', fontSize: '10px', color: '#a9927d' }}>Node.js</div>
              </div>
            </div>
          </motion.div>

          {/* Small Card 2 - Instant Payouts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            style={{
              gridColumn: 'span 5',
              background: '#22333b',
              borderRadius: '32px',
              padding: '40px',
              border: '1px solid rgba(94, 80, 63, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundImage: 'linear-gradient(135deg, rgba(34, 51, 59, 1) 0%, rgba(10, 9, 8, 1) 100%)'
            }}
          >
            <div>
              <Zap style={{ width: '32px', height: '32px', color: '#a9927d', marginBottom: '24px' }} />
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', marginBottom: '16px', color: '#f2f4f3' }}>Instant Payouts</h3>
              <p style={{ fontSize: '18px', color: 'rgba(242, 244, 243, 0.7)' }}>Milestone approved? Capital is in your wallet instantly.</p>
            </div>

            <div style={{ marginTop: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: '700', color: '#f2f4f3' }}>$5,000<span style={{ fontSize: '24px', color: 'rgba(255,255,255,0.5)' }}>USDC</span></div>
            </div>
          </motion.div>

          {/* Medium Card 3 - Productivity Scoring */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            style={{
              gridColumn: 'span 5',
              background: '#22333b',
              borderRadius: '32px',
              padding: '40px',
              border: '1px solid rgba(94, 80, 63, 0.3)',
              minHeight: '400px'
            }}
          >
            <BarChart3 style={{ width: '32px', height: '32px', color: '#a9927d', marginBottom: '24px' }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', marginBottom: '16px', color: '#f2f4f3' }}>Real-Time Scoring</h3>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {['GitHub Commits', 'WakaTime Hours', 'Code Reviews', 'Jira Tickets'].map((item) => (
                <li key={item} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242, 244, 243, 0.8)' }}>
                  <span>{item}</span>
                  <span style={{ color: '#a9927d' }}>Synced</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Large Card 4 - Escrow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            style={{
              gridColumn: 'span 7',
              background: '#22333b',
              borderRadius: '32px',
              padding: '40px',
              border: '1px solid rgba(94, 80, 63, 0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <VideoBackground src={getVideoByIndex(2)} overlayOpacity={0.8} />
            <div style={{ position: 'relative', zIndex: 10 }}>
              <Lock style={{ width: '32px', height: '32px', color: '#a9927d', marginBottom: '24px' }} />
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', marginBottom: '16px', color: '#f2f4f3' }}>Trustless Escrow</h3>
              <p style={{ fontSize: '18px', color: 'rgba(242, 244, 243, 0.8)', maxWidth: '450px' }}>Funds are locked in audited smart contracts. Released only when the code ships and passes review.</p>
            </div>
          </motion.div>

        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
          div[style*="grid-column: span"] { grid-column: span 12 !important; }
        }
      `}</style>
    </Section>
  )
}

function HowItWorks() {
  return (
    <Section id="how-it-works" style={{ padding: 'var(--spacing-section-lg) 24px' }}>
      {/* ... keeping simplified list for brevity, but matching typography ... */}
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '48px', marginBottom: '64px', color: '#f2f4f3' }}>How It Works</h2>
        {/* ... (Existing steps content but updated styling would go here - abbreviated for this refactor step to focus on major layout changes) ... */}
        {/* Reusing existing steps data temporarily for structure stability */}
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '48px' }}>
          {[
            { step: '01', title: 'Create Project', desc: 'Describe your requirements. AI matches you with the perfect team.' },
            { step: '02', title: 'Fund Escrow', desc: 'Deposit USDC into the smart contract. Funds are safe.' },
            { step: '03', title: 'Track Work', desc: 'Real-time productivity scoring verifies progress.' },
            { step: '04', title: 'Instant Payout', desc: 'Disputes resolved, funds released automatically.' },
          ].map((s) => (
            <div key={s.step} style={{ display: 'flex', gap: '24px', alignItems: 'baseline' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#a9927d' }}>{s.step}</span>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: '500', marginBottom: '8px', color: '#f2f4f3' }}>{s.title}</h3>
                <p style={{ color: 'rgba(242, 244, 243, 0.6)' }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

// ─── COMPARISON ───
function Comparison() {
  return (
    <Section id="comparison">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '64px' }}>
        <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '20px', border: '1px solid rgba(94, 80, 63, 0.3)', background: 'rgba(34, 51, 59, 0.6)', fontSize: '13px', fontWeight: '500', color: '#a9927d', marginBottom: '16px' }}>The Proof</span>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '56px', fontWeight: '500', color: '#f2f4f3', letterSpacing: '-0.02em' }}>See how Senate <span style={{ color: 'rgba(242, 244, 243, 0.6)' }}>stacks up</span></h2>
        <p style={{ fontSize: '22px', color: 'rgba(242, 244, 243, 0.6)', maxWidth: '680px', margin: '16px auto 0' }}>Compare Senate against traditional platforms across the metrics that matter most.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(94, 80, 63, 0.3)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(94, 80, 63, 0.2)', background: '#22333b' }}>
                <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#5e503f' }}>Feature</th>
                <th style={{ padding: '20px 24px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#f2f4f3' }}>Senate</th>
                <th style={{ padding: '20px 24px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#5e503f' }}>Upwork</th>
                <th style={{ padding: '20px 24px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#5e503f' }}>Gitcoin</th>
                <th style={{ padding: '20px 24px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#5e503f' }}>Escrow.com</th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: 'Platform Fee', senate: '2.5%', upwork: '20%', gitcoin: '5%', escrow: '3-5%', highlight: true },
                { feature: 'Payment Speed', senate: 'Instant', upwork: '30-60 days', gitcoin: '1-7 days', escrow: '30 days', highlight: true },
                { feature: 'AI Team Matching', senate: '✓', upwork: '✗', gitcoin: '✗', escrow: '✗', highlight: true },
                { feature: 'Productivity Scoring', senate: '✓', upwork: '✗', gitcoin: '✗', escrow: '✗', highlight: true },
                { feature: 'On-Chain Transparency', senate: '✓', upwork: '✗', gitcoin: '✓', escrow: '✗', highlight: false },
                { feature: 'Dispute Resolution', senate: 'Multi-path', upwork: 'Manual', gitcoin: 'None', escrow: 'Manual', highlight: false },
                { feature: 'Merit-Based Pay', senate: 'Algorithmic', upwork: 'Flat rate', gitcoin: 'Flat rate', escrow: 'Flat rate', highlight: true },
              ].map((row, i) => (
                <tr key={row.feature} style={{ borderBottom: '1px solid rgba(94, 80, 63, 0.1)', background: i % 2 === 0 ? 'rgba(34, 51, 59, 0.4)' : 'transparent' }}>
                  <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '500', color: '#f2f4f3' }}>{row.feature}</td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '28px', background: row.highlight ? 'rgba(169, 146, 125, 0.2)' : 'transparent', fontSize: '14px', fontWeight: '600', color: row.highlight ? '#a9927d' : '#f2f4f3' }}>{row.senate}</span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: '14px', color: 'rgba(242, 244, 243, 0.5)' }}>{row.upwork}</td>
                  <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: '14px', color: 'rgba(242, 244, 243, 0.5)' }}>{row.gitcoin}</td>
                  <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: '14px', color: 'rgba(242, 244, 243, 0.5)' }}>{row.escrow}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </Section>
  )
}

export default function LandingPage() {
  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: (i = 0) => ({
      opacity: 1, y: 0,
      transition: { duration: 0.7, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
    }),
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0908', color: '#f2f4f3', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        :root {
          --font-serif: 'Playfair Display', serif;
          --font-hero: 80px;
          --spacing-section-lg: 160px;
        }
        @media (max-width: 1068px) {
          :root {
            --font-hero: 64px;
          }
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
          h1 { font-size: 56px !important; }
          h2 { font-size: 40px !important; }
        }
        @media (max-width: 734px) {
          :root {
            --font-hero: 48px;
            --spacing-section-lg: 100px;
          }
          h1 { font-size: 40px !important; }
          h2 { font-size: 32px !important; }
          section { padding: 80px 16px !important; }
        }
      `}</style>

      <Navigation />
      <Hero />

      {/* ── STATS ── */}
      <Section style={{ borderTop: '1px solid rgba(94, 80, 63, 0.3)', borderBottom: '1px solid rgba(94, 80, 63, 0.3)', background: 'rgba(34, 51, 59, 0.2)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '32px', textAlign: 'center' }}>
          {[
            { value: 1.57, suffix: 'T', prefix: '$', label: 'Freelance Economy' },
            { value: 68, suffix: '%', prefix: '', label: 'Freelancers Face Disputes' },
            { value: 2.5, suffix: '%', prefix: '', label: 'Platform Fee (vs 20%)' },
            { value: 3, suffix: 's', prefix: '<', label: 'Withdrawal Speed' },
          ].map((stat) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <p style={{ fontSize: '48px', fontWeight: '600', color: '#f2f4f3' }}>
                <AnimatedCounter target={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
              </p>
              <p style={{ marginTop: '8px', fontSize: '14px', color: '#5e503f', fontWeight: '500' }}>{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── FEATURES ── */}
      <Features />

      {/* ── HOW IT WORKS ── */}
      <HowItWorks />

      <Comparison />

      {/* ── TECH STACK ── */}
      <Section style={{ background: 'rgba(34, 51, 59, 0.2)', borderTop: '1px solid rgba(94, 80, 63, 0.3)', borderBottom: '1px solid rgba(94, 80, 63, 0.3)' }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '80px' }}>
          <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '20px', border: '1px solid rgba(94, 80, 63, 0.3)', background: 'rgba(34, 51, 59, 0.6)', fontSize: '13px', fontWeight: '500', color: '#a9927d', marginBottom: '16px' }}>Built With</span>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '56px', fontWeight: '500', color: '#f2f4f3', letterSpacing: '-0.02em' }}>Production-grade <span style={{ color: 'rgba(242, 244, 243, 0.6)' }}>tech stack</span></h2>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
          {[
            { title: 'AI / RAG', icon: Bot, items: ['LangChain', 'OpenAI Embeddings', 'Pinecone', 'GPT-4 Reviews'] },
            { title: 'Blockchain', icon: Layers, items: ['Solidity 0.8', 'OpenZeppelin UUPS', 'Hardhat', 'Sepolia / Polygon'] },
            { title: 'Backend', icon: Github, items: ['Node.js', 'Express', 'PostgreSQL', 'Redis Cache'] },
            { title: 'Frontend', icon: Sparkles, items: ['React 19', 'Tailwind CSS', 'Framer Motion', 'wagmi / viem'] },
          ].map((tech, i) => (
            <motion.div
              key={tech.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              style={{ padding: '32px', borderRadius: '24px', border: '1px solid rgba(94, 80, 63, 0.2)', background: '#22333b' }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(169, 146, 125, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <tech.icon style={{ width: '20px', height: '20px', color: '#a9927d' }} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: '500', color: '#f2f4f3', marginBottom: '12px' }}>{tech.title}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {tech.items.map((item) => (
                  <li key={item} style={{ fontSize: '14px', color: 'rgba(242, 244, 243, 0.7)', marginBottom: '6px' }}>{item}</li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── FAQ ── */}
      <Section id="faq">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '56px', fontWeight: '500', color: '#f2f4f3', letterSpacing: '-0.02em' }}>Questions? <span style={{ color: 'rgba(242, 244, 243, 0.6)' }}>Answers.</span></h2>
        </motion.div>

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {[
            { question: 'How does Senate ensure fair payouts?', answer: 'Senate uses objective, on-chain productivity data — GitHub commits, code quality scores from GPT-4, and milestone completion — to algorithmically calculate each contributor\'s share.' },
            { question: 'What happens if there\'s a dispute?', answer: 'Contributors have a 3-day window to raise disputes. Disputes can be resolved via admin multi-sig review with on-chain evidence, or escalated to Kleros decentralized court.' },
            { question: 'How fast are payouts?', answer: 'Once a milestone is finalized and the dispute window closes, contributors can withdraw their USDC instantly. No more waiting 30-60 days for invoices to be processed.' },
            { question: 'What are the fees?', answer: 'Senate charges a flat 2.5% platform fee — compared to 20% on traditional platforms like Upwork. Additional modest fees apply for dispute resolution if needed.' },
            { question: 'How does AI team matching work?', answer: 'Our RAG-powered engine uses semantic search across developer profiles, past project data, and skill embeddings to recommend teams with the highest predicted success probability.' },
          ].map((faq, i) => (
            <FAQItem key={i} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </Section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(94, 80, 63, 0.3)', padding: '64px 24px', background: '#0a0908' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '40px' }}>
              <div style={{ maxWidth: '300px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <img src="/logo.png" alt="Senate" style={{ height: '32px', width: 'auto', opacity: 0.9 }} />
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: '600', color: '#f2f4f3' }}>Senate</span>
                </div>
                <p style={{ fontSize: '16px', lineHeight: '1.6', color: 'rgba(242, 244, 243, 0.6)' }}>
                  The first AI-native project management protocol. Fair work, fair pay, on-chain.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '64px', flexWrap: 'wrap' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#f2f4f3', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <a href="#" style={{ color: 'rgba(242, 244, 243, 0.6)', textDecoration: 'none', fontSize: '14px' }}>Features</a>
                    <a href="#" style={{ color: 'rgba(242, 244, 243, 0.6)', textDecoration: 'none', fontSize: '14px' }}>How it Works</a>
                    <a href="#" style={{ color: 'rgba(242, 244, 243, 0.6)', textDecoration: 'none', fontSize: '14px' }}>Pricing</a>
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#f2f4f3', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resources</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <a href="#" style={{ color: 'rgba(242, 244, 243, 0.6)', textDecoration: 'none', fontSize: '14px' }}>Documentation</a>
                    <a href="#" style={{ color: 'rgba(242, 244, 243, 0.6)', textDecoration: 'none', fontSize: '14px' }}>GitHub</a>
                    <a href="#" style={{ color: 'rgba(242, 244, 243, 0.6)', textDecoration: 'none', fontSize: '14px' }}>Whitepaper</a>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(94, 80, 63, 0.3)', width: '100%' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
              <p style={{ fontSize: '14px', color: '#5e503f', margin: 0 }}>© 2026 Senate Protocol. All rights reserved.</p>
              <div style={{ display: 'flex', gap: '24px' }}>
                <Twitter style={{ width: '20px', height: '20px', color: 'rgba(242, 244, 243, 0.6)', cursor: 'pointer' }} />
                <Github style={{ width: '20px', height: '20px', color: 'rgba(242, 244, 243, 0.6)', cursor: 'pointer' }} />
                <Disc style={{ width: '20px', height: '20px', color: 'rgba(242, 244, 243, 0.6)', cursor: 'pointer' }} />
              </div>
            </div>

          </div>
        </div>
      </footer>

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 1068px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
          .hero-visual { display: none !important; }
          h1 { font-size: 56px !important; }
          h2 { font-size: 40px !important; }
        }
        @media (max-width: 734px) {
          h1 { font-size: 40px !important; }
          h2 { font-size: 32px !important; }
          section { padding: 80px 16px !important; }
        }
      `}</style>
    </div>
  )
}