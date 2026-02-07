import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Clock, GitCommit, CheckCircle2, Calendar,
    DollarSign, Star, Code2, Bell,
    FolderGit2, ExternalLink, Circle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchWakatimeStats } from '@/Apis/statApis';
import { fetchTodayActivity, listProjectTasks, listProjects } from '@/Apis/projectApis';

const buildWeekRange = () => {
    const today = new Date();
    const day = today.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const start = new Date(today);
    start.setDate(today.getDate() + diffToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const toIso = (date) => date.toISOString().slice(0, 10);
    return { start: toIso(start), end: toIso(end) };
};

const buildWeekDays = (startIso) => {
    const start = new Date(startIso);
    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return {
            iso: date.toISOString().slice(0, 10),
            day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        };
    });
};

const parseWakaTimeSeries = (payload, startIso) => {
    const data = payload?.data?.data || [];
    if (!Array.isArray(data)) return [];

    const byDate = data.reduce((acc, entry) => {
        const dateValue = entry?.range?.date || entry?.range?.start || entry?.range?.start_date || entry?.range?.start_date_time;
        if (!dateValue) return acc;
        const key = new Date(dateValue).toISOString().slice(0, 10);
        const seconds = entry?.grand_total?.total_seconds || 0;
        const hours = Math.round((seconds / 3600) * 10) / 10;
        acc[key] = hours;
        return acc;
    }, {});

    return buildWeekDays(startIso).map((entry) => ({
        day: entry.day,
        hours: byDate[entry.iso] || 0,
        rawDate: entry.iso,
    }));
};

const formatRelativeTime = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
};

const getInitials = (name) => {
    if (!name) return 'U';
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('');
};

const UserDashboard = () => {
    const navigate = useNavigate();
    const { fetchUserProfile, user, logout } = useAuth();
    const [wakatimeData, setWakatimeData] = useState([]);
    const [projects, setProjects] = useState([]);
    const [projectTasks, setProjectTasks] = useState({});
    const [recentCommits, setRecentCommits] = useState([]);
    const [wakatimeLoading, setWakatimeLoading] = useState(false);

    const handleLogout = async () => {
        await logout() ;
        navigate('/login');
    }

    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            await fetchUserProfile();

            const { start, end } = buildWeekRange();
            setWakatimeLoading(true);
            const wakatimeResult = await fetchWakatimeStats({ start, end });
            if (isMounted && wakatimeResult.ok) {
                setWakatimeData(parseWakaTimeSeries(wakatimeResult.data, start));
            }
            if (isMounted) {
                setWakatimeLoading(false);
            }

            const projectResult = await listProjects();
            if (!isMounted) return;
            if (projectResult.ok) {
                setProjects(projectResult.projects || []);
                const tasksByProject = {};
                const taskResults = await Promise.all(
                    (projectResult.projects || []).map((project) => listProjectTasks(project._id))
                );
                taskResults.forEach((result, index) => {
                    if (!result.ok) return;
                    const projectId = projectResult.projects[index]?._id;
                    if (projectId) {
                        tasksByProject[projectId] = result.tasks || [];
                    }
                });
                setProjectTasks(tasksByProject);

                const primaryProject = projectResult.projects?.[0];
                if (primaryProject) {
                    const activityResult = await fetchTodayActivity(primaryProject._id);
                    if (activityResult.ok) {
                        setRecentCommits(activityResult.data?.commits || []);
                    }
                }
            }
        };

        loadData();
        return () => {
            isMounted = false;
        };
    }, [fetchUserProfile]);

    const totalHours = useMemo(
        () => wakatimeData.reduce((sum, entry) => sum + (entry.hours || 0), 0),
        [wakatimeData]
    );
    const maxHours = useMemo(
        () => Math.max(1, ...wakatimeData.map((entry) => entry.hours || 0)),
        [wakatimeData]
    );
    const projectCards = useMemo(() => {
        return projects.map((project, index) => {
            const tasks = projectTasks[project._id] || [];
            const completed = tasks.filter((task) => task.status === 'done').length;
            const pending = tasks.filter((task) => task.status !== 'done').length;
            const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
            const commits = index === 0 ? recentCommits.length : 0;
            const pendingTasks = tasks
                .filter((task) => task.status !== 'done')
                .slice(0, 2)
                .map((task) => ({
                    title: task.title,
                    status: task.status === 'in_progress' ? 'In Progress' : 'Pending',
                }));

            return {
                id: project._id,
                name: project.name,
                role: user?.role === 'admin' ? 'Admin' : 'Developer',
                status: tasks.length && completed === tasks.length ? 'Completed' : 'Active',
                myProgress: progress,
                tasksCompleted: completed,
                tasksPending: pending,
                myCommits: commits,
                myHours: totalHours,
                codeQuality: null,
                linesAdded: null,
                linesRemoved: null,
                lastCommit: recentCommits[0]?.timestamp ? formatRelativeTime(recentCommits[0].timestamp) : '—',
                pendingAmount: '—',
                tasks: pendingTasks,
                repoLabel: project.owner && project.repo ? `${project.owner}/${project.repo}` : project.name,
            };
        });
    }, [projects, projectTasks, recentCommits, totalHours, user?.role]);

    return (
        <div style={{ minHeight: '100vh', background: '#fbf7ef', fontFamily: "'Jost', sans-serif" }}>
            <style>{`
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Jost:wght@300;400;500;600&display=swap');
@keyframes spin { to { transform: rotate(360deg); } }
`}</style>

            {/* Header */}
            <div style={{ background: 'white', borderBottom: '1px solid rgba(169, 146, 125, 0.15)', padding: '16px 32px' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: '500', color: '#2d2a26', margin: 0 }}>My Dashboard</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            onClick={handleLogout}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '10px',
                                border: '1px solid rgba(169, 146, 125, 0.35)',
                                background: 'white',
                                color: '#5e503f',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            Logout
                        </button>
                        <button style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid rgba(169, 146, 125, 0.2)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Bell size={18} style={{ color: '#a9927d' }} />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#a9927d', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '12px' }}>
                                {getInitials(user?.name || user?.email)}
                            </div>
                            <div>
                                <p style={{ fontSize: '14px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{user?.name || user?.email || 'User'}</p>
                                <p style={{ fontSize: '12px', color: '#a9927d', margin: 0 }}>{user?.role === 'admin' ? 'Admin' : 'Developer'}</p>
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
                            <div style={{ fontSize: '56px', marginBottom: '12px' }}>
                                {user?.avatarUrl ? (
                                    <img src={user.avatarUrl} alt="Avatar" style={{ width: '56px', height: '56px', borderRadius: '50%' }} />
                                ) : (
                                    <span>{getInitials(user?.name || user?.email)}</span>
                                )}
                            </div>
                            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: '500', color: '#2d2a26', margin: '0 0 4px' }}>{user?.name || user?.email || 'User'}</h2>
                            <p style={{ fontSize: '14px', color: '#a9927d', margin: 0 }}>{user?.role === 'admin' ? 'Admin' : 'Developer'}</p>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
                                <Star size={14} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                                <span style={{ fontSize: '14px', fontWeight: '600', color: '#2d2a26' }}>—</span>
                                <span style={{ fontSize: '12px', color: '#a9927d' }}>• {user?.role === 'admin' ? 'Admin' : 'Developer'}</span>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            <div style={{ background: '#fbf7ef', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                                <p style={{ fontSize: '20px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{projects.length}</p>
                                <p style={{ fontSize: '11px', color: '#a9927d', margin: '4px 0 0' }}>Projects</p>
                            </div>
                            <div style={{ background: '#fbf7ef', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                                <p style={{ fontSize: '20px', fontWeight: '600', color: '#16a34a', margin: 0 }}>—</p>
                                <p style={{ fontSize: '11px', color: '#a9927d', margin: '4px 0 0' }}>Payments</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Wakatime Chart */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                        style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid rgba(169, 146, 125, 0.15)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>Coding Activity</h3>
                                <p style={{ fontSize: '12px', color: '#a9927d', margin: '4px 0 0' }}>This week • {totalHours.toFixed(1)}h total</p>
                            </div>
                            <Clock size={20} style={{ color: '#a9927d' }} />
                        </div>
                        {wakatimeLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '20px 0', color: '#a9927d', fontSize: '13px' }}>
                                <span
                                    style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        border: '2px solid rgba(169, 146, 125, 0.4)',
                                        borderTopColor: '#a9927d',
                                        animation: 'spin 1s linear infinite',
                                        display: 'inline-block'
                                    }}
                                />
                                Loading WakaTime stats...
                            </div>
                        ) : wakatimeData.length === 0 ? (
                            <div style={{ fontSize: '13px', color: '#a9927d', padding: '20px 0' }}>
                                No WakaTime data available yet.
                            </div>
                        ) : (
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
                        )}
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
                            {projectCards.length === 0 && (
                                <div style={{ gridColumn: '1 / -1', background: '#fbf7ef', borderRadius: '12px', padding: '18px', textAlign: 'center', color: '#5e503f', fontSize: '13px' }}>
                                    No projects yet. Create one to see analytics.
                                </div>
                            )}
                            {projectCards.map((project) => (
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
                                            <p style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{project.myHours ? `${project.myHours}h` : '—'}</p>
                                            <p style={{ fontSize: '9px', color: '#a9927d', margin: '2px 0 0' }}>Hours</p>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ fontSize: '16px', fontWeight: '600', color: '#5e503f', margin: 0 }}>{project.codeQuality ? `${project.codeQuality}%` : '—'}</p>
                                            <p style={{ fontSize: '9px', color: '#a9927d', margin: '2px 0 0' }}>Quality</p>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a', margin: 0 }}>{project.linesAdded ? `+${project.linesAdded}` : '—'}</p>
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
                            {recentCommits.length === 0 && (
                                <div style={{ padding: '16px 20px', fontSize: '13px', color: '#a9927d' }}>
                                    No commits logged today.
                                </div>
                            )}
                            {recentCommits.map((commit, i) => (
                                <div key={commit.commitSha || i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 20px', borderBottom: i < recentCommits.length - 1 ? '1px solid rgba(169, 146, 125, 0.08)' : 'none' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a9927d', marginTop: '6px', flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '14px', color: '#2d2a26', margin: 0, fontWeight: '500' }}>{commit.message || 'Commit'}</p>
                                        <p style={{ fontSize: '12px', color: '#a9927d', margin: '4px 0 0' }}>
                                            <span style={{ color: '#5e503f' }}>{projectCards[0]?.repoLabel || 'Repository'}</span> • main • {formatRelativeTime(commit.timestamp)}
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
                                <p style={{ fontSize: '24px', fontWeight: '600', color: '#dc2626', margin: 0 }}>—</p>
                                <p style={{ fontSize: '11px', color: '#dc2626', margin: '4px 0 0' }}>Issues</p>
                            </div>
                            <div style={{ background: 'rgba(234, 88, 12, 0.08)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                                <p style={{ fontSize: '24px', fontWeight: '600', color: '#ea580c', margin: 0 }}>—</p>
                                <p style={{ fontSize: '11px', color: '#ea580c', margin: '4px 0 0' }}>Warnings</p>
                            </div>
                            <div style={{ background: 'rgba(22, 163, 74, 0.08)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                                <p style={{ fontSize: '24px', fontWeight: '600', color: '#16a34a', margin: 0 }}>—</p>
                                <p style={{ fontSize: '11px', color: '#16a34a', margin: '4px 0 0' }}>Maintainability</p>
                            </div>
                            <div style={{ background: 'rgba(169, 146, 125, 0.1)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                                <p style={{ fontSize: '24px', fontWeight: '600', color: '#5e503f', margin: 0 }}>—</p>
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
                        <div style={{ padding: '16px 20px', fontSize: '13px', color: '#a9927d' }}>
                            No upcoming deadlines yet.
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
                                <p style={{ fontSize: '32px', fontWeight: '600', margin: 0 }}>—</p>
                            </div>
                            <div style={{ fontSize: '13px', color: '#a9927d' }}>
                                No pending payments yet.
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;
