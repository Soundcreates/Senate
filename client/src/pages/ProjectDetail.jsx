import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Clock, GitCommit, Code2, Circle, Calendar,
    CheckCircle2, AlertCircle, User, TrendingUp, Activity
} from 'lucide-react';

// Mock project data (keyed by ID)
const projectsData = {
    1: {
        name: 'NFT Marketplace',
        status: 'Active',
        budget: '$15,000',
        spent: '$9,750',
        progress: 65,
        dueDate: 'Feb 28, 2026',
        startDate: 'Jan 15, 2026',
        description: 'A full-featured NFT marketplace with minting, trading, and auction capabilities.',
        team: [
            { id: 1, name: 'Alice Chen', role: 'Full-Stack', avatar: '👩‍💻', hoursSpent: 48, commits: 32, codeQuality: 94, lastOnline: '2 min ago', status: 'online' },
            { id: 2, name: 'Bob Kumar', role: 'Blockchain', avatar: '👨‍💻', hoursSpent: 36, commits: 28, codeQuality: 91, lastOnline: '1 hour ago', status: 'away' },
            { id: 3, name: 'Charlie Park', role: 'UI/UX', avatar: '🎨', hoursSpent: 24, commits: 15, codeQuality: 88, lastOnline: '3 hours ago', status: 'offline' },
        ],
        tasks: [
            { id: 1, title: 'Smart Contract Development', status: 'Completed', assignee: 'Bob Kumar', hours: 16 },
            { id: 2, title: 'Frontend UI Implementation', status: 'In Progress', assignee: 'Alice Chen', hours: 24 },
            { id: 3, title: 'Design System & Components', status: 'Completed', assignee: 'Charlie Park', hours: 12 },
            { id: 4, title: 'Wallet Integration', status: 'In Progress', assignee: 'Bob Kumar', hours: 8 },
            { id: 5, title: 'Testing & QA', status: 'Pending', assignee: 'Alice Chen', hours: 0 },
        ],
        activity: [
            { id: 1, user: 'Alice Chen', action: 'pushed 3 commits to main', time: '10 min ago', type: 'commit' },
            { id: 2, user: 'Bob Kumar', action: 'deployed contract to testnet', time: '1 hour ago', type: 'deploy' },
            { id: 3, user: 'Charlie Park', action: 'updated design tokens', time: '3 hours ago', type: 'update' },
            { id: 4, user: 'Alice Chen', action: 'merged PR #24: NFT Gallery', time: '5 hours ago', type: 'merge' },
        ]
    },
    2: {
        name: 'DAO Voting Tool',
        status: 'Active',
        budget: '$8,500',
        spent: '$3,400',
        progress: 40,
        dueDate: 'Mar 15, 2026',
        startDate: 'Feb 1, 2026',
        description: 'Decentralized voting platform for DAO governance with on-chain proposals.',
        team: [
            { id: 2, name: 'Bob Kumar', role: 'Blockchain', avatar: '👨‍💻', hoursSpent: 28, commits: 22, codeQuality: 92, lastOnline: '1 hour ago', status: 'away' },
            { id: 4, name: 'Diana Patel', role: 'AI/ML', avatar: '🧠', hoursSpent: 18, commits: 12, codeQuality: 95, lastOnline: '30 min ago', status: 'online' },
        ],
        tasks: [
            { id: 1, title: 'Governance Contract', status: 'In Progress', assignee: 'Bob Kumar', hours: 20 },
            { id: 2, title: 'Voting Algorithm', status: 'In Progress', assignee: 'Diana Patel', hours: 14 },
            { id: 3, title: 'Frontend Dashboard', status: 'Pending', assignee: 'Bob Kumar', hours: 0 },
        ],
        activity: [
            { id: 1, user: 'Diana Patel', action: 'implemented quadratic voting', time: '30 min ago', type: 'commit' },
            { id: 2, user: 'Bob Kumar', action: 'added proposal creation', time: '2 hours ago', type: 'commit' },
        ]
    },
    3: {
        name: 'DeFi Dashboard',
        status: 'Completed',
        budget: '$12,000',
        spent: '$12,000',
        progress: 100,
        dueDate: 'Feb 1, 2026',
        startDate: 'Dec 15, 2025',
        description: 'Analytics dashboard for tracking DeFi portfolio performance.',
        team: [
            { id: 1, name: 'Alice Chen', role: 'Full-Stack', avatar: '👩‍💻', hoursSpent: 56, commits: 45, codeQuality: 93, lastOnline: '2 min ago', status: 'online' },
            { id: 3, name: 'Charlie Park', role: 'UI/UX', avatar: '🎨', hoursSpent: 32, commits: 20, codeQuality: 90, lastOnline: '3 hours ago', status: 'offline' },
            { id: 5, name: 'Ethan Lee', role: 'DevOps', avatar: '⚙️', hoursSpent: 20, commits: 18, codeQuality: 96, lastOnline: '1 day ago', status: 'offline' },
        ],
        tasks: [
            { id: 1, title: 'Dashboard UI', status: 'Completed', assignee: 'Alice Chen', hours: 28 },
            { id: 2, title: 'Chart Components', status: 'Completed', assignee: 'Charlie Park', hours: 16 },
            { id: 3, title: 'API Integration', status: 'Completed', assignee: 'Alice Chen', hours: 20 },
            { id: 4, title: 'Deployment', status: 'Completed', assignee: 'Ethan Lee', hours: 12 },
        ],
        activity: [
            { id: 1, user: 'Ethan Lee', action: 'deployed to production', time: '1 week ago', type: 'deploy' },
            { id: 2, user: 'Alice Chen', action: 'final QA passed', time: '1 week ago', type: 'update' },
        ]
    },
    4: {
        name: 'Mobile Wallet App',
        status: 'Pending',
        budget: '$6,000',
        spent: '$0',
        progress: 0,
        dueDate: 'Mar 20, 2026',
        startDate: 'Feb 15, 2026',
        description: 'Cross-platform mobile wallet for crypto asset management.',
        team: [
            { id: 2, name: 'Bob Kumar', role: 'Blockchain', avatar: '👨‍💻', hoursSpent: 0, commits: 0, codeQuality: 0, lastOnline: '1 hour ago', status: 'away' },
        ],
        tasks: [
            { id: 1, title: 'Project Setup', status: 'Pending', assignee: 'Bob Kumar', hours: 0 },
            { id: 2, title: 'Wallet Core', status: 'Pending', assignee: 'Bob Kumar', hours: 0 },
        ],
        activity: []
    }
};

const ProjectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const project = projectsData[id];

    if (!project) {
        return (
            <div style={{ minHeight: '100vh', background: '#fbf7ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Jost', sans-serif" }}>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ color: '#2d2a26', marginBottom: '16px' }}>Project not found</h2>
                    <button onClick={() => navigate('/dashboard')} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#a9927d', color: 'white', cursor: 'pointer' }}>
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'Active': case 'In Progress': case 'online': return { bg: 'rgba(22, 163, 74, 0.1)', text: '#16a34a', dot: '#16a34a' };
            case 'Completed': return { bg: 'rgba(169, 146, 125, 0.15)', text: '#5e503f', dot: '#5e503f' };
            case 'Pending': case 'away': return { bg: 'rgba(234, 88, 12, 0.1)', text: '#ea580c', dot: '#ea580c' };
            case 'offline': return { bg: 'rgba(120, 113, 108, 0.1)', text: '#78716c', dot: '#78716c' };
            default: return { bg: '#f5f5f4', text: '#78716c', dot: '#78716c' };
        }
    };

    const totalHours = project.team.reduce((sum, m) => sum + m.hoursSpent, 0);
    const totalCommits = project.team.reduce((sum, m) => sum + m.commits, 0);
    const avgQuality = Math.round(project.team.filter(m => m.codeQuality > 0).reduce((sum, m) => sum + m.codeQuality, 0) / project.team.filter(m => m.codeQuality > 0).length) || 0;

    return (
        <div style={{ minHeight: '100vh', background: '#fbf7ef', fontFamily: "'Jost', sans-serif" }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Jost:wght@300;400;500;600&display=swap');`}</style>

            {/* Header */}
            <div style={{ background: 'white', borderBottom: '1px solid rgba(169, 146, 125, 0.15)', padding: '20px 32px' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#a9927d', fontSize: '14px', cursor: 'pointer', marginBottom: '12px' }}>
                        <ArrowLeft size={16} /> Back to Dashboard
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: '500', color: '#2d2a26', margin: 0 }}>{project.name}</h1>
                                <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', background: getStatusColor(project.status).bg, color: getStatusColor(project.status).text, fontWeight: '500' }}>{project.status}</span>
                            </div>
                            <p style={{ fontSize: '14px', color: '#5e503f', margin: '8px 0 0', maxWidth: '600px' }}>{project.description}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '24px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{project.budget}</p>
                            <p style={{ fontSize: '12px', color: '#a9927d', margin: '4px 0 0' }}>Spent: {project.spent}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 32px' }}>
                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                    {[
                        { label: 'Total Hours', value: totalHours, icon: Clock, suffix: 'h' },
                        { label: 'Total Commits', value: totalCommits, icon: GitCommit },
                        { label: 'Avg Code Quality', value: avgQuality, icon: Code2, suffix: '%' },
                        { label: 'Progress', value: project.progress, icon: TrendingUp, suffix: '%' },
                    ].map((stat, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid rgba(169, 146, 125, 0.15)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                <stat.icon size={18} style={{ color: '#a9927d' }} />
                                <span style={{ fontSize: '13px', color: '#5e503f' }}>{stat.label}</span>
                            </div>
                            <p style={{ fontSize: '24px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{stat.value}{stat.suffix || ''}</p>
                        </motion.div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
                    {/* Left Column */}
                    <div>
                        {/* Team Analytics */}
                        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid rgba(169, 146, 125, 0.15)', marginBottom: '20px' }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(169, 146, 125, 0.1)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>Team Performance</h3>
                            </div>
                            <div style={{ padding: '12px 0' }}>
                                {project.team.map((member, i) => {
                                    const statusColor = getStatusColor(member.status);
                                    return (
                                        <div key={member.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < project.team.length - 1 ? '1px solid rgba(169, 146, 125, 0.08)' : 'none' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '180px' }}>
                                                <div style={{ position: 'relative' }}>
                                                    <span style={{ fontSize: '28px' }}>{member.avatar}</span>
                                                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', borderRadius: '50%', background: statusColor.dot, border: '2px solid white' }} />
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{member.name}</p>
                                                    <p style={{ fontSize: '11px', color: '#a9927d', margin: '2px 0 0' }}>{member.role}</p>
                                                </div>
                                            </div>
                                            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', textAlign: 'center' }}>
                                                <div>
                                                    <p style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{member.hoursSpent}h</p>
                                                    <p style={{ fontSize: '10px', color: '#a9927d', margin: '2px 0 0' }}>Time</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{member.commits}</p>
                                                    <p style={{ fontSize: '10px', color: '#a9927d', margin: '2px 0 0' }}>Commits</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '16px', fontWeight: '600', color: member.codeQuality >= 90 ? '#16a34a' : member.codeQuality >= 80 ? '#ea580c' : '#78716c', margin: 0 }}>{member.codeQuality || '-'}%</p>
                                                    <p style={{ fontSize: '10px', color: '#a9927d', margin: '2px 0 0' }}>Quality</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '12px', color: '#5e503f', margin: 0 }}>{member.lastOnline}</p>
                                                    <p style={{ fontSize: '10px', color: '#a9927d', margin: '2px 0 0' }}>Last Online</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Tasks */}
                        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid rgba(169, 146, 125, 0.15)' }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(169, 146, 125, 0.1)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>Tasks</h3>
                            </div>
                            <div style={{ padding: '8px 0' }}>
                                {project.tasks.map((task, i) => {
                                    const statusColor = getStatusColor(task.status);
                                    return (
                                        <div key={task.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: i < project.tasks.length - 1 ? '1px solid rgba(169, 146, 125, 0.08)' : 'none' }}>
                                            {task.status === 'Completed' ? <CheckCircle2 size={16} style={{ color: '#16a34a', marginRight: '12px' }} /> : <Circle size={16} style={{ color: '#a9927d', marginRight: '12px' }} />}
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontSize: '14px', fontWeight: '500', color: '#2d2a26', margin: 0 }}>{task.title}</p>
                                                <p style={{ fontSize: '11px', color: '#a9927d', margin: '2px 0 0' }}>{task.assignee} • {task.hours}h</p>
                                            </div>
                                            <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', background: statusColor.bg, color: statusColor.text, fontWeight: '500' }}>{task.status}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Activity */}
                    <div style={{ background: 'white', borderRadius: '14px', border: '1px solid rgba(169, 146, 125, 0.15)', height: 'fit-content' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(169, 146, 125, 0.1)' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>Recent Activity</h3>
                        </div>
                        <div style={{ padding: '12px 0' }}>
                            {project.activity.length > 0 ? project.activity.map((item, i) => (
                                <div key={item.id} style={{ padding: '12px 20px', borderBottom: i < project.activity.length - 1 ? '1px solid rgba(169, 146, 125, 0.08)' : 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                        <Activity size={14} style={{ color: '#a9927d', marginTop: '2px' }} />
                                        <div>
                                            <p style={{ fontSize: '13px', color: '#2d2a26', margin: 0 }}>
                                                <span style={{ fontWeight: '600' }}>{item.user}</span> {item.action}
                                            </p>
                                            <p style={{ fontSize: '11px', color: '#a9927d', margin: '4px 0 0' }}>{item.time}</p>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <p style={{ padding: '20px', textAlign: 'center', color: '#a9927d', fontSize: '13px' }}>No activity yet</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetail;
