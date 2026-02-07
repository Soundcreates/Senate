import React, { useState, useEffect, useRef } from 'react'
import { motion, useInView, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import {
  Brain, Shield, Zap, BarChart3, Users, ArrowRight, ChevronDown,
  Github, Twitter, Lock, Sparkles, DollarSign, CheckCircle2, Star,
  Layers, Bot, Wallet, GanttChart, Scale, Menu, X, Disc, Terminal, Database, ShieldCheck, Play, Link
} from 'lucide-react'
import ArchitectureDiagram from '../components/ArchitectureDiagram'
// import VideoBackground, { getVideoByIndex } from '../components/VideoBackground'
import { Highlighter } from '../components/ui/highlighter'
import { GridPattern } from '../components/ui/GridPattern'
import { TeamMatchingSimulation } from '../components/simulations/TeamMatching'
import { InstantPayoutSimulation } from '../components/simulations/InstantPayout'
import { ProductDemoSimulation } from '../components/simulations/ProductDemoSimulation'

/* ─── Demo Modal ─── */
function DemoModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px'
    }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '900px',
          background: '#1a1a1a', borderRadius: '24px',
          overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ color: 'white', margin: 0, fontFamily: 'var(--font-serif)', fontSize: '20px' }}>Platform Demo</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}><X size={24} /></button>
        </div>
        <div style={{ aspectRatio: '16/9', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <ProductDemoSimulation />
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Architecture Section ─── */
function ArchitectureSection() {
  return (
    <Section id="architecture">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '56px', fontWeight: '500', color: '#2d2a26', letterSpacing: '-0.02em' }}>
          Built for <Highlighter color="rgba(169, 146, 125, 0.4)"><span style={{ color: '#a9927d' }}>Trustless Scales.</span></Highlighter>
        </h2>
        <p style={{ fontSize: '18px', color: 'rgba(45, 42, 38, 0.7)', maxWidth: '600px', margin: '24px auto 0' }}>
          A unified architecture combining AI-driven matching, verifiable productivity metrics, and blockchain-based escrow.
        </p>
      </motion.div>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <ArchitectureDiagram />
      </div>
    </Section>
  );
}

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
        background: '#fbf7ef'
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
          color: '#2d2a26',
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
              color: 'rgba(45, 42, 38, 0.7)',
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
        boxShadow: scrolled ? '0 4px 20px rgba(0,0,0,0.08)' : 'none',
        borderRadius: '9999px',
        background: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.7)',
        border: scrolled ? '1px solid rgba(169, 146, 125, 0.2)' : '1px solid rgba(169, 146, 125, 0.1)',
        backdropFilter: 'blur(12px)'
      }}>
        {/* Logo */}
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <img src="/logo.png" alt="Senate" style={{ height: '24px', width: 'auto' }} />
          <span style={{ fontFamily: "'Jost', sans-serif", fontSize: '18px', fontWeight: '600', color: '#2d2a26' }}>Senate</span>
        </a>

        {/* Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }} className="desktop-nav">
          {navLinks.map((l) => (
            <a key={l.label} href={l.href} style={{
              fontSize: '14px',
              fontWeight: '500',
              color: 'rgba(45, 42, 38, 0.7)',
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}
              onMouseEnter={(e) => e.target.style.color = '#2d2a26'}
              onMouseLeave={(e) => e.target.style.color = 'rgba(45, 42, 38, 0.7)'}
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Action */}
        <button style={{
          background: '#a9927d',
          color: '#fbf7ef',
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
        <button className="mobile-menu-btn" style={{ display: 'none', background: 'none', border: 'none', color: '#2d2a26' }}>
          <Menu size={20} />
        </button>
      </div>
    </nav>
  );
}

// ─── HERO (ORIGIN STYLE: CINEMATIC CENTERED) ───
function Hero({ onPlayDemo }) {
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i = 0) => ({
      opacity: 1, y: 0,
      transition: { duration: 0.8, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
    }),
  }

  return (
    <section style={{ position: 'relative', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', overflow: 'hidden', background: '#fbf7ef' }}>
      {/* Cinematic Video Background - REMOVED */}
      {/* <VideoBackground overlayOpacity={0.65} /> */}

      {/* Origin Style Gradient Overlay at Bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40vh',
        background: 'linear-gradient(to top, #fbf7ef, transparent)',
        zIndex: 5
      }} />

      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: '900px' }}>


        <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={1} style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'var(--font-hero)',
          lineHeight: '1.1',
          fontWeight: '500',
          color: '#2d2a26',
          marginBottom: '24px',
          letterSpacing: '-0.03em'
        }}>
          Fair pay for <Highlighter color="rgba(169, 146, 125, 0.4)">actual work.</Highlighter>
        </motion.h1>

        <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={2} style={{
          fontSize: '20px',
          lineHeight: '1.6',
          color: 'rgba(45, 42, 38, 0.8)',
          maxWidth: '600px',
          margin: '0 auto 48px',
          fontWeight: '300'
        }}>
          Senate replaces opaque timesheets with AI-verified productivity scoring and instant on-chain payouts.
        </motion.p>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          <button style={{
            background: '#a9927d',
            color: '#fbf7ef',
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
            border: '1px solid rgba(45, 42, 38, 0.1)',
            background: 'rgba(45, 42, 38, 0.05)',
            transition: 'all 0.2s ease'
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(45, 42, 38, 0.3)'; e.currentTarget.style.background = 'rgba(45, 42, 38, 0.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(45, 42, 38, 0.1)'; e.currentTarget.style.background = 'rgba(45, 42, 38, 0.05)' }}
          >
            <Sparkles size={16} color="#a9927d" />
            <span style={{ fontSize: '14px', color: 'rgba(45, 42, 38, 0.5)', flex: 1 }}>"Find me a React dev for $5k..."</span>

            <button
              onClick={(e) => { e.stopPropagation(); onPlayDemo(); }}
              style={{
                background: 'white',
                border: '1px solid rgba(169,146,125,0.3)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              <Play size={12} fill="#a9927d" color="#a9927d" style={{ marginLeft: '1px' }} />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ─── FEATURES (ORIGIN STYLE: BENTO GRID) ───
function Features() {
  return (
    <Section id="features" style={{ padding: 'var(--spacing-section-lg) 24px', position: 'relative', overflow: 'hidden' }}>
      <GridPattern
        width={50}
        height={50}
        x={-1}
        y={-1}
        className="absolute inset-0 h-full w-full fill-white/[0.02] stroke-white/[0.05] [mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)]"
      />
      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '56px', fontWeight: '500', color: '#2d2a26', letterSpacing: '-0.02em' }}>
            Everything you need. <br />
            <Highlighter color="rgba(169, 146, 125, 0.6)"><span style={{ color: 'rgba(45, 42, 38, 0.5)' }}>Nothing you don't.</span></Highlighter>
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
              background: '#ffffff', boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
              borderRadius: '32px',
              padding: '40px',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(169, 146, 125, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ position: 'relative', zIndex: 10 }}>
              <Brain style={{ width: '32px', height: '32px', color: '#a9927d', marginBottom: '24px' }} />
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', marginBottom: '16px', color: '#2d2a26' }}>AI Team Matching</h3>
              <p style={{ fontSize: '18px', color: 'rgba(45, 42, 38, 0.7)', maxWidth: '400px' }}>Semantic search across thousands of profiles. Get optimal team compositions in seconds.</p>
            </div>
            {/* Simulation */}
            <div style={{ marginTop: '24px', height: '300px' }}>
              <TeamMatchingSimulation />
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
              background: '#ffffff', boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
              borderRadius: '32px',
              padding: '40px',
              border: '1px solid rgba(169, 146, 125, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <Zap style={{ width: '32px', height: '32px', color: '#a9927d', marginBottom: '24px' }} />
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', marginBottom: '16px', color: '#2d2a26' }}>Instant Payouts</h3>
              <p style={{ fontSize: '18px', color: 'rgba(45, 42, 38, 0.7)' }}>Milestone approved? Capital is in your wallet instantly.</p>
            </div>

            <div style={{ marginTop: '24px', height: '180px' }}>
              <InstantPayoutSimulation />
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
              background: '#ffffff', boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
              borderRadius: '32px',
              padding: '40px',
              border: '1px solid rgba(169, 146, 125, 0.2)',
              minHeight: '400px'
            }}
          >
            <BarChart3 style={{ width: '32px', height: '32px', color: '#a9927d', marginBottom: '24px' }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', marginBottom: '16px', color: '#2d2a26' }}>Real-Time Scoring</h3>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {['GitHub Commits', 'WakaTime Hours', 'Code Reviews', 'Jira Tickets'].map((item) => (
                <li key={item} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(45, 42, 38, 0.8)' }}>
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
              background: '#ffffff', boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
              borderRadius: '32px',
              padding: '40px',
              border: '1px solid rgba(169, 146, 125, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ position: 'relative', zIndex: 10 }}>
              <Lock style={{ width: '32px', height: '32px', color: '#a9927d', marginBottom: '24px' }} />
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', marginBottom: '16px', color: '#2d2a26' }}>Trustless Escrow</h3>
              <p style={{ fontSize: '18px', color: 'rgba(45, 42, 38, 0.8)', maxWidth: '450px' }}>Funds are locked in audited smart contracts. Released only when the code ships and passes review.</p>
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
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end']
  })

  // Transform vertical scroll to horizontal movement
  // Move from 0% to -75% (showing 4 items, we need to move 3 widths)
  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-75%'])

  const steps = [
    { step: '01', title: 'Create Project', desc: 'Describe your requirements. AI matches you with the perfect team.' },
    { step: '02', title: 'Fund Escrow', desc: 'Deposit USDC into the smart contract. Funds are safe.' },
    { step: '03', title: 'Track Work', desc: 'Real-time productivity scoring verifies progress.' },
    { step: '04', title: 'Instant Payout', desc: 'Disputes resolved, funds released automatically.' },
  ]

  return (
    <div ref={containerRef} id="how-it-works" style={{ height: '300vh', position: 'relative' }}>
      <div style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        background: '#fbf7ef'
      }}>

        {/* Horizontal Moving Track */}
        <motion.div style={{ x, display: 'flex', gap: '40px', paddingLeft: '10vw' }}>

          {/* Intro Card */}
          <div style={{ minWidth: '40vw', paddingRight: '60px' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '64px', fontWeight: '500', color: '#2d2a26', lineHeight: '1.1' }}>
              How Senate <br />
              <Highlighter color="rgba(169, 146, 125, 0.6)"><span style={{ color: 'rgba(45, 42, 38, 0.5)' }}>Works</span></Highlighter>
            </h2>
            <p style={{ marginTop: '24px', fontSize: '20px', color: 'rgba(45, 42, 38, 0.7)', maxWidth: '400px' }}>
              A seamless flow from proposal to payout. Scroll to explore the protocol.
            </p>
          </div>

          {/* Steps */}
          {steps.map((s, i) => (
            <div key={s.step} style={{
              minWidth: '600px',
              height: '400px',
              background: '#ffffff',
              boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
              borderRadius: '32px',
              padding: '48px',
              border: '1px solid rgba(169, 146, 125, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative'
            }}>
              <div style={{ fontSize: '120px', fontWeight: '700', color: 'rgba(169, 146, 125, 0.1)', position: 'absolute', top: '20px', right: '40px', lineHeight: 1 }}>
                {s.step}
              </div>

              <div>
                <div style={{ display: 'inline-block', padding: '6px 12px', borderRadius: '99px', background: 'rgba(169, 146, 125, 0.2)', color: '#a9927d', fontSize: '14px', fontWeight: 'bold', marginBottom: '24px' }}>
                  Step {s.step}
                </div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '40px', color: '#2d2a26', marginBottom: '16px' }}>{s.title}</h3>
                <p style={{ fontSize: '20px', color: 'rgba(45, 42, 38, 0.7)', lineHeight: '1.6' }}>{s.desc}</p>
              </div>

              {/* Connecting Line Visual */}
              {i < steps.length - 1 && (
                <div style={{ position: 'absolute', right: '-40px', top: '50%', width: '40px', height: '2px', background: 'rgba(94, 80, 63, 0.3)' }} />
              )}
            </div>
          ))}

          {/* End Spacer */}
          <div style={{ minWidth: '10vw' }} />
        </motion.div>

      </div>
    </div>
  )
}

// ─── COMPARISON ───
function Comparison() {
  return (
    <Section id="comparison">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '64px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '56px', fontWeight: '500', color: '#2d2a26', letterSpacing: '-0.02em' }}>See how Senate <Highlighter color="rgba(169, 146, 125, 0.6)"><span style={{ color: 'rgba(45, 42, 38, 0.5)' }}>stacks up</span></Highlighter></h2>
        <p style={{ fontSize: '22px', color: 'rgba(45, 42, 38, 0.6)', maxWidth: '680px', margin: '16px auto 0' }}>Compare Senate against traditional platforms across the metrics that matter most.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(94, 80, 63, 0.3)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(94, 80, 63, 0.2)', background: 'rgba(169, 146, 125, 0.1)' }}>
                <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#5e503f' }}>Feature</th>
                <th style={{ padding: '20px 24px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#2d2a26' }}>Senate</th>
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
                <tr key={row.feature} style={{ borderBottom: '1px solid rgba(94, 80, 63, 0.1)', background: i % 2 === 0 ? 'rgba(169, 146, 125, 0.05)' : 'transparent' }}>
                  <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '500', color: '#2d2a26' }}>{row.feature}</td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '28px', background: row.highlight ? 'rgba(169, 146, 125, 0.2)' : 'transparent', fontSize: '14px', fontWeight: '600', color: row.highlight ? '#a9927d' : '#2d2a26' }}>{row.senate}</span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: '14px', color: 'rgba(45, 42, 38, 0.5)' }}>{row.upwork}</td>
                  <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: '14px', color: 'rgba(45, 42, 38, 0.5)' }}>{row.gitcoin}</td>
                  <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: '14px', color: 'rgba(45, 42, 38, 0.5)' }}>{row.escrow}</td>
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
  const [demoOpen, setDemoOpen] = useState(false);
  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: (i = 0) => ({
      opacity: 1, y: 0,
      transition: { duration: 0.7, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
    }),
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fbf7ef', color: '#2d2a26', fontFamily: "'Inter', -apple-system, sans-serif" }}>
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
      <Hero onPlayDemo={() => setDemoOpen(true)} />

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
              <p style={{ fontSize: '48px', fontWeight: '600', color: '#2d2a26' }}>
                <AnimatedCounter target={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
              </p>
              <p style={{ marginTop: '8px', fontSize: '14px', color: '#5e503f', fontWeight: '500' }}>{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── FEATURES ── */}
      <Features />
      <ArchitectureSection />

      {/* ── HOW IT WORKS ── */}
      <HowItWorks />

      <Comparison />

      {/* ── TECH STACK ── */}
      <Section style={{ background: 'rgba(169, 146, 125, 0.05)', borderTop: '1px solid rgba(169, 146, 125, 0.2)', borderBottom: '1px solid rgba(169, 146, 125, 0.2)' }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '80px' }}>
          <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '20px', border: '1px solid rgba(169, 146, 125, 0.2)', background: 'rgba(169, 146, 125, 0.1)', fontSize: '13px', fontWeight: '500', color: '#a9927d', marginBottom: '16px' }}>Built With</span>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '56px', fontWeight: '500', color: '#2d2a26', letterSpacing: '-0.02em' }}>Production-grade <Highlighter color="rgba(169, 146, 125, 0.6)"><span style={{ color: 'rgba(45, 42, 38, 0.6)' }}>tech stack</span></Highlighter></h2>
        </motion.div>

        {/* Marquee Container */}
        <div style={{
          display: 'flex',
          overflow: 'hidden',
          maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          padding: '20px 0'
        }}>
          <motion.div
            animate={{ x: "-50%" }}
            transition={{ repeat: Infinity, ease: "linear", duration: 30 }}
            style={{ display: 'flex', gap: '80px', padding: '0 40px', minWidth: 'max-content' }}
          >
            {[...Array(2)].map((_, i) => (
              <React.Fragment key={i}>
                {[
                  { name: 'Sepolia', icon: <Link size={32} /> },
                  { name: 'React', icon: <Brain size={32} /> },
                  { name: 'Node.js', icon: <Terminal size={32} /> },
                  { name: 'Chroma', icon: <Database size={32} /> },
                  { name: 'WakaTime', icon: <GanttChart size={32} /> },
                  { name: 'Tailwind', icon: <Layers size={32} /> },
                  { name: 'OpenAI', icon: <Bot size={32} /> },
                  { name: 'Kleros', icon: <ShieldCheck size={32} /> }
                ].map((tech, idx) => (
                  <div key={`${i}-${idx}`} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    fontSize: '28px',
                    fontWeight: '600',
                    color: '#a9927d',
                    opacity: 0.9,
                    whiteSpace: 'nowrap'
                  }}>
                    {tech.icon}
                    <span style={{ color: '#2d2a26' }}>{tech.name}</span>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </motion.div>
        </div>
      </Section>

      <AnimatePresence>
        {demoOpen && <DemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}