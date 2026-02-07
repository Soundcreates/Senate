
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { MoreHorizontal, Plus, Clock, CheckCircle2, AlertCircle, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const TASKS = [
  { id: 1, title: 'Implement Authentication', status: 'In Progress', priority: 'High', assignee: 'Sarah Chen' },
  { id: 2, title: 'Database Schema Design', status: 'Done', priority: 'High', assignee: 'Michael Ross' },
  { id: 3, title: 'API Documentation', status: 'To Do', priority: 'Medium', assignee: 'David Kim' },
  { id: 4, title: 'Frontend Setup', status: 'Done', priority: 'High', assignee: 'Sarah Chen' },
  { id: 5, title: 'Unit Tests', status: 'In Progress', priority: 'Low', assignee: 'Emily Davis' },
];

const PRODUCTIVITY_DATA = [
  { name: 'Mon', completed: 4, efficiency: 85 },
  { name: 'Tue', completed: 6, efficiency: 88 },
  { name: 'Wed', completed: 8, efficiency: 92 },
  { name: 'Thu', completed: 5, efficiency: 87 },
  { name: 'Fri', completed: 9, efficiency: 95 },
  { name: 'Sat', completed: 2, efficiency: 80 },
  { name: 'Sun', completed: 1, efficiency: 75 },
];
const Dashboard = () => {
  const containerRef = useRef(null);
  const {fetchUserProfile,user} = useAuth();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.dashboard-header', {
        y: -30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      });

      gsap.from('.stat-card', {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        delay: 0.2,
        ease: 'power2.out',
      });

      gsap.from('.chart-container', {
        scale: 0.95,
        opacity: 0,
        duration: 0.8,
        delay: 0.4,
        ease: 'power3.out',
      });

      gsap.from('.task-column', {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.15,
        delay: 0.6,
        ease: 'power2.out',
      });
    }, containerRef);
    const fetchData = async () => {
       await fetchUserProfile();
      
    }
    fetchData();

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    console.log("User data: ", user);
  },[]);

  return (
    <div ref={containerRef} className="p-8 min-h-screen bg-zinc-950 text-white ml-64 overflow-hidden">
      <div className="dashboard-header flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 mb-2">
            Dashboard
          </h1>
          <p className="text-zinc-400">Overview of project progress and team productivity.</p>
        </div>
        <div className="flex gap-4">
          <button className="bg-zinc-800 text-white px-4 py-2 rounded-xl hover:bg-zinc-700 transition-colors flex items-center gap-2">
            <Clock size={18} /> Time Logs
          </button>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-500 transition-colors flex items-center gap-2 font-medium shadow-lg shadow-indigo-500/20">
            <Plus size={18} /> New Task
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Tasks', value: '24', change: '+12%', color: 'from-blue-500 to-cyan-500' },
          { label: 'Completed', value: '18', change: '+8%', color: 'from-green-500 to-emerald-500' },
          { label: 'In Progress', value: '4', change: '-2%', color: 'from-orange-500 to-amber-500' },
          { label: 'Efficiency', value: '92%', change: '+5%', color: 'from-purple-500 to-pink-500' },
        ].map((stat, i) => (
          <div key={i} className="stat-card bg-zinc-900/50 backdrop-blur-md border border-zinc-800 p-6 rounded-2xl shadow-xl relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-10 rounded-bl-full group-hover:opacity-20 transition-opacity`} />
            <p className="text-zinc-400 text-sm font-medium mb-1">{stat.label}</p>
            <h3 className="text-3xl font-bold text-white">{stat.value}</h3>
            <span className={`text-xs px-2 py-1 rounded-full bg-zinc-800 mt-3 inline-block ${stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
              {stat.change} from last week
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Productivity Chart */}
        <div className="chart-container bg-zinc-900/50 backdrop-blur-md border border-zinc-800 p-6 rounded-3xl shadow-xl">
          <h3 className="text-lg font-semibold mb-6">Team Productivity</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={PRODUCTIVITY_DATA}>
                <defs>
                  <linearGradient id="colorIso" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" tick={{fill: '#71717a'}} axisLine={false} tickLine={false} />
                <YAxis stroke="#71717a" tick={{fill: '#71717a'}} axisLine={false} tickLine={false} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="completed" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorIso)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Efficiency Chart */}
         <div className="chart-container bg-zinc-900/50 backdrop-blur-md border border-zinc-800 p-6 rounded-3xl shadow-xl">
          <h3 className="text-lg font-semibold mb-6">Code Efficiency Trends</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PRODUCTIVITY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" tick={{fill: '#71717a'}} axisLine={false} tickLine={false} />
                <YAxis stroke="#71717a" tick={{fill: '#71717a'}} axisLine={false} tickLine={false} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
                    cursor={{fill: '#27272a'}}
                />
                <Bar dataKey="efficiency" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Task Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['To Do', 'In Progress', 'Done'].map((status) => (
          <div key={status} className="task-column bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-zinc-300">{status}</h3>
              <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-1 rounded-full">
                {TASKS.filter(t => t.status === status).length}
              </span>
            </div>
            <div className="space-y-3">
              {TASKS.filter(t => t.status === status).map(task => (
                <div key={task.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl hover:border-zinc-700 transition-colors cursor-move group">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] px-2 py-1 rounded-md mb-2 inline-block font-medium ${
                      task.priority === 'High' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                      task.priority === 'Medium' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 
                      'bg-green-500/10 text-green-400 border border-green-500/20'
                    }`}>
                      {task.priority}
                    </span>
                    <button className="text-zinc-600 hover:text-white transition-colors">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                  <h4 className="font-medium text-white mb-3 group-hover:text-indigo-400 transition-colors">{task.title}</h4>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <div className="flex items-center gap-2">
                         <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] text-indigo-400 border border-indigo-500/30">
                            {task.assignee.charAt(0)}
                         </div>
                         <span>{task.assignee}</span>
                    </div>
                    <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] border border-zinc-700">Dec 24</span>
                  </div>
                </div>
              ))}
              <button className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-lg border border-dashed border-zinc-800 hover:border-zinc-600 transition-all flex items-center justify-center gap-2">
                <Plus size={16} /> Add new task
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
