import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    LayoutDashboard, FolderGit2, Users, Wallet, TrendingUp,
    Clock, CheckCircle2, AlertCircle, ArrowUpRight, MoreHorizontal,
    Star, DollarSign, Calendar, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// Mock data
const stats = [
    { label: 'Total Projects', value: 12, icon: FolderGit2, change: '+3 this month', color: '#a9927d' },
    { label: 'Active Team', value: 8, icon: Users, change: '2 pending', color: '#5e503f' },
    { label: 'Pending Payments', value: '$4,250', icon: Wallet, change: '3 invoices', color: '#dc2626' },
    { label: 'Total Revenue', value: '$28,400', icon: TrendingUp, change: '+12% vs last', color: '#16a34a' },
];

const projects = [
    { id: 1, name: 'NFT Marketplace', status: 'Active', team: ['👩‍💻', '👨‍💻', '🎨'], budget: '$15,000', progress: 65, dueDate: 'Feb 28' },
    { id: 2, name: 'DAO Voting Tool', status: 'Active', team: ['👨‍💻', '🧠'], budget: '$8,500', progress: 40, dueDate: 'Mar 15' },
    { id: 3, name: 'DeFi Dashboard', status: 'Completed', team: ['👩‍💻', '🎨', '⚙️'], budget: '$12,000', progress: 100, dueDate: 'Feb 1' },
    { id: 4, name: 'Mobile Wallet App', status: 'Pending', team: ['👨‍💻'], budget: '$6,000', progress: 0, dueDate: 'Mar 20' },
];

const teamMembers = [
    { id: 1, name: 'Alice Chen', role: 'Full-Stack', avatar: '👩‍💻', rating: 4.9, projects: 5, earned: '$4,200' },
    { id: 2, name: 'Bob Kumar', role: 'Blockchain', avatar: '👨‍💻', rating: 4.8, projects: 4, earned: '$3,800' },
    { id: 3, name: 'Charlie Park', role: 'UI/UX', avatar: '🎨', rating: 4.7, projects: 6, earned: '$2,900' },
    { id: 4, name: 'Diana Patel', role: 'AI/ML', avatar: '🧠', rating: 5.0, projects: 3, earned: '$5,100' },
];

const payments = [
    { id: 1, project: 'NFT Marketplace', amount: '$2,500', status: 'Pending', date: 'Feb 10', recipient: 'Alice Chen' },
    { id: 2, project: 'DAO Voting Tool', amount: '$1,750', status: 'Pending', date: 'Feb 12', recipient: 'Bob Kumar' },
    { id: 3, project: 'DeFi Dashboard', amount: '$3,000', status: 'Completed', date: 'Feb 1', recipient: 'Charlie Park' },
];

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const navigate = useNavigate();
    const { logout } = useAuth();
    const handleLogout = async () => {
        await logout();
        navigate("/login");
    }
    const getStatusColor = (status) => {
        switch (status) {
            case 'Active': return { bg: 'rgba(22, 163, 74, 0.1)', text: '#16a34a' };
            case 'Completed': return { bg: 'rgba(169, 146, 125, 0.15)', text: '#5e503f' };
            case 'Pending': return { bg: 'rgba(234, 88, 12, 0.1)', text: '#ea580c' };
            default: return { bg: '#f5f5f4', text: '#78716c' };
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#fbf7ef', fontFamily: "'Jost', 'Inter', sans-serif", display: 'flex' }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Jost:wght@300;400;500;600&display=swap');`}</style>

            {/* Sidebar */}
            <div style={{ width: '240px', background: 'white', borderRight: '1px solid rgba(169, 146, 125, 0.15)', padding: '24px 0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '0 20px', marginBottom: '32px' }}>
                    <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>Senate</h1>
                    <p style={{ fontSize: '12px', color: '#a9927d', margin: '4px 0 0' }}>Admin Dashboard</p>
                </div>

                <nav style={{ flex: 1 }}>
                    {[
                        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                        { id: 'projects', label: 'Projects', icon: FolderGit2 },
                        { id: 'team', label: 'Team', icon: Users },
                        { id: 'payments', label: 'Payments', icon: Wallet },
                    ].map(item => (
                        <button key={item.id} onClick={() => setActiveTab(item.id)}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '12px 20px', border: 'none', background: activeTab === item.id ? 'rgba(169, 146, 125, 0.1)' : 'transparent',
                                color: activeTab === item.id ? '#2d2a26' : '#5e503f', fontSize: '14px', fontWeight: activeTab === item.id ? '600' : '400',
                                cursor: 'pointer', textAlign: 'left', borderLeft: activeTab === item.id ? '3px solid #a9927d' : '3px solid transparent'
                            }}>
                            <item.icon size={18} /> {item.label}
                        </button>
                    ))}
                </nav>

                <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(169, 146, 125, 0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#a9927d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: '600' }}>A</div>
                        <div>
                            <p style={{ fontSize: '14px', fontWeight: '500', color: '#2d2a26', margin: 0 }}>Admin User</p>
                            <p style={{ fontSize: '12px', color: '#a9927d', margin: 0 }}>Pro Plan</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: '500', color: '#2d2a26', margin: 0 }}>
                            {activeTab === 'overview' ? 'Dashboard Overview' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                        </h2>
                        <p style={{ fontSize: '14px', color: '#a9927d', margin: '4px 0 0' }}>
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            border: '1px solid rgba(169, 146, 125, 0.4)',
                            background: 'white',
                            color: '#5e503f',
                            borderRadius: '10px',
                            padding: '8px 14px',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        Logout
                    </button>
                </div>

                {/* Quick Stats */}
                {(activeTab === 'overview') && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
                        {stats.map((stat, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                style={{ background: 'white', borderRadius: '14px', padding: '20px', border: '1px solid rgba(169, 146, 125, 0.15)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <stat.icon size={20} style={{ color: stat.color }} />
                                    </div>
                                    <ArrowUpRight size={16} style={{ color: '#a9927d' }} />
                                </div>
                                <p style={{ fontSize: '26px', fontWeight: '600', color: '#2d2a26', margin: '0 0 4px' }}>{stat.value}</p>
                                <p style={{ fontSize: '13px', color: '#5e503f', margin: 0 }}>{stat.label}</p>
                                <p style={{ fontSize: '11px', color: '#a9927d', margin: '4px 0 0' }}>{stat.change}</p>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Projects Section */}
                {(activeTab === 'overview' || activeTab === 'projects') && (
                    <div style={{ background: 'white', borderRadius: '14px', border: '1px solid rgba(169, 146, 125, 0.15)', marginBottom: '28px' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(169, 146, 125, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>Projects</h3>
                            <button style={{ fontSize: '13px', color: '#a9927d', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                View all <ChevronRight size={14} />
                            </button>
                        </div>
                        <div style={{ padding: '8px 0' }}>
                            {projects.map((project, i) => {
                                const statusColor = getStatusColor(project.status);
                                return (
                                    <div key={project.id} onClick={() => navigate(`/project/${project.id}`)} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < projects.length - 1 ? '1px solid rgba(169, 146, 125, 0.08)' : 'none', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(169, 146, 125, 0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: '14px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{project.name}</p>
                                            <p style={{ fontSize: '12px', color: '#a9927d', margin: '2px 0 0' }}>Due: {project.dueDate}</p>
                                        </div>
                                        <div style={{ display: 'flex', marginRight: '20px' }}>
                                            {project.team.map((t, j) => (
                                                <span key={j} style={{ fontSize: '16px', marginLeft: j > 0 ? '-6px' : 0 }}>{t}</span>
                                            ))}
                                        </div>
                                        <div style={{ width: '100px', marginRight: '20px' }}>
                                            <div style={{ height: '6px', background: 'rgba(169, 146, 125, 0.15)', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ width: `${project.progress}%`, height: '100%', background: project.progress === 100 ? '#16a34a' : '#a9927d', borderRadius: '3px' }} />
                                            </div>
                                            <p style={{ fontSize: '11px', color: '#a9927d', margin: '4px 0 0', textAlign: 'right' }}>{project.progress}%</p>
                                        </div>
                                        <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', background: statusColor.bg, color: statusColor.text, fontWeight: '500' }}>{project.status}</span>
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#2d2a26', marginLeft: '20px', width: '80px', textAlign: 'right' }}>{project.budget}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Team Section */}
                {(activeTab === 'overview' || activeTab === 'team') && (
                    <div style={{ marginBottom: '28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>Team Performance</h3>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                            {teamMembers.map((member, i) => (
                                <motion.div key={member.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                    style={{ background: 'white', borderRadius: '14px', padding: '18px', border: '1px solid rgba(169, 146, 125, 0.15)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                                        <span style={{ fontSize: '32px' }}>{member.avatar}</span>
                                        <div>
                                            <p style={{ fontSize: '14px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{member.name}</p>
                                            <p style={{ fontSize: '12px', color: '#a9927d', margin: 0 }}>{member.role}</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#5e503f' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={12} style={{ color: '#f59e0b' }} /> {member.rating}</span>
                                        <span>{member.projects} projects</span>
                                        <span style={{ fontWeight: '600', color: '#16a34a' }}>{member.earned}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Payments Section */}
                {(activeTab === 'overview' || activeTab === 'payments') && (
                    <div style={{ background: 'white', borderRadius: '14px', border: '1px solid rgba(169, 146, 125, 0.15)' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(169, 146, 125, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>Recent Payments</h3>
                        </div>
                        <div style={{ padding: '8px 0' }}>
                            {payments.map((payment, i) => {
                                const statusColor = getStatusColor(payment.status);
                                return (
                                    <div key={payment.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < payments.length - 1 ? '1px solid rgba(169, 146, 125, 0.08)' : 'none' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(169, 146, 125, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '14px' }}>
                                            <DollarSign size={18} style={{ color: '#a9927d' }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: '14px', fontWeight: '500', color: '#2d2a26', margin: 0 }}>{payment.project}</p>
                                            <p style={{ fontSize: '12px', color: '#a9927d', margin: '2px 0 0' }}>To: {payment.recipient}</p>
                                        </div>
                                        <span style={{ fontSize: '12px', color: '#a9927d', marginRight: '20px' }}>{payment.date}</span>
                                        <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', background: statusColor.bg, color: statusColor.text, fontWeight: '500', marginRight: '16px' }}>{payment.status}</span>
                                        <span style={{ fontSize: '15px', fontWeight: '600', color: '#2d2a26' }}>{payment.amount}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
