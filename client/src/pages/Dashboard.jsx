
import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { MoreHorizontal, Plus, Clock, ExternalLink, Github } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import AdminDashboard from './AdminDashboard';
import { useNavigate } from 'react-router-dom';
import { fetchWakatimeStats } from '@/Apis/statApis';
import { fetchActivityHistory, fetchTodayActivity, listProjectTasks, listProjects } from '@/Apis/projectApis';
import TaskDetailModal from '@/components/TaskDetailModal';

const STATUS_COLUMNS = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
];

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const buildWeekRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  const toIso = (date) => date.toISOString().slice(0, 10);
  return { start: toIso(start), end: toIso(end) };
};

const parseWakaTimeSeries = (payload) => {
  const data = payload?.data?.data || [];
  if (!Array.isArray(data)) return [];

  return data.map((entry) => {
    const dateValue = entry?.range?.date || entry?.range?.start || entry?.range?.start_date || entry?.range?.start_date_time;
    const dayLabel = dateValue
      ? new Date(dateValue).toLocaleDateString('en-US', { weekday: 'short' })
      : '—';
    const seconds = entry?.grand_total?.total_seconds || 0;
    const hours = Math.round((seconds / 3600) * 10) / 10;
    const efficiency = Math.min(100, Math.round((hours / 8) * 100));
    return {
      name: dayLabel,
      completed: hours,
      efficiency,
      rawDate: dateValue || null,
    };
  });
};
const Dashboard = () => {
  const containerRef = useRef(null);
  const { fetchUserProfile, user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [wakatimeSeries, setWakatimeSeries] = useState([]);
  const [todayCommits, setTodayCommits] = useState(0);
  const [todayHours, setTodayHours] = useState(0);
  const [historySeries, setHistorySeries] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
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
      const session = await fetchUserProfile();
      if (session?.user?.role === 'admin') return;

      const { start, end } = buildWeekRange();
      const wakaResult = await fetchWakatimeStats({ start, end });
      if (wakaResult.ok) {
        const series = parseWakaTimeSeries(wakaResult.data);
        setWakatimeSeries(series);
        const latest = series[series.length - 1];
        setTodayHours(latest?.completed || 0);
      }

      const projectResult = await listProjects();
      if (projectResult.ok) {
        setProjects(projectResult.projects);
        const primaryProject = projectResult.projects[0] || null;
        setActiveProject(primaryProject);

        if (primaryProject) {
          const [todayResult, historyResult, taskResult] = await Promise.all([
            fetchTodayActivity(primaryProject._id),
            fetchActivityHistory(primaryProject._id),
            listProjectTasks(primaryProject._id),
          ]);

          if (todayResult.ok) {
            setTodayCommits(todayResult.data?.commitsToday || 0);
          }
          if (historyResult.ok) {
            setHistorySeries(historyResult.data?.history || []);
          }
          if (taskResult.ok) {
            setTasks(taskResult.tasks);
          }
        }
      }
    };
    fetchData();

    return () => ctx.revert();
  }, []);

  const profileEntries = user
    ? [
        { label: 'Name', value: user.name || '—' },
        { label: 'Email', value: user.email || '—' },
        { label: 'Provider', value: user.provider || '—' },
        { label: 'GitHub Connected', value: user.githubConnected ? 'Yes' : 'No' },
        { label: 'WakaTime Connected', value: user.wakatimeConnected ? 'Yes' : 'No' },
        { label: 'Resume URL', value: user.resume || '—' },
      ]
    : [];
     if (user?.role === "admin") {
       return <AdminDashboard />
    }

    const handleLogout = async () => {
      await logout();
      navigate('/login');
    }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === 'done').length;
  const inProgressTasks = tasks.filter((task) => task.status === 'in_progress').length;
  const productivityData = wakatimeSeries.length
    ? wakatimeSeries
    : [{ name: '—', completed: 0, efficiency: 0 }];
  const activityData = historySeries
    .slice()
    .reverse()
    .map((entry) => ({
      name: formatDate(entry.date),
      commits: entry.commitCount || 0,
    }));
  const commitSeries = activityData.length
    ? activityData
    : [{ name: '—', commits: 0 }];
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
          <button
            onClick={handleLogout}
            className="bg-zinc-800 text-white px-4 py-2 rounded-xl hover:bg-zinc-700 transition-colors"
          >
            Logout
          </button>
          <button className="bg-zinc-800 text-white px-4 py-2 rounded-xl hover:bg-zinc-700 transition-colors flex items-center gap-2">
            <Clock size={18} /> Time Logs
          </button>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-500 transition-colors flex items-center gap-2 font-medium shadow-lg shadow-indigo-500/20">
            <Plus size={18} /> New Task
          </button>
        </div>
      </div>

      {/* Profile Snapshot */}
      <div className="stat-card bg-zinc-900/50 backdrop-blur-md border border-zinc-800 p-6 rounded-2xl shadow-xl mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-zinc-400 text-sm">NA</span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Profile Snapshot</h2>
            <p className="text-sm text-zinc-400">Data loaded after registration and GitHub connect.</p>
          </div>
        </div>
        {user ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profileEntries.map((entry) => (
                <div key={entry.label} className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">{entry.label}</p>
                  <p className="text-sm text-zinc-200 break-words">{entry.value}</p>
                </div>
              ))}
            </div>
            <details className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4">
              <summary className="cursor-pointer text-sm text-zinc-300">Raw user JSON</summary>
              <pre className="mt-3 text-xs text-zinc-400 whitespace-pre-wrap">{JSON.stringify(user, null, 2)}</pre>
            </details>
          </div>
        ) : (
          <p className="text-sm text-zinc-400">No user data loaded yet.</p>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Tasks', value: String(totalTasks), change: activeProject ? activeProject.name : 'No project yet', color: 'from-blue-500 to-cyan-500' },
          { label: 'Completed', value: String(completedTasks), change: 'Live data', color: 'from-green-500 to-emerald-500' },
          { label: 'In Progress', value: String(inProgressTasks), change: 'Live data', color: 'from-orange-500 to-amber-500' },
          { label: 'Today Commits', value: String(todayCommits), change: `${todayHours}h focus`, color: 'from-purple-500 to-pink-500' },
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
              <AreaChart data={productivityData}>
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

        {/* Commit Activity */}
         <div className="chart-container bg-zinc-900/50 backdrop-blur-md border border-zinc-800 p-6 rounded-3xl shadow-xl">
          <h3 className="text-lg font-semibold mb-6">Commit Activity</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={commitSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" tick={{fill: '#71717a'}} axisLine={false} tickLine={false} />
                <YAxis stroke="#71717a" tick={{fill: '#71717a'}} axisLine={false} tickLine={false} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
                />
                <Line type="monotone" dataKey="commits" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Task Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {STATUS_COLUMNS.map((column) => (
          <div key={column.key} className="task-column bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-zinc-300">{column.label}</h3>
              <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-1 rounded-full">
                {tasks.filter((task) => task.status === column.key).length}
              </span>
            </div>
            <div className="space-y-3">
              {tasks.filter((task) => task.status === column.key).map((task) => (
                <div 
                  key={task._id} 
                  className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl hover:border-zinc-700 transition-colors cursor-pointer group"
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] px-2 py-1 rounded-md mb-2 inline-block font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {column.label}
                    </span>
                    <button 
                      className="text-zinc-600 hover:text-white transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-white group-hover:text-indigo-400 transition-colors">{task.title}</h4>
                    {task.githubIssueUrl && (
                      <a
                        href={task.githubIssueUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-indigo-400 transition-colors"
                        title={`GitHub Issue #${task.githubIssueNumber || ''}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Github size={14} />
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <div className="flex items-center gap-2">
                         <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] text-indigo-400 border border-indigo-500/30">
                            {(task.assignees?.[0] || 'U').charAt(0).toUpperCase()}
                         </div>
                         <span>{task.assignees?.[0] || 'Unassigned'}</span>
                    </div>
                    <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] border border-zinc-700">
                      {formatDate(task.createdAt) || '—'}
                    </span>
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

      {/* Task Detail Modal */}
      {selectedTask && activeProject && (
        <TaskDetailModal
          task={selectedTask}
          projectId={activeProject._id}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
