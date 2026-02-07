import React, { useState, useEffect, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Shield,
  Zap,
  BarChart3,
  Users,
  ArrowRight,
  ChevronDown,
  Github,
  Twitter,
  Globe,
  Lock,
  Sparkles,
  DollarSign,
  CheckCircle2,
  Star,
  Code2,
  Layers,
  Bot,
  Wallet,
  GanttChart,
  Scale,
  Menu,
  X
} from 'lucide-react'

/* ─── animated counter ─── */
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

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  )
}

/* ─── floating orb background ─── */
function FloatingOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-violet-600/20 blur-[120px]" />
      <div className="absolute top-1/3 -left-60 h-[400px] w-[400px] rounded-full bg-blue-600/15 blur-[100px]" />
      <div className="absolute -bottom-40 right-1/4 h-[350px] w-[350px] rounded-full bg-emerald-500/10 blur-[100px]" />
    </div>
  )
}

/* ─── section wrapper ─── */
function Section({ children, className = '', id }) {
  return (
    <section id={id} className={`relative px-6 py-24 md:py-32 ${className}`}>
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  )
}

/* ─── FAQ item ─── */
function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/10">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-6 text-left text-lg font-medium text-white transition-colors hover:text-violet-300"
      >
        {question}
        <ChevronDown className={`h-5 w-5 shrink-0 text-violet-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-base leading-relaxed text-neutral-400">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── comparison bar ─── */
function ComparisonBar({ label, oldVal, newVal, oldLabel, newLabel }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const oldPct = 100
  const newPct = (newVal / oldVal) * 100

  return (
    <div ref={ref} className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-white">{label}</span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-xs text-neutral-500">{oldLabel}</span>
          <div className="h-8 flex-1 overflow-hidden rounded-lg bg-white/5">
            <motion.div
              className="flex h-full items-center rounded-lg bg-red-500/30 px-3"
              initial={{ width: 0 }}
              animate={inView ? { width: `${oldPct}%` } : { width: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            >
              <span className="text-xs font-semibold text-red-300">{oldVal}</span>
            </motion.div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-xs text-emerald-400">{newLabel}</span>
          <div className="h-8 flex-1 overflow-hidden rounded-lg bg-white/5">
            <motion.div
              className="flex h-full items-center rounded-lg bg-emerald-500/40 px-3"
              initial={{ width: 0 }}
              animate={inView ? { width: `${Math.max(newPct, 5)}%` } : { width: 0 }}
              transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            >
              <span className="text-xs font-semibold text-emerald-300">{newVal}</span>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   LANDING PAGE
   ══════════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handle)
    return () => window.removeEventListener('scroll', handle)
  }, [])

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Comparison', href: '#comparison' },
    { label: 'FAQ', href: '#faq' },
  ]

  /* ─── fade-up variant ─── */
  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: (i = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
    }),
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── NAVBAR ── */}
      <nav
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'border-b border-white/5 bg-[#09090b]/80 backdrop-blur-xl'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* logo */}
          <a href="#" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-600">
              <Scale className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Senate
            </span>
          </a>

          {/* desktop links */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((l) => (
              <a key={l.label} href={l.href} className="text-sm font-medium text-neutral-400 transition-colors hover:text-white">
                {l.label}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden items-center gap-3 md:flex">
            <a href="#" className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:text-white">
              Docs
            </a>
            <a
              href="#"
              className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40"
            >
              Launch App
            </a>
          </div>

          {/* mobile menu button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden">
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-white/5 bg-[#09090b]/95 backdrop-blur-xl md:hidden"
            >
              <div className="flex flex-col gap-4 px-6 py-6">
                {navLinks.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-medium text-neutral-300 hover:text-white"
                  >
                    {l.label}
                  </a>
                ))}
                <a
                  href="#"
                  className="mt-2 inline-block rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Launch App
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════
          HERO
         ══════════════════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-screen items-center overflow-hidden px-6 pt-24">
        <FloatingOrbs />

        {/* grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            {/* left */}
            <div>
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI × Web3 × Productivity
                </div>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={1}
                className="text-5xl leading-[1.08] font-extrabold tracking-tight sm:text-6xl lg:text-7xl"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Fair pay for{' '}
                <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
                  fair work
                </span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={2}
                className="mt-6 max-w-lg text-lg leading-relaxed text-neutral-400"
              >
                AI-driven team matching, real-time productivity tracking, and
                blockchain-based compensation. Senate automates the entire
                project payment lifecycle — so everyone gets paid what they
                deserve, instantly.
              </motion.p>

              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={3}
                className="mt-10 flex flex-wrap items-center gap-4"
              >
                <a
                  href="#"
                  className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-7 py-3.5 text-base font-semibold text-white shadow-2xl shadow-violet-500/30 transition-all hover:shadow-violet-500/50"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-7 py-3.5 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
                >
                  See How It Works
                </a>
              </motion.div>

              {/* trust badges */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={4}
                className="mt-12 flex flex-wrap items-center gap-6 text-sm text-neutral-500"
              >
                <span className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-emerald-500" /> Audited Smart Contracts
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-blue-500" /> On-Chain Escrow
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-yellow-500" /> Instant USDC Payouts
                </span>
              </motion.div>
            </div>

            {/* right — hero visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative hidden lg:block"
            >
              {/* mock dashboard card */}
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-1 shadow-2xl">
                <div className="rounded-xl bg-gradient-to-b from-[#111113] to-[#0c0c0e] p-6">
                  {/* terminal header */}
                  <div className="mb-5 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500/80" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                    <div className="h-3 w-3 rounded-full bg-green-500/80" />
                    <span className="ml-3 text-xs text-neutral-600">senate — smart escrow</span>
                  </div>

                  {/* project card */}
                  <div className="mb-4 rounded-lg border border-white/5 bg-white/[0.02] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold tracking-widest text-violet-400 uppercase">Active Project</span>
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                        Milestone 2
                      </span>
                    </div>
                    <p className="mb-2 text-lg font-bold text-white">Mobile Expense Tracker</p>
                    <p className="text-sm text-neutral-500">Budget: $5,000 USDC • 30 days • 3 contributors</p>
                  </div>

                  {/* team scores */}
                  <div className="space-y-3">
                    {[
                      { name: 'Alice', role: 'Full-Stack', score: 92, color: 'from-violet-500 to-blue-500' },
                      { name: 'Bob', role: 'React Native', score: 78, color: 'from-blue-500 to-cyan-500' },
                      { name: 'Charlie', role: 'UI/UX', score: 85, color: 'from-emerald-500 to-teal-500' },
                    ].map((member) => (
                      <div key={member.name} className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${member.color} text-xs font-bold`}>
                          {member.name[0]}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white">{member.name}</span>
                            <span className="text-sm font-bold text-emerald-400">{member.score}/100</span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                            <motion.div
                              className={`h-full rounded-full bg-gradient-to-r ${member.color}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${member.score}%` }}
                              transition={{ duration: 1.5, delay: 0.8, ease: 'easeOut' }}
                            />
                          </div>
                          <span className="mt-1 block text-xs text-neutral-600">{member.role}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* payout */}
                  <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">
                        Milestone 1 Payout
                      </span>
                      <span className="text-lg font-bold text-white">$1,500 USDC</span>
                    </div>
                    <div className="mt-2 flex gap-3 text-xs text-neutral-500">
                      <span>Alice: $541</span>
                      <span>•</span>
                      <span>Bob: $459</span>
                      <span>•</span>
                      <span>Charlie: $500</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* floating badge */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-4 -right-4 rounded-xl border border-white/10 bg-[#111113]/90 px-4 py-3 shadow-xl backdrop-blur"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="text-xs font-semibold text-white">Payment Sent</p>
                    <p className="text-[11px] text-neutral-500">$541 USDC → Alice</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-3 -left-4 rounded-xl border border-white/10 bg-[#111113]/90 px-4 py-3 shadow-xl backdrop-blur"
              >
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-violet-400" />
                  <div>
                    <p className="text-xs font-semibold text-white">AI Match Score</p>
                    <p className="text-[11px] text-neutral-500">89% team synergy</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          STATS BAR
         ══════════════════════════════════════════════════════════════════ */}
      <Section className="border-y border-white/5 bg-white/[0.01]">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {[
            { value: 1.57, suffix: 'T', prefix: '$', label: 'Freelance Economy' },
            { value: 68, suffix: '%', prefix: '', label: 'Freelancers Face Disputes' },
            { value: 2.5, suffix: '%', prefix: '', label: 'Platform Fee (vs 20%)' },
            { value: 3, suffix: 's', prefix: '<', label: 'Withdrawal Speed' },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              className="text-center"
            >
              <p className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                <AnimatedCounter target={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
              </p>
              <p className="mt-1 text-sm text-neutral-500">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          FEATURES
         ══════════════════════════════════════════════════════════════════ */}
      <Section id="features">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1 text-sm font-medium text-violet-300">
            The Platform
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Everything you need.{' '}
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Nothing you don't.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-500">
            Senate replaces manual team assembly, opaque timesheets, and delayed payments
            with a single automated pipeline powered by AI and smart contracts.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: <Brain className="h-6 w-6" />,
              title: 'AI Team Matching',
              description:
                'Semantic search across thousands of developer profiles. Get optimal team compositions in seconds — not hours.',
              gradient: 'from-violet-500 to-purple-600',
            },
            {
              icon: <BarChart3 className="h-6 w-6" />,
              title: 'Real-Time Scoring',
              description:
                'GitHub commits, WakaTime hours, GPT-4 code reviews, and milestone delivery — combined into a single productivity score.',
              gradient: 'from-blue-500 to-cyan-600',
            },
            {
              icon: <Lock className="h-6 w-6" />,
              title: 'On-Chain Escrow',
              description:
                'Funds locked in audited smart contracts. Released automatically based on verified productivity scores.',
              gradient: 'from-emerald-500 to-teal-600',
            },
            {
              icon: <Zap className="h-6 w-6" />,
              title: 'Instant USDC Payouts',
              description:
                'No more 30-60 day invoicing cycles. Contributors withdraw USDC the moment a milestone finalizes.',
              gradient: 'from-yellow-500 to-orange-600',
            },
            {
              icon: <Scale className="h-6 w-6" />,
              title: 'Dispute Resolution',
              description:
                'On-chain evidence, admin multi-sig, or Kleros decentralized court — multiple paths to fair outcomes.',
              gradient: 'from-pink-500 to-rose-600',
            },
            {
              icon: <Star className="h-6 w-6" />,
              title: 'Reward Tokens',
              description:
                'Top contributors earn $WORK governance tokens. Stake to reduce fees and participate in protocol governance.',
              gradient: 'from-amber-500 to-yellow-600',
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: i * 0.08 }}
              className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]"
            >
              {/* subtle glow on hover */}
              <div className={`absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br ${feature.gradient} opacity-0 blur-[80px] transition-opacity duration-500 group-hover:opacity-20`} />

              <div className={`mb-5 inline-flex rounded-xl bg-gradient-to-br ${feature.gradient} p-3 text-white`}>
                {feature.icon}
              </div>
              <h3 className="mb-2 text-xl font-bold text-white">{feature.title}</h3>
              <p className="leading-relaxed text-neutral-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          HOW IT WORKS
         ══════════════════════════════════════════════════════════════════ */}
      <Section id="how-it-works" className="bg-white/[0.01]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1 text-sm font-medium text-blue-300">
            How It Works
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Four steps to{' '}
            <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">automated fairness</span>
          </h2>
        </motion.div>

        <div className="space-y-8 lg:space-y-0">
          {[
            {
              step: '01',
              title: 'Create Project & Match Team',
              desc: 'Describe your project. Our RAG-powered AI searches thousands of developer profiles and recommends optimal team compositions ranked by predicted success probability.',
              icon: <Users className="h-7 w-7" />,
              gradient: 'from-violet-500 to-purple-600',
              example: '"Build mobile expense tracker, $5K, 30 days" → Top 5 teams in 3 seconds',
            },
            {
              step: '02',
              title: 'Fund Escrow & Define Milestones',
              desc: 'Deposit USDC into the smart contract. Define milestones with budget splits (e.g., 30/40/30). Funds are locked and visible on-chain — no trust required.',
              icon: <Wallet className="h-7 w-7" />,
              gradient: 'from-blue-500 to-cyan-600',
              example: '$5,000 USDC locked → 3 milestones → Automatic splits',
            },
            {
              step: '03',
              title: 'Work & Track Automatically',
              desc: 'Contributors write code while the oracle aggregates GitHub stats, WakaTime hours, and AI code quality reviews into objective productivity scores.',
              icon: <GanttChart className="h-7 w-7" />,
              gradient: 'from-cyan-500 to-teal-600',
              example: 'Alice: 92/100 • Bob: 78/100 • Charlie: 85/100',
            },
            {
              step: '04',
              title: 'Score → Payout → Withdraw',
              desc: 'Oracle submits scores on-chain. The contract calculates merit-based allocations. After a 3-day dispute window, contributors withdraw USDC instantly.',
              icon: <DollarSign className="h-7 w-7" />,
              gradient: 'from-emerald-500 to-green-600',
              example: 'Alice gets $541 • Bob $459 • Charlie $500 → Instant withdrawal',
            },
          ].map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className={`flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-16 ${i % 2 === 1 ? 'lg:flex-row-reverse' : ''} ${i < 3 ? 'lg:mb-16' : ''}`}
            >
              {/* info side */}
              <div className="flex-1">
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8">
                  <div className="mb-4 flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${step.gradient} text-white`}>
                      {step.icon}
                    </div>
                    <span className="text-sm font-bold tracking-widest text-neutral-600 uppercase">Step {step.step}</span>
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-white">{step.title}</h3>
                  <p className="mb-4 leading-relaxed text-neutral-400">{step.desc}</p>
                  <div className="rounded-lg border border-white/5 bg-white/[0.03] px-4 py-3">
                    <code className="text-sm text-emerald-400">{step.example}</code>
                  </div>
                </div>
              </div>

              {/* visual connector */}
              <div className="hidden flex-col items-center lg:flex">
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${step.gradient} text-2xl font-black text-white shadow-xl`}
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {step.step}
                </div>
                {i < 3 && <div className="h-20 w-px bg-gradient-to-b from-white/10 to-transparent" />}
              </div>

              {/* spacer for alignment */}
              <div className="hidden flex-1 lg:block" />
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          COMPARISON
         ══════════════════════════════════════════════════════════════════ */}
      <Section id="comparison">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-sm font-medium text-emerald-300">
            The Proof
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            See how Senate{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">stacks up</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-500">
            Compare Senate against traditional platforms across the metrics that matter most.
          </p>
        </motion.div>

        {/* comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="overflow-hidden rounded-2xl border border-white/5"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-6 py-5 text-left text-sm font-semibold text-neutral-400">Feature</th>
                  <th className="px-6 py-5 text-center text-sm font-semibold text-violet-400">
                    <div className="flex items-center justify-center gap-2">
                      <Scale className="h-4 w-4" />
                      Senate
                    </div>
                  </th>
                  <th className="px-6 py-5 text-center text-sm font-semibold text-neutral-500">Upwork</th>
                  <th className="px-6 py-5 text-center text-sm font-semibold text-neutral-500">Gitcoin</th>
                  <th className="px-6 py-5 text-center text-sm font-semibold text-neutral-500">Escrow.com</th>
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
                  <tr key={row.feature} className={`border-b border-white/5 ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                    <td className="px-6 py-4 text-sm font-medium text-white">{row.feature}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${
                        row.highlight
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'text-white'
                      }`}>
                        {row.senate}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-neutral-500">{row.upwork}</td>
                    <td className="px-6 py-4 text-center text-sm text-neutral-500">{row.gitcoin}</td>
                    <td className="px-6 py-4 text-center text-sm text-neutral-500">{row.escrow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* visual comparison bars */}
        <div className="mt-16 grid gap-10 md:grid-cols-2">
          <ComparisonBar label="Platform Fees (%)" oldVal={20} newVal={2.5} oldLabel="Upwork" newLabel="Senate" />
          <ComparisonBar label="Payment Time (days)" oldVal={60} newVal={0.01} oldLabel="Traditional" newLabel="Senate" />
          <ComparisonBar label="Team Matching (hours)" oldVal={8} newVal={0.01} oldLabel="Manual" newLabel="Senate AI" />
          <ComparisonBar label="Dispute Resolution (days)" oldVal={14} newVal={3} oldLabel="Manual Arb." newLabel="Senate" />
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          TECH STACK
         ══════════════════════════════════════════════════════════════════ */}
      <Section className="bg-white/[0.01]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1 text-sm font-medium text-cyan-300">
            Built With
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Production-grade{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">tech stack</span>
          </h2>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: 'AI / RAG',
              icon: <Bot className="h-5 w-5" />,
              items: ['LangChain', 'OpenAI Embeddings', 'Pinecone', 'GPT-4 Reviews'],
              gradient: 'from-violet-500 to-purple-600',
            },
            {
              title: 'Blockchain',
              icon: <Layers className="h-5 w-5" />,
              items: ['Solidity 0.8', 'OpenZeppelin UUPS', 'Hardhat', 'Sepolia / Polygon'],
              gradient: 'from-blue-500 to-cyan-600',
            },
            {
              title: 'Backend',
              icon: <Code2 className="h-5 w-5" />,
              items: ['Node.js', 'Express', 'PostgreSQL', 'BullMQ'],
              gradient: 'from-emerald-500 to-teal-600',
            },
            {
              title: 'Frontend',
              icon: <Globe className="h-5 w-5" />,
              items: ['React', 'Tailwind CSS', 'ethers.js v6', 'Framer Motion'],
              gradient: 'from-cyan-500 to-blue-600',
            },
          ].map((stack, i) => (
            <motion.div
              key={stack.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-white/5 bg-white/[0.02] p-6"
            >
              <div className={`mb-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-br ${stack.gradient} bg-clip-text text-transparent`}>
                <div className={`bg-gradient-to-br ${stack.gradient} bg-clip-text`}>
                  {stack.icon}
                </div>
                <span className="text-sm font-bold tracking-widest uppercase">{stack.title}</span>
              </div>
              <ul className="space-y-2">
                {stack.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-neutral-400">
                    <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          FAQ
         ══════════════════════════════════════════════════════════════════ */}
      <Section id="faq">
        <div className="grid gap-16 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="mb-4 inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1 text-sm font-medium text-amber-300">
              FAQ
            </span>
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Frequently asked{' '}
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">questions</span>
            </h2>
            <p className="mt-4 max-w-md text-lg text-neutral-500">
              Everything you need to know about how Senate handles team matching,
              productivity tracking, payments, and disputes.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
            {[
              {
                q: 'How does AI team matching work?',
                a: 'We convert project descriptions and developer profiles into high-dimensional vectors using OpenAI embeddings. A semantic search across our vector database returns the top team compositions ranked by predicted success probability — factoring in skill relevance, past performance, availability, budget fit, and timezone overlap.',
              },
              {
                q: 'How are productivity scores calculated?',
                a: 'Scores are a weighted combination of GitHub activity (25%), WakaTime active coding hours (30%), AI code quality reviews via GPT-4 (25%), and milestone delivery performance (20%). The system caps each metric to prevent gaming and normalizes to a 0-100 scale.',
              },
              {
                q: 'What happens if I think my score is unfair?',
                a: 'You can raise an on-chain dispute during the 3-day window after scores are submitted. Upload evidence (architecture docs, mentoring logs, etc.) and choose resolution via admin multi-sig (24-48 hours) or Kleros decentralized court (3-5 days) for a neutral third-party ruling.',
              },
              {
                q: 'What tokens does Senate support?',
                a: 'Escrow deposits and payouts are in USDC (stablecoin) for zero volatility risk. Top contributors also earn $WORK governance tokens as bonus rewards. We plan to support additional stablecoins in future releases.',
              },
              {
                q: 'Are the smart contracts audited?',
                a: 'Our contracts use the UUPS upgradeable proxy pattern built on audited OpenZeppelin libraries. The protocol is deployed on Sepolia testnet for public testing, with a full audit planned before mainnet launch.',
              },
              {
                q: 'How much does Senate cost?',
                a: 'Senate charges a 2.5% transaction fee on total project budget — 8x lower than Upwork (20%) and cheaper than traditional escrow (3-5%). Staking $WORK tokens can further reduce fees to 1.5%.',
              },
            ].map((item) => (
              <FAQItem key={item.q} question={item.q} answer={item.a} />
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          CTA
         ══════════════════════════════════════════════════════════════════ */}
      <Section>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl border border-white/10"
        >
          {/* bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-blue-600/10 to-emerald-600/10" />
          <div className="absolute -top-40 -right-40 h-[400px] w-[400px] rounded-full bg-violet-500/20 blur-[120px]" />
          <div className="absolute -bottom-40 -left-40 h-[350px] w-[350px] rounded-full bg-blue-500/15 blur-[100px]" />

          <div className="relative px-8 py-20 text-center sm:px-16 sm:py-28">
            <h2
              className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Ready to make work{' '}
              <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">fair?</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-neutral-400">
              Join the beta and be among the first teams to experience AI-powered matching
              and instant merit-based payouts on Senate.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <a
                href="#"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-8 py-4 text-base font-semibold text-white shadow-2xl shadow-violet-500/30 transition-all hover:shadow-violet-500/50"
              >
                Join the Beta Waitlist
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
              >
                <Github className="h-5 w-5" />
                View on GitHub
              </a>
            </div>
          </div>
        </motion.div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          FOOTER
         ══════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/5 bg-white/[0.01]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-12 md:grid-cols-4">
            {/* brand */}
            <div className="md:col-span-1">
              <a href="#" className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-600">
                  <Scale className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Senate
                </span>
              </a>
              <p className="mt-4 text-sm leading-relaxed text-neutral-500">
                Fair Pay for Fair Work.
                <br />
                AI-driven matching, productivity tracking, and blockchain compensation.
              </p>
              <div className="mt-5 flex gap-3">
                <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-neutral-500 transition-colors hover:text-white">
                  <Twitter className="h-4 w-4" />
                </a>
                <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-neutral-500 transition-colors hover:text-white">
                  <Github className="h-4 w-4" />
                </a>
                <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-neutral-500 transition-colors hover:text-white">
                  <Globe className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* footer links */}
            {[
              {
                title: 'Product',
                links: ['Features', 'How It Works', 'Pricing', 'Roadmap'],
              },
              {
                title: 'Developers',
                links: ['Documentation', 'Smart Contracts', 'API Reference', 'GitHub'],
              },
              {
                title: 'Company',
                links: ['About', 'Blog', 'Careers', 'Contact'],
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="mb-4 text-sm font-semibold tracking-widest text-neutral-300 uppercase">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-neutral-500 transition-colors hover:text-white">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 md:flex-row">
            <p className="text-sm text-neutral-600">&copy; {new Date().getFullYear()} Senate. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-neutral-600">
              <a href="#" className="hover:text-white">Privacy</a>
              <a href="#" className="hover:text-white">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}