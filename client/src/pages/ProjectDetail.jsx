import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Clock, Circle, Calendar,
    CheckCircle2, User, TrendingUp, Loader2, DollarSign,
    Shield, AlertTriangle, ExternalLink, Wallet
} from 'lucide-react';
import { getProject } from '../Apis/projectApis';
import { getEscrowData, MilestoneStatusLabels, MilestoneStatusColors } from '../Apis/escrowApi';
import { useWalletContext } from '../context/WalletContext';
import DisputePanel from '../components/DisputePanel';
import DeployEscrowModal from '../components/DeployEscrowModal';
import { useAuth } from '../context/AuthContext';

/* ---- helpers ---- */
const getStatusColor = (status) => {
    switch (status) {
        case 'active': case 'Active': case 'In Progress': case 'online': case 'todo':
            return { bg: 'rgba(22, 163, 74, 0.1)', text: '#16a34a', dot: '#16a34a' };
        case 'completed': case 'Completed': case 'done':
            return { bg: 'rgba(169, 146, 125, 0.15)', text: '#5e503f', dot: '#5e503f' };
        case 'pending': case 'Pending': case 'away':
            return { bg: 'rgba(234, 88, 12, 0.1)', text: '#ea580c', dot: '#ea580c' };
        default:
            return { bg: '#f5f5f4', text: '#78716c', dot: '#78716c' };
    }
};

const statusLabel = (s) => {
    if (s === 'done') return 'Completed';
    if (s === 'in_progress') return 'In Progress';
    if (s === 'todo') return 'Pending';
    return s?.charAt(0).toUpperCase() + s?.slice(1) || 'Pending';
};

/* ---- component ---- */
const ProjectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [escrow, setEscrow] = useState(null);
    const [escrowLoading, setEscrowLoading] = useState(false);
    const [showDeployModal, setShowDeployModal] = useState(false);
    const { isConnected, shortenAddress: shorten, getExplorerUrl } = useWalletContext();
    const { user } = useAuth();

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            const result = await getProject(id);
            if (!mounted) return;
            if (result.ok) {
                setProject(result.project);
                // Load on-chain escrow data if linked
                if (result.project.escrowAddress) {
                    setEscrowLoading(true);
                    try {
                        const data = await getEscrowData(result.project.escrowAddress);
                        if (mounted) setEscrow(data);
                    } catch (err) {
                        console.error('Escrow load failed:', err);
                    } finally {
                        if (mounted) setEscrowLoading(false);
                    }
                }
            } else {
                setError(result.error || 'project_not_found');
            }
            setLoading(false);
        };
        load();
        return () => { mounted = false; };
    }, [id]);

    /* loading */
    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#fbf7ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Jost', sans-serif" }}>
                <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Jost:wght@300;400;500;600&display=swap');`}</style>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#a9927d' }}>
                    <Loader2 className="animate-spin" size={24} />
                    <span style={{ fontSize: '16px' }}>Loading project...</span>
                </div>
            </div>
        );
    }

    /* error / not found */
    if (error || !project) {
        return (
            <div style={{ minHeight: '100vh', background: '#fbf7ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Jost', sans-serif" }}>
                <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Jost:wght@300;400;500;600&display=swap');`}</style>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ color: '#2d2a26', marginBottom: '16px' }}>Project not found</h2>
                    <p style={{ color: '#a9927d', marginBottom: '20px', fontSize: '14px' }}>{error}</p>
                    <button onClick={() => navigate('/dashboard')} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#a9927d', color: 'white', cursor: 'pointer' }}>
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    /* derived data */
    const totalHours = (project.tasks || []).reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const totalTasks = (project.tasks || []).length;
    const completedTasks = (project.tasks || []).filter(t => t.status === 'done').length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const teamMembers = project.team || [];
    const projectStatus = getStatusColor(project.status);

    /* ---- render ---- */
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
                                <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', background: projectStatus.bg, color: projectStatus.text, fontWeight: '500' }}>{project.status}</span>
                            </div>
                            <p style={{ fontSize: '14px', color: '#5e503f', margin: '8px 0 0', maxWidth: '600px' }}>{project.description}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '24px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>${(project.budget || 0).toLocaleString()}</p>
                            <p style={{ fontSize: '12px', color: '#a9927d', margin: '4px 0 0' }}>Budget • {project.deadline || 'No deadline'}</p>
                            {!project.escrowAddress && user && project.createdBy && (user._id === project.createdBy._id || user._id === project.createdBy) && (
                                <button onClick={() => setShowDeployModal(true)} style={{ marginTop: '8px', padding: '6px 16px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #a9927d, #5e503f)', color: 'white', fontSize: '12px', fontWeight: '500', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Shield size={12} /> Deploy Escrow
                                </button>
                            )}
                            {project.escrowAddress && (
                                <a href={getExplorerUrl(project.escrowAddress, 'address')} target="_blank" rel="noreferrer" style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#16a34a', textDecoration: 'none' }}>
                                    <CheckCircle2 size={10} /> Escrow Active
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 32px' }}>
                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                    {[
                        { label: 'Est. Hours', value: totalHours, icon: Clock, suffix: 'h' },
                        { label: 'Team Size', value: teamMembers.length, icon: User },
                        { label: 'Tasks', value: `${completedTasks}/${totalTasks}`, icon: CheckCircle2 },
                        { label: 'Progress', value: progressPercent, icon: TrendingUp, suffix: '%' },
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
                        {/* Team */}
                        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid rgba(169, 146, 125, 0.15)', marginBottom: '20px' }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(169, 146, 125, 0.1)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>Team ({teamMembers.length})</h3>
                            </div>
                            <div style={{ padding: '12px 0' }}>
                                {teamMembers.length === 0 && (
                                    <p style={{ padding: '16px 20px', fontSize: '13px', color: '#a9927d' }}>No team members assigned yet.</p>
                                )}
                                {teamMembers.map((member, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < teamMembers.length - 1 ? '1px solid rgba(169, 146, 125, 0.08)' : 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '200px' }}>
                                            <span style={{ fontSize: '28px' }}>{member.avatar || '👨‍💻'}</span>
                                            <div>
                                                <p style={{ fontSize: '14px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{member.name}</p>
                                                <p style={{ fontSize: '11px', color: '#a9927d', margin: '2px 0 0' }}>{member.role}</p>
                                            </div>
                                        </div>
                                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', textAlign: 'center' }}>
                                            <div>
                                                <p style={{ fontSize: '16px', fontWeight: '600', color: '#16a34a', margin: 0 }}>{member.match || 0}%</p>
                                                <p style={{ fontSize: '10px', color: '#a9927d', margin: '2px 0 0' }}>Match</p>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '12px', color: '#5e503f', margin: 0, lineHeight: '1.3' }}>{member.reason ? member.reason.substring(0, 60) + (member.reason.length > 60 ? '...' : '') : '—'}</p>
                                                <p style={{ fontSize: '10px', color: '#a9927d', margin: '2px 0 0' }}>Why picked</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tasks */}
                        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid rgba(169, 146, 125, 0.15)' }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(169, 146, 125, 0.1)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>Tasks ({totalTasks})</h3>
                            </div>
                            <div style={{ padding: '8px 0' }}>
                                {(project.tasks || []).length === 0 && (
                                    <p style={{ padding: '16px 20px', fontSize: '13px', color: '#a9927d' }}>No tasks created yet.</p>
                                )}
                                {(project.tasks || []).map((task, i) => {
                                    const tStatus = statusLabel(task.status);
                                    const tColor = getStatusColor(task.status);
                                    return (
                                        <div key={task._id || i} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: i < project.tasks.length - 1 ? '1px solid rgba(169, 146, 125, 0.08)' : 'none' }}>
                                            {task.status === 'done' ? <CheckCircle2 size={16} style={{ color: '#16a34a', marginRight: '12px' }} /> : <Circle size={16} style={{ color: '#a9927d', marginRight: '12px' }} />}
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontSize: '14px', fontWeight: '500', color: '#2d2a26', margin: 0 }}>{task.title}</p>
                                                <p style={{ fontSize: '11px', color: '#a9927d', margin: '2px 0 0' }}>
                                                    {(task.assignees || []).map(a => a.name).join(', ') || 'Unassigned'} • {task.estimatedHours || 0}h
                                                    {task.priority && ` • ${task.priority}`}
                                                </p>
                                            </div>
                                            <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', background: tColor.bg, color: tColor.text, fontWeight: '500' }}>{tStatus}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Dispute & Finalization Panel */}
                        {project.escrowAddress && escrow && (
                            <div style={{ marginTop: '20px' }}>
                                <DisputePanel
                                    escrowAddress={project.escrowAddress}
                                    milestones={escrow.milestones}
                                    contributors={escrow.contributors}
                                    oracle={escrow.oracle}
                                    arbitrator={escrow.arbitrator}
                                    onRefresh={async () => {
                                        try {
                                            const data = await getEscrowData(project.escrowAddress);
                                            setEscrow(data);
                                        } catch (_) {}
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Right Column */}
                    <div>
                        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid rgba(169, 146, 125, 0.15)', marginBottom: '20px', padding: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: '0 0 16px' }}>Project Details</h3>
                            <div style={{ display: 'grid', gap: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <DollarSign size={16} style={{ color: '#a9927d' }} />
                                    <div>
                                        <p style={{ fontSize: '11px', color: '#a9927d', margin: 0 }}>Budget</p>
                                        <p style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>${(project.budget || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Calendar size={16} style={{ color: '#a9927d' }} />
                                    <div>
                                        <p style={{ fontSize: '11px', color: '#a9927d', margin: 0 }}>Deadline</p>
                                        <p style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{project.deadline || 'Not set'}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <User size={16} style={{ color: '#a9927d' }} />
                                    <div>
                                        <p style={{ fontSize: '11px', color: '#a9927d', margin: 0 }}>Created by</p>
                                        <p style={{ fontSize: '14px', fontWeight: '500', color: '#2d2a26', margin: 0 }}>{project.createdBy?.name || project.createdBy?.email || 'Admin'}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Clock size={16} style={{ color: '#a9927d' }} />
                                    <div>
                                        <p style={{ fontSize: '11px', color: '#a9927d', margin: 0 }}>Created</p>
                                        <p style={{ fontSize: '14px', fontWeight: '500', color: '#2d2a26', margin: 0 }}>{project.createdAt ? new Date(project.createdAt).toLocaleDateString() : '—'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Progress Card */}
                        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid rgba(169, 146, 125, 0.15)', padding: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: '0 0 16px' }}>Progress</h3>
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '13px', color: '#5e503f' }}>Completion</span>
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#2d2a26' }}>{progressPercent}%</span>
                                </div>
                                <div style={{ height: '8px', background: 'rgba(169, 146, 125, 0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                                        style={{ height: '100%', background: progressPercent === 100 ? '#16a34a' : 'linear-gradient(90deg, #a9927d, #5e503f)', borderRadius: '4px' }} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '16px' }}>
                                <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(22, 163, 74, 0.08)', borderRadius: '8px' }}>
                                    <p style={{ fontSize: '18px', fontWeight: '600', color: '#16a34a', margin: 0 }}>{completedTasks}</p>
                                    <p style={{ fontSize: '10px', color: '#16a34a', margin: '2px 0 0' }}>Done</p>
                                </div>
                                <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(234, 88, 12, 0.08)', borderRadius: '8px' }}>
                                    <p style={{ fontSize: '18px', fontWeight: '600', color: '#ea580c', margin: 0 }}>{(project.tasks || []).filter(t => t.status === 'in_progress').length}</p>
                                    <p style={{ fontSize: '10px', color: '#ea580c', margin: '2px 0 0' }}>In Progress</p>
                                </div>
                                <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(169, 146, 125, 0.1)', borderRadius: '8px' }}>
                                    <p style={{ fontSize: '18px', fontWeight: '600', color: '#5e503f', margin: 0 }}>{(project.tasks || []).filter(t => t.status === 'todo').length}</p>
                                    <p style={{ fontSize: '10px', color: '#5e503f', margin: '2px 0 0' }}>Pending</p>
                                </div>
                            </div>
                        </div>

                        {/* Escrow & Milestones Card */}
                        {project.escrowAddress && (
                            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid rgba(169, 146, 125, 0.15)', padding: '20px', marginTop: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>Escrow</h3>
                                    <a href={getExplorerUrl(project.escrowAddress, 'address')} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#a9927d', textDecoration: 'none' }}>
                                        {shorten(project.escrowAddress)} <ExternalLink size={10} />
                                    </a>
                                </div>

                                {escrowLoading ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a9927d', fontSize: '13px' }}>
                                        <Loader2 size={14} className="animate-spin" /> Loading on-chain data...
                                    </div>
                                ) : escrow ? (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '14px' }}>
                                            <div style={{ background: '#fbf7ef', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                                                <p style={{ fontSize: '18px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>${escrow.totalBudget}</p>
                                                <p style={{ fontSize: '10px', color: '#a9927d', margin: '2px 0 0' }}>On-chain Budget</p>
                                            </div>
                                            <div style={{ background: '#fbf7ef', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                                                <p style={{ fontSize: '18px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{escrow.milestones.length}</p>
                                                <p style={{ fontSize: '10px', color: '#a9927d', margin: '2px 0 0' }}>Milestones</p>
                                            </div>
                                        </div>

                                        {/* Milestone timeline */}
                                        <div style={{ display: 'grid', gap: '8px' }}>
                                            {escrow.milestones.map((ms, i) => {
                                                const statusColor = MilestoneStatusColors[ms.status] || MilestoneStatusColors[0];
                                                const deadlineDate = ms.deadline ? new Date(ms.deadline * 1000).toLocaleDateString() : '—';
                                                return (
                                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < escrow.milestones.length - 1 ? '1px solid rgba(169, 146, 125, 0.08)' : 'none' }}>
                                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: statusColor.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            {ms.status === 3 ? <CheckCircle2 size={12} style={{ color: statusColor.text }} /> :
                                                             ms.status === 2 ? <AlertTriangle size={12} style={{ color: statusColor.text }} /> :
                                                             <Circle size={12} style={{ color: statusColor.text }} />}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <p style={{ fontSize: '13px', fontWeight: '500', color: '#2d2a26', margin: 0 }}>Milestone {i + 1}</p>
                                                            <p style={{ fontSize: '10px', color: '#a9927d', margin: '1px 0 0' }}>${ms.budget} • Due {deadlineDate}</p>
                                                        </div>
                                                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: statusColor.bg, color: statusColor.text, fontWeight: '500' }}>
                                                            {MilestoneStatusLabels[ms.status]}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Contributors */}
                                        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(169, 146, 125, 0.1)' }}>
                                            <p style={{ fontSize: '11px', fontWeight: '600', color: '#5e503f', margin: '0 0 8px' }}>On-chain Contributors ({escrow.contributors.length})</p>
                                            {escrow.contributors.map((addr, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                    <Wallet size={10} style={{ color: '#a9927d' }} />
                                                    <a href={getExplorerUrl(addr, 'address')} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#5e503f', fontFamily: 'monospace', textDecoration: 'none' }}>
                                                        {shorten(addr)}
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ fontSize: '13px', color: '#a9927d' }}>
                                        Could not load escrow data from chain.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Deploy Escrow Modal */}
            <DeployEscrowModal
                isOpen={showDeployModal}
                onClose={() => setShowDeployModal(false)}
                project={project}
                onDeployed={(addr) => {
                    setProject(prev => ({ ...prev, escrowAddress: addr }));
                    getEscrowData(addr).then(data => setEscrow(data)).catch(() => {});
                }}
            />
        </div>
    );
};

export default ProjectDetail;
