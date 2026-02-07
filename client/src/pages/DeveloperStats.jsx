
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Trophy, Award, Zap, Code, Target, Star, TrendingUp } from 'lucide-react';

const DEVELOPER_DATA = [
  { subject: 'Code Quality', A: 120, B: 110, fullMark: 150 },
  { subject: 'Speed', A: 98, B: 130, fullMark: 150 },
  { subject: 'Collaboration', A: 86, B: 130, fullMark: 150 },
  { subject: 'Innovation', A: 99, B: 100, fullMark: 150 },
  { subject: 'Reliability', A: 85, B: 90, fullMark: 150 },
  { subject: 'Security', A: 65, B: 85, fullMark: 150 },
];

const TOP_PERFORMERS = [
  { name: 'Sarah Chen', points: 12450, level: 42, role: 'Frontend Wizard', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
  { name: 'Michael Ross', points: 11200, level: 38, role: 'Backend Guru', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael' },
  { name: 'David Kim', points: 10850, level: 35, role: 'Full Stack Ninja', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David' },
];

const DeveloperStats = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.header-anim', {
        y: -30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      });

      gsap.from('.leaderboard-card', {
        x: -50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        delay: 0.2,
        ease: 'power3.out',
      });

      gsap.from('.chart-anim', {
        scale: 0.9,
        opacity: 0,
        duration: 0.8,
        delay: 0.5,
        ease: 'back.out(1.7)',
      });

      gsap.from('.points-anim', {
        textContent: 0,
        duration: 2,
        ease: 'power1.out',
        snap: { textContent: 1 },
        stagger: 0.2,
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="p-8 min-h-screen bg-zinc-950 text-white ml-64 overflow-hidden">
       {/* Background Glow */}
       <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <div className="header-anim mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-indigo-500 mb-2">
            Developer Stats
          </h1>
          <p className="text-zinc-400">Track performance metrics and gamified achievements.</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex gap-6 items-center">
             <div className="text-center">
                 <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Team Velocity</p>
                 <p className="text-2xl font-bold text-white">142 pts</p>
             </div>
             <div className="w-px h-10 bg-zinc-800"/>
             <div className="text-center">
                 <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Avg Efficiency</p>
                 <p className="text-2xl font-bold text-emerald-400">94%</p>
             </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Leaderboard */}
        <div className="lg:col-span-1 space-y-4">
             <div className="flex items-center gap-2 mb-4">
                <Trophy className="text-yellow-500" />
                <h2 className="text-xl font-bold text-white">Top Performers</h2>
             </div>
             {TOP_PERFORMERS.map((dev, index) => (
                 <div key={dev.name} className="leaderboard-card bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4 hover:bg-zinc-800/60 transition-colors group relative overflow-hidden">
                     <div className={`absolute left-0 top-0 bottom-0 w-1 ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-zinc-400' : 'bg-amber-700'}`} />
                     <div className="relative">
                        <img src={dev.avatar} alt={dev.name} className="w-12 h-12 rounded-full border-2 border-zinc-800 group-hover:border-indigo-500 transition-colors" />
                        <div className="absolute -bottom-1 -right-1 bg-zinc-950 rounded-full p-0.5 border border-zinc-700">
                             {index === 0 ? <Award size={12} className="text-yellow-500"/> : <Star size={12} className="text-zinc-400"/>}
                        </div>
                     </div>
                     <div className="flex-1">
                         <h3 className="font-bold text-white">{dev.name}</h3>
                         <p className="text-xs text-zinc-400">{dev.role}</p>
                     </div>
                     <div className="text-right">
                         <p className="text-indigo-400 font-bold">{dev.points.toLocaleString()}</p>
                         <p className="text-[10px] text-zinc-500">Lvl {dev.level}</p>
                     </div>
                 </div>
             ))}

             <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 mt-6 shadow-lg shadow-indigo-500/20 transform hover:scale-[1.02] transition-transform">
                 <div className="flex items-start justify-between mb-4">
                     <div>
                         <p className="text-indigo-200 text-sm font-medium mb-1">Weekly Challenge</p>
                         <h3 className="text-xl font-bold text-white">Bug Hunter</h3>
                     </div>
                     <Target className="text-white opacity-80" />
                 </div>
                 <p className="text-indigo-100 text-sm mb-4">Fix 5 critical bugs to earn the "Exterminator" badge and +500 points.</p>
                 <div className="w-full bg-black/20 rounded-full h-2 mb-2">
                     <div className="bg-white w-[60%] h-full rounded-full" />
                 </div>
                 <p className="text-xs text-indigo-200 text-right">3/5 Completed</p>
             </div>
        </div>

        {/* Charts */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="chart-anim bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <Zap className="text-yellow-400" size={20}/> Skill Radar
                </h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={DEVELOPER_DATA}>
                            <PolarGrid stroke="#3f3f46" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                            <Radar name="Sarah" dataKey="A" stroke="#8b5cf6" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.3} />
                            <Radar name="Michael" dataKey="B" stroke="#10b981" strokeWidth={2} fill="#10b981" fillOpacity={0.3} />
                            <Legend wrapperStyle={{ color: '#fff' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="chart-anim bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">
                 <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <TrendingUp className="text-blue-400" size={20}/> Efficiency Trends
                </h3>
                 <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={DEVELOPER_DATA}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <XAxis type="number" hide />
                            <YAxis dataKey="subject" type="category" width={80} tick={{fill: '#a1a1aa', fontSize: 12}} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }} />
                            <Bar dataKey="A" name="Sarah" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={10} />
                            <Bar dataKey="B" name="Michael" fill="#10b981" radius={[0, 4, 4, 0]} barSize={10} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperStats;
