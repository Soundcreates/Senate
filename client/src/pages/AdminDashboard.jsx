import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    LayoutDashboard, FolderGit2, Users, Wallet, TrendingUp,
    Clock, CheckCircle2, AlertCircle, ArrowUpRight, MoreHorizontal,
    Star, DollarSign, Calendar, ChevronRight, Shield, ExternalLink, Loader2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchAdminDashboard } from '../Apis/adminDashboardApi';
import { useWalletContext } from '../context/WalletContext';
import { getAllEscrows, getEscrowData, MilestoneStatusLabels, MilestoneStatusColors } from '../Apis/escrowApi';
import { getOracleStatus } from '../Apis/oracleApi';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const navigate = useNavigate();
    const { logout, token, user } = useAuth();
    const [stats, setStats] = useState([]);
    const [projects, setProjects] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [payments, setPayments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    // Blockchain escrow state
    const { isConnected, connect: connectWallet, shortenAddress: shorten, getExplorerUrl } = useWalletContext();
    const [escrowList, setEscrowList] = useState([]);
    const [escrowDetails, setEscrowDetails] = useState({});
    const [escrowsLoading, setEscrowsLoading] = useState(false);
    const [oracleInfo, setOracleInfo] = useState(null);

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    }

    useEffect(() => {
        if (user && user.role && user.role !== 'admin') {
            navigate('/dashboard');
            return;
        }
        if (!token) {
            navigate('/login');
            return;
        }

        const loadDashboard = async () => {
            setIsLoading(true);
            setLoadError(null);
            const result = await fetchAdminDashboard(token);
            if (result.ok && result.data) {
                setStats(result.data.stats || []);
                setProjects(result.data.projects || []);
                setTeamMembers(result.data.teamMembers || []);
                setPayments(result.data.payments || []);
            } else {
                setLoadError(result.error || 'admin_dashboard_failed');
            }
            setIsLoading(false);
        };

        loadDashboard();
    }, [navigate, token, user]);

    // Load on-chain escrow data when escrows tab is selected
    useEffect(() => {
        if (activeTab !== 'escrows') return;
        let cancelled = false;
        const loadEscrows = async () => {
            setEscrowsLoading(true);
            try {
                const [addresses, oracleRes] = await Promise.all([getAllEscrows(), getOracleStatus()]);
                if (cancelled) return;
                setEscrowList(addresses || []);
                setOracleInfo(oracleRes);
                // Load details for each (max 10 for perf)
                const details = {};
                for (const addr of (addresses || []).slice(0, 10)) {
                    try {
                        details[addr] = await getEscrowData(addr);
                    } catch (_) { /* skip failed */ }
                }
                if (!cancelled) setEscrowDetails(details);
            } catch (err) {
                console.error('Escrow load failed:', err);
            } finally {
                if (!cancelled) setEscrowsLoading(false);
            }
        };
        loadEscrows();
        return () => { cancelled = true; };
    }, [activeTab]);

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
                        { id: 'escrows', label: 'Escrows', icon: Shield },
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
                                        {stat.label === 'Total Projects' && <FolderGit2 size={20} style={{ color: stat.color }} />}
                                        {stat.label === 'Active Team' && <Users size={20} style={{ color: stat.color }} />}
                                        {stat.label === 'Pending Payments' && <Wallet size={20} style={{ color: stat.color }} />}
                                        {stat.label === 'Total Revenue' && <TrendingUp size={20} style={{ color: stat.color }} />}
                                    </div>
                                    <ArrowUpRight size={16} style={{ color: '#a9927d' }} />
                                </div>
                                <p style={{ fontSize: '26px', fontWeight: '600', color: '#2d2a26', margin: '0 0 4px' }}>{stat.value}</p>
                                <p style={{ fontSize: '13px', color: '#5e503f', margin: 0 }}>{stat.label}</p>
                                <p style={{ fontSize: '11px', color: '#a9927d', margin: '4px 0 0' }}>{stat.change || '—'}</p>
                            </motion.div>
                        ))}
                    </div>
                )}

                {isLoading && (
                    <div style={{ padding: '24px 0', color: '#a9927d', fontSize: '14px' }}>Loading dashboard data...</div>
                )}

                {!isLoading && loadError && (
                    <div style={{ padding: '16px 18px', background: 'rgba(220, 38, 38, 0.08)', color: '#dc2626', borderRadius: '10px', marginBottom: '20px' }}>
                        Failed to load admin dashboard: {loadError}
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
                                            <p style={{ fontSize: '12px', color: '#a9927d', margin: '2px 0 0' }}>Due: {project.dueDate || '—'}</p>
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
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={12} style={{ color: '#f59e0b' }} /> {member.rating ?? '—'}</span>
                                        <span>{member.projects} projects</span>
                                        <span style={{ fontWeight: '600', color: '#16a34a' }}>{member.earned || '$0'}</span>
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

                {/* Escrows Section */}
                {activeTab === 'escrows' && (
                    <div>
                        {/* Oracle Status Card */}
                        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid rgba(169, 146, 125, 0.15)', padding: '20px', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Shield size={18} style={{ color: '#a9927d' }} /> Oracle Status
                            </h3>
                            {oracleInfo ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: oracleInfo.configured ? '#16a34a' : '#dc2626' }} />
                                        <span style={{ fontSize: '13px', color: '#5e503f' }}>{oracleInfo.configured ? 'Configured' : 'Not Configured'}</span>
                                    </div>
                                    {oracleInfo.oracle && (
                                        <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#a9927d' }}>{oracleInfo.oracle}</span>
                                    )}
                                </div>
                            ) : (
                                <span style={{ fontSize: '13px', color: '#a9927d' }}>Loading...</span>
                            )}
                        </div>

                        {/* Escrow Count + List */}
                        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid rgba(169, 146, 125, 0.15)' }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(169, 146, 125, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>On-Chain Escrows ({escrowList.length})</h3>
                                {!isConnected && (
                                    <button onClick={connectWallet} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(169, 146, 125, 0.3)', background: 'white', color: '#5e503f', fontSize: '12px', cursor: 'pointer' }}>
                                        Connect Wallet
                                    </button>
                                )}
                            </div>

                            {escrowsLoading ? (
                                <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#a9927d', fontSize: '13px' }}>
                                    <Loader2 size={16} className="animate-spin" /> Loading on-chain escrows...
                                </div>
                            ) : escrowList.length === 0 ? (
                                <div style={{ padding: '20px', fontSize: '13px', color: '#a9927d' }}>
                                    No escrows deployed yet.
                                </div>
                            ) : (
                                <div style={{ padding: '8px 0' }}>
                                    {escrowList.map((addr, i) => {
                                        const detail = escrowDetails[addr];
                                        const totalMilestones = detail?.milestones?.length || 0;
                                        const finalized = detail?.milestones?.filter(m => m.status === 3).length || 0;
                                        const inDispute = detail?.milestones?.filter(m => m.status === 2).length || 0;
                                        return (
                                            <div key={addr} style={{ padding: '14px 20px', borderBottom: i < escrowList.length - 1 ? '1px solid rgba(169, 146, 125, 0.08)' : 'none' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                    <a href={getExplorerUrl(addr, 'address')} target="_blank" rel="noreferrer" style={{ fontSize: '13px', fontFamily: 'monospace', color: '#5e503f', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        {shorten(addr)} <ExternalLink size={10} />
                                                    </a>
                                                    {detail && (
                                                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#2d2a26' }}>${detail.totalBudget} USDC</span>
                                                    )}
                                                </div>
                                                {detail && (
                                                    <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
                                                        <span style={{ color: '#5e503f' }}>{totalMilestones} milestones</span>
                                                        <span style={{ color: '#16a34a' }}>{finalized} finalized</span>
                                                        {inDispute > 0 && <span style={{ color: '#ea580c' }}>{inDispute} disputed</span>}
                                                        <span style={{ color: '#a9927d' }}>{detail.contributors.length} contributors</span>
                                                    </div>
                                                )}
                                                {detail?.milestones && (
                                                    <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                                                        {detail.milestones.map((ms, j) => {
                                                            const sc = MilestoneStatusColors[ms.status] || MilestoneStatusColors[0];
                                                            return (
                                                                <div key={j} title={`Milestone ${j + 1}: ${MilestoneStatusLabels[ms.status]} — $${ms.budget}`}
                                                                    style={{ flex: 1, height: '6px', borderRadius: '3px', background: sc.bg, position: 'relative' }}>
                                                                    <div style={{ width: ms.status === 3 ? '100%' : ms.status >= 1 ? '60%' : '0%', height: '100%', borderRadius: '3px', background: sc.text, opacity: 0.7 }} />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
