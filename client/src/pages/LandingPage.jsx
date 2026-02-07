import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ArrowRight, Layers, Zap, Shield } from 'lucide-react';

const LandingPage = () => {
  const containerRef = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-content', {
        y: 50,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
      });

      gsap.from('.feature-card', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        delay: 0.5,
        ease: 'power2.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-zinc-900/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <div className="hero-content text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-400 mb-6">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          v1.0 Now Available
        </div>
        <h1 className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-zinc-400 mb-6 tracking-tight">
          Manage Projects with <br />
          <span className="text-indigo-500">Superhuman Speed</span>
        </h1>
        <p className="text-xl text-zinc-400 mb-8 leading-relaxed">
          The all-in-one platform for modern engineering teams. Track productivity, manage tasks, and gamify development workflows.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/register" className="bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-zinc-200 transition-colors flex items-center gap-2 group">
            Get Started <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <button className="px-8 py-4 rounded-full font-bold text-lg text-white hover:bg-zinc-900 transition-colors border border-zinc-800">
            View Documentation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {[
          { icon: <Layers className="text-indigo-400" size={32} />, title: 'Smart Workflows', desc: 'Automated project setup and employee assignment.' },
          { icon: <Zap className="text-yellow-400" size={32} />, title: 'Real-time Stats', desc: 'Live productivity tracking and efficiency metrics.' },
          { icon: <Shield className="text-emerald-400" size={32} />, title: 'Secure & Scalable', desc: 'Enterprise-grade security for your codebase.' },
        ].map((feature, i) => (
          <div key={i} className="feature-card bg-zinc-900/30 backdrop-blur-md border border-zinc-800 p-6 rounded-3xl hover:bg-zinc-900/50 transition-colors">
            <div className="mb-4 bg-zinc-800/50 w-12 h-12 rounded-2xl flex items-center justify-center">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
            <p className="text-zinc-400">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LandingPage;