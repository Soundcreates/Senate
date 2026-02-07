import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Clock, GitCommit, AlertTriangle, CheckCircle2, Calendar,
    DollarSign, Star, TrendingUp, Code2, ArrowRight, Bell,
    FolderGit2, ExternalLink, Circle
} from 'lucide-react';

// Mock user data
const userData = {
    name: 'Alice Chen',
    role: 'Full-Stack Developer',
    avatar: '👩‍💻',
    rating: 4.9,
    completedProjects: 12,
    totalEarned: '$18,400',
    pendingAmount: '$2,500',
    level: 'Senior',
};

// Wakatime mock data (last 7 days)
const wakatimeData = [
    { day: 'Mon', hours: 6.5 },
    { day: 'Tue', hours: 7.2 },
    { day: 'Wed', hours: 5.8 },
    { day: 'Thu', hours: 8.1 },
    { day: 'Fri', hours: 6.9 },
    { day: 'Sat', hours: 3.2 },
    { day: 'Sun', hours: 4.5 },
];

// Recent commits
const commits = [
    { id: 1, message: 'feat: add NFT gallery component', repo: 'nft-marketplace', branch: 'main', time: '2 hours ago' },
    { id: 2, message: 'fix: wallet connection issue on mobile', repo: 'nft-marketplace', branch: 'hotfix/wallet', time: '5 hours ago' },
    { id: 3, message: 'refactor: optimize image loading', repo: 'nft-marketplace', branch: 'main', time: '1 day ago' },
    { id: 4, message: 'docs: update API documentation', repo: 'defi-dashboard', branch: 'main', time: '2 days ago' },
];

// Code quality
const codeQuality = {
    issues: 3,
    warnings: 8,
    maintainability: 87,
    testCoverage: 72,
};

// Upcoming deadlines
const deadlines = [
    { id: 1, project: 'NFT Marketplace', task: 'Frontend UI Implementation', due: 'Feb 28', daysLeft: 21, status: 'On Track' },
    { id: 2, project: 'NFT Marketplace', task: 'Testing & QA', due: 'Mar 5', daysLeft: 26, status: 'Pending' },
    { id: 3, project: 'DAO Voting Tool', task: 'Dashboard Integration', due: 'Mar 15', daysLeft: 36, status: 'Not Started' },
];

// Pending payments
const pendingPayments = [
    { id: 1, project: 'NFT Marketplace', amount: '$2,500', expectedDate: 'Feb 28', status: 'In Escrow' },
];

// My active projects with detailed info
const myProjects = [
    {
        id: 1,
        name: 'NFT Marketplace',
        role: 'Lead Developer',
        status: 'Active',
        myProgress: 65,
        tasksCompleted: 3,
        tasksPending: 2,
        myCommits: 32,
        myHours: 48,
        codeQuality: 94,
        linesAdded: 2840,
        linesRemoved: 620,
        lastCommit: '2 hours ago',
        pendingAmount: '$2,500',
        tasks: [
            { title: 'Frontend UI Implementation', status: 'In Progress' },
            { title: 'Testing & QA', status: 'Pending' },
        ]
    },
    {
        id: 3,
        name: 'DeFi Dashboard',
        role: 'Full-Stack Dev',
        status: 'Completed',
        myProgress: 100,
        tasksCompleted: 4,
        tasksPending: 0,
        myCommits: 45,
        myHours: 56,
        codeQuality: 93,
        linesAdded: 3200,
        linesRemoved: 450,
        lastCommit: '1 week ago',
        pendingAmount: '$0',
        tasks: []
    }
];

const UserDashboard = () => {
    const navigate = useNavigate();
    const maxHours = Math.max(...wakatimeData.map(d => d.hours));
    const totalHours = wakatimeData.reduce((sum, d) => sum + d.hours, 0);

    return (
        <div style={{ minHeight: '100vh', background: '#fbf7ef', fontFamily: "'Jost', sans-serif" }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Jost:wght@300;400;500;600&display=swap');`}</style>

            {/* Header */}
            <div style={{ background: 'white', borderBottom: '1px solid rgba(169, 146, 125, 0.15)', padding: '16px 32px' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: '500', color: '#2d2a26', margin: 0 }}>My Dashboard</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid rgba(169, 146, 125, 0.2)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Bell size={18} style={{ color: '#a9927d' }} />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '28px' }}>{userData.avatar}</span>
                            <div>
                                <p style={{ fontSize: '14px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{userData.name}</p>
                                <p style={{ fontSize: '12px', color: '#a9927d', margin: 0 }}>{userData.role}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 32px' }}>
                {/* Top Row: Profile + Quick Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', marginBottom: '20px' }}>
                    {/* Profile Card */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid rgba(169, 146, 125, 0.15)' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ fontSize: '56px', marginBottom: '12px' }}>{userData.avatar}</div>
                            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: '500', color: '#2d2a26', margin: '0 0 4px' }}>{userData.name}</h2>
                            <p style={{ fontSize: '14px', color: '#a9927d', margin: 0 }}>{userData.role}</p>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
                                <Star size={14} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                                <span style={{ fontSize: '14px', fontWeight: '600', color: '#2d2a26' }}>{userData.rating}</span>
                                <span style={{ fontSize: '12px', color: '#a9927d' }}>• {userData.level}</span>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            <div style={{ background: '#fbf7ef', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                                <p style={{ fontSize: '20px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{userData.completedProjects}</p>
                                <p style={{ fontSize: '11px', color: '#a9927d', margin: '4px 0 0' }}>Projects</p>
                            </div>
                            <div style={{ background: '#fbf7ef', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                                <p style={{ fontSize: '20px', fontWeight: '600', color: '#16a34a', margin: 0 }}>{userData.totalEarned}</p>
                                <p style={{ fontSize: '11px', color: '#a9927d', margin: '4px 0 0' }}>Earned</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Wakatime Chart */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                        style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid rgba(169, 146, 125, 0.15)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>Coding Activity</h3>
                                <p style={{ fontSize: '12px', color: '#a9927d', margin: '4px 0 0' }}>Last 7 days • {totalHours.toFixed(1)}h total</p>
                            </div>
                            <Clock size={20} style={{ color: '#a9927d' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '140px' }}>
                            {wakatimeData.map((d, i) => (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${(d.hours / maxHours) * 100}%` }}
                                        transition={{ delay: i * 0.05, duration: 0.3 }}
                                        style={{ width: '100%', background: 'linear-gradient(180deg, #a9927d 0%, #5e503f 100%)', borderRadius: '6px 6px 0 0', minHeight: '8px' }}
                                    />
                                    <p style={{ fontSize: '11px', color: '#5e503f', margin: '8px 0 0', fontWeight: '500' }}>{d.hours}h</p>
                                    <p style={{ fontSize: '10px', color: '#a9927d', margin: '2px 0 0' }}>{d.day}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* My Projects Section */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
                    style={{ background: 'white', borderRadius: '16px', border: '1px solid rgba(169, 146, 125, 0.15)', marginBottom: '20px' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(169, 146, 125, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>My Projects</h3>
                        <FolderGit2 size={18} style={{ color: '#a9927d' }} />
                    </div>
                    <div style={{ padding: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                            {myProjects.map((project) => (
                                <div key={project.id} onClick={() => navigate(`/project/${project.id}`)}
                                    style={{ background: '#fbf7ef', borderRadius: '14px', padding: '18px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(169, 146, 125, 0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                                    {/* Header */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{project.name}</h4>
                                                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: project.status === 'Active' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(169, 146, 125, 0.15)', color: project.status === 'Active' ? '#16a34a' : '#5e503f', fontWeight: '500' }}>{project.status}</span>
                                            </div>
                                            <p style={{ fontSize: '12px', color: '#a9927d', margin: '4px 0 0' }}>{project.role}</p>
                                        </div>
                                        <ExternalLink size={16} style={{ color: '#a9927d' }} />
                                    </div>

                                    {/* Progress Bar */}
                                    <div style={{ marginBottom: '14px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '11px', color: '#5e503f' }}>My Progress</span>
                                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#2d2a26' }}>{project.myProgress}%</span>
                                        </div>
                                        <div style={{ height: '6px', background: 'rgba(169, 146, 125, 0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ width: `${project.myProgress}%`, height: '100%', background: project.myProgress === 100 ? '#16a34a' : 'linear-gradient(90deg, #a9927d, #5e503f)', borderRadius: '3px' }} />
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{project.myCommits}</p>
                                            <p style={{ fontSize: '9px', color: '#a9927d', margin: '2px 0 0' }}>Commits</p>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{project.myHours}h</p>
                                            <p style={{ fontSize: '9px', color: '#a9927d', margin: '2px 0 0' }}>Hours</p>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ fontSize: '16px', fontWeight: '600', color: project.codeQuality >= 90 ? '#16a34a' : '#ea580c', margin: 0 }}>{project.codeQuality}%</p>
                                            <p style={{ fontSize: '9px', color: '#a9927d', margin: '2px 0 0' }}>Quality</p>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a', margin: 0 }}>+{project.linesAdded}</p>
                                            <p style={{ fontSize: '9px', color: '#a9927d', margin: '2px 0 0' }}>Lines</p>
                                        </div>
                                    </div>

                                    {/* Tasks */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid rgba(169, 146, 125, 0.15)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#16a34a' }}>
                                                <CheckCircle2 size={12} /> {project.tasksCompleted} done
                                            </span>
                                            {project.tasksPending > 0 && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#ea580c' }}>
                                                    <Circle size={12} /> {project.tasksPending} pending
                                                </span>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '11px', color: '#a9927d' }}>Last: {project.lastCommit}</span>
                                    </div>

                                    {/* Pending Tasks (if any) */}
                                    {project.tasks.length > 0 && (
                                        <div style={{ marginTop: '10px', padding: '10px', background: 'white', borderRadius: '8px' }}>
                                            <p style={{ fontSize: '11px', fontWeight: '600', color: '#5e503f', margin: '0 0 8px' }}>Pending Tasks:</p>
                                            {project.tasks.map((task, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: i < project.tasks.length - 1 ? '6px' : 0 }}>
                                                    <Circle size={8} style={{ color: task.status === 'In Progress' ? '#ea580c' : '#a9927d' }} />
                                                    <span style={{ fontSize: '12px', color: '#2d2a26' }}>{task.title}</span>
                                                    <span style={{ fontSize: '10px', color: '#a9927d', marginLeft: 'auto' }}>{task.status}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Middle Row: Commits + Code Quality */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', marginBottom: '20px' }}>
                    {/* Commit History */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        style={{ background: 'white', borderRadius: '16px', border: '1px solid rgba(169, 146, 125, 0.15)' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(169, 146, 125, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>Recent Commits</h3>
                            <GitCommit size={18} style={{ color: '#a9927d' }} />
                        </div>
                        <div style={{ padding: '8px 0' }}>
                            {commits.map((commit, i) => (
                                <div key={commit.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 20px', borderBottom: i < commits.length - 1 ? '1px solid rgba(169, 146, 125, 0.08)' : 'none' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a9927d', marginTop: '6px', flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '14px', color: '#2d2a26', margin: 0, fontWeight: '500' }}>{commit.message}</p>
                                        <p style={{ fontSize: '12px', color: '#a9927d', margin: '4px 0 0' }}>
                                            <span style={{ color: '#5e503f' }}>{commit.repo}</span> • {commit.branch} • {commit.time}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Code Quality */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                        style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid rgba(169, 146, 125, 0.15)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>Code Quality</h3>
                            <Code2 size={18} style={{ color: '#a9927d' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            <div style={{ background: 'rgba(220, 38, 38, 0.08)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                                <p style={{ fontSize: '24px', fontWeight: '600', color: '#dc2626', margin: 0 }}>{codeQuality.issues}</p>
                                <p style={{ fontSize: '11px', color: '#dc2626', margin: '4px 0 0' }}>Issues</p>
                            </div>
                            <div style={{ background: 'rgba(234, 88, 12, 0.08)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                                <p style={{ fontSize: '24px', fontWeight: '600', color: '#ea580c', margin: 0 }}>{codeQuality.warnings}</p>
                                <p style={{ fontSize: '11px', color: '#ea580c', margin: '4px 0 0' }}>Warnings</p>
                            </div>
                            <div style={{ background: 'rgba(22, 163, 74, 0.08)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                                <p style={{ fontSize: '24px', fontWeight: '600', color: '#16a34a', margin: 0 }}>{codeQuality.maintainability}%</p>
                                <p style={{ fontSize: '11px', color: '#16a34a', margin: '4px 0 0' }}>Maintainability</p>
                            </div>
                            <div style={{ background: 'rgba(169, 146, 125, 0.1)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                                <p style={{ fontSize: '24px', fontWeight: '600', color: '#5e503f', margin: 0 }}>{codeQuality.testCoverage}%</p>
                                <p style={{ fontSize: '11px', color: '#5e503f', margin: '4px 0 0' }}>Test Coverage</p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Bottom Row: Deadlines + Payments */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>
                    {/* Upcoming Deadlines */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        style={{ background: 'white', borderRadius: '16px', border: '1px solid rgba(169, 146, 125, 0.15)' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(169, 146, 125, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>Upcoming Deadlines</h3>
                            <Calendar size={18} style={{ color: '#a9927d' }} />
                        </div>
                        <div style={{ padding: '8px 0' }}>
                            {deadlines.map((item, i) => (
                                <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < deadlines.length - 1 ? '1px solid rgba(169, 146, 125, 0.08)' : 'none' }}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '14px', fontWeight: '500', color: '#2d2a26', margin: 0 }}>{item.task}</p>
                                        <p style={{ fontSize: '12px', color: '#a9927d', margin: '2px 0 0' }}>{item.project}</p>
                                    </div>
                                    <div style={{ textAlign: 'right', marginRight: '16px' }}>
                                        <p style={{ fontSize: '13px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{item.due}</p>
                                        <p style={{ fontSize: '11px', color: item.daysLeft <= 7 ? '#dc2626' : '#a9927d', margin: '2px 0 0' }}>{item.daysLeft} days left</p>
                                    </div>
                                    <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', background: item.status === 'On Track' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(169, 146, 125, 0.1)', color: item.status === 'On Track' ? '#16a34a' : '#5e503f', fontWeight: '500' }}>{item.status}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Pending Payments */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                        style={{ background: 'white', borderRadius: '16px', border: '1px solid rgba(169, 146, 125, 0.15)' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(169, 146, 125, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>Pending Payments</h3>
                            <DollarSign size={18} style={{ color: '#a9927d' }} />
                        </div>
                        <div style={{ padding: '20px' }}>
                            <div style={{ background: 'linear-gradient(135deg, #a9927d 0%, #5e503f 100%)', borderRadius: '14px', padding: '20px', color: 'white', marginBottom: '16px' }}>
                                <p style={{ fontSize: '12px', opacity: 0.8, margin: '0 0 4px' }}>Total Pending</p>
                                <p style={{ fontSize: '32px', fontWeight: '600', margin: 0 }}>{userData.pendingAmount}</p>
                            </div>
                            {pendingPayments.map(payment => (
                                <div key={payment.id} style={{ display: 'flex', alignItems: 'center', padding: '12px', background: '#fbf7ef', borderRadius: '10px' }}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '14px', fontWeight: '500', color: '#2d2a26', margin: 0 }}>{payment.project}</p>
                                        <p style={{ fontSize: '12px', color: '#a9927d', margin: '2px 0 0' }}>Expected: {payment.expectedDate}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{payment.amount}</p>
                                        <p style={{ fontSize: '11px', color: '#ea580c', margin: '2px 0 0' }}>{payment.status}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;
