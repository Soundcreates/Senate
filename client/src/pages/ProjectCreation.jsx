
import React, { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Search, UserPlus, Check, X, Briefcase, Code } from 'lucide-react';

const DUMMY_EMPLOYEES = [
  {
    id: 1,
    name: 'Sarah Chen',
    role: 'Senior Frontend Dev',
    skills: ['React', 'Three.js', 'GSAP'],
    experience: '5 years',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    efficiency: 94,
  },
  {
    id: 2,
    name: 'Michael Ross',
    role: 'Backend Engineer',
    skills: ['Node.js', 'PostgreSQL', 'Redis'],
    experience: '4 years',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
    efficiency: 89,
  },
  {
    id: 3,
    name: 'Jessica Wu',
    role: 'UI/UX Designer',
    skills: ['Figma', 'Tailwind', 'Motion'],
    experience: '3 years',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica',
    efficiency: 92,
  },
  {
    id: 4,
    name: 'David Kim',
    role: 'Full Stack Dev',
    skills: ['Next.js', 'Python', 'AWS'],
    experience: '6 years',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    efficiency: 96,
  },
  {
    id: 5,
    name: 'Emily Davis',
    role: 'Mobile Dev',
    skills: ['React Native', 'Swift', 'Kotlin'],
    experience: '4 years',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
    efficiency: 88,
  },
];

const ProjectCreation = () => {
  const [description, setDescription] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const containerRef = useRef(null);
  const formRef = useRef(null);
  const employeeListRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header Animation
      gsap.from('.page-header', {
        y: -30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      });

      // Form Animation
      gsap.from(formRef.current, {
        x: -50,
        opacity: 0,
        duration: 0.8,
        delay: 0.2,
        ease: 'power3.out',
      });

      // Employee List Animation
      gsap.from(employeeListRef.current, {
        x: 50,
        opacity: 0,
        duration: 0.8,
        delay: 0.4,
        ease: 'power3.out',
      });
      
      // Stagger employee cards
      gsap.from('.employee-card', {
        y: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1,
        delay: 0.6,
        ease: 'power2.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const toggleEmployee = (employee) => {
    if (selectedEmployees.find((e) => e.id === employee.id)) {
      setSelectedEmployees(prev => prev.filter((e) => e.id !== employee.id));
    } else {
      setSelectedEmployees(prev => [...prev, employee]);
    }
  };

  const filteredEmployees = DUMMY_EMPLOYEES.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div ref={containerRef} className="p-8 min-h-screen bg-zinc-950 text-white ml-64 overflow-hidden relative">
        {/* Background Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-64 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

      <div className="page-header mb-8">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 mb-2">
          Create New Project
        </h1>
        <p className="text-zinc-400">Define your project scope and assemble your dream team.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Project Details */}
        <div ref={formRef} className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 shadow-xl">
            <label className="block text-sm font-medium text-zinc-300 mb-2">Project Description</label>
            <textarea
              className="w-full h-48 bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all resize-none placeholder-zinc-600"
              placeholder="Describe your project requirements, goals, and necessary skills..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="mt-4 flex justify-end">
              <button className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-zinc-200 transition-colors flex items-center gap-2">
                Analyze Requirements <Briefcase size={18} />
              </button>
            </div>
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
              <Check className="text-green-400" size={20} /> Selected Team ({selectedEmployees.length})
            </h3>
            {selectedEmployees.length === 0 ? (
              <p className="text-zinc-500 text-sm py-4 text-center border border-dashed border-zinc-800 rounded-xl">
                No employees selected yet.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedEmployees.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between bg-zinc-800/30 p-3 rounded-xl border border-zinc-700/30">
                    <div className="flex items-center gap-3">
                      <img src={emp.avatar} alt={emp.name} className="w-8 h-8 rounded-full bg-zinc-800" />
                      <span className="text-sm font-medium">{emp.name}</span>
                    </div>
                    <button 
                      onClick={() => toggleEmployee(emp)}
                      className="text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <button className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-[0.98]">
              Create Project
            </button>
          </div>
        </div>

        {/* Right Column: Employee Selection */}
        <div ref={employeeListRef} className="lg:col-span-7">
          <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 h-full shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Available Talent</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="text"
                  placeholder="Search by skill or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-zinc-950/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500/50 w-64 text-white placeholder-zinc-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredEmployees.map((emp) => {
                const isSelected = selectedEmployees.some(e => e.id === emp.id);
                return (
                  <div 
                    key={emp.id} 
                    className={`employee-card group relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-500/10 border-indigo-500/50' 
                        : 'bg-zinc-800/20 border-zinc-800 hover:bg-zinc-800/40 hover:border-zinc-700'
                    }`}
                    onClick={() => toggleEmployee(emp)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <img src={emp.avatar} alt={emp.name} className="w-12 h-12 rounded-full bg-zinc-800 shadow-lg" />
                        <div>
                          <h3 className="font-semibold text-white">{emp.name}</h3>
                          <p className="text-xs text-zinc-400">{emp.role}</p>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected 
                          ? 'bg-indigo-500 border-indigo-500 text-white' 
                          : 'border-zinc-600 text-transparent group-hover:border-zinc-500'
                      }`}>
                        <Check size={14} />
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {emp.skills.map(skill => (
                        <span key={skill} className="text-xs px-2 py-1 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {skill}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-zinc-500 pt-3 border-t border-zinc-800/50">
                        <span className="flex items-center gap-1"><Briefcase size={12}/> {emp.experience}</span>
                        <span className="flex items-center gap-1"><Code size={12}/> {emp.efficiency}% Efficiency</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
             <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-center">
                <button className="text-indigo-400 text-sm font-medium hover:text-indigo-300 flex items-center gap-2 transition-colors">
                    <UserPlus size={16} /> Manually Add Employee
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectCreation;
