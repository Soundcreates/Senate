import React, { useEffect, useState } from 'react';
import { X, User, GitBranch, GitPullRequest, CheckCircle2, Clock, ExternalLink, Github, AlertCircle, MessageSquare, Award, TrendingUp, Zap, Activity, GitCommit, ArrowUp, ArrowDown } from 'lucide-react';

const TaskDetailModal = ({ task, projectId, onClose }) => {
  const [taskDetails, setTaskDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTaskDetails = async () => {
      try {
        setLoading(true);
        const url = `http://localhost:3000/api/projects/${projectId}/tasks/${task._id}/details`;
        console.log('[TaskDetailModal] Fetching:', url);
        
        const response = await fetch(url, {
          credentials: 'include',
        });
        
        console.log('[TaskDetailModal] Response status:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'unknown' }));
          console.error('[TaskDetailModal] Error response:', errorData);
          throw new Error(errorData.message || errorData.error || 'Failed to fetch task details');
        }
        
        const data = await response.json();
        console.log('[TaskDetailModal] Task details loaded:', data.task);
        setTaskDetails(data.task);
      } catch (err) {
        console.error('[TaskDetailModal] Error fetching task details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (task && projectId) {
      fetchTaskDetails();
    }
  }, [task, projectId]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      todo: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
      in_progress: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      done: 'bg-green-500/20 text-green-300 border-green-500/30',
    };
    return colors[status] || colors.todo;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(45, 42, 38, 0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div 
        style={{ 
          background: 'white',
          border: '1px solid rgba(169, 146, 125, 0.15)',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(45, 42, 38, 0.1), 0 10px 10px -5px rgba(45, 42, 38, 0.04)',
          maxWidth: '56rem',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          fontFamily: "'Jost', sans-serif"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Jost:wght@300;400;500;600&display=swap');
@keyframes spin { to { transform: rotate(360deg); } }
.task-modal-content { background: #fbf7ef !important; border-color: rgba(169, 146, 125, 0.15) !important; }
.task-modal-card { background: white !important; border-color: rgba(169, 146, 125, 0.15) !important; }
.task-modal-text { color: #2d2a26 !important; }
.task-modal-text-secondary { color: #a9927d !important; }
.task-modal-text-muted { color: #5e503f !important; }
.task-modal-border { border-color: rgba(169, 146, 125, 0.15) !important; }
.bg-zinc-900 { background: white !important; border-color: rgba(169, 146, 125, 0.15) !important; }
.bg-zinc-950\\/60 { background: #fbf7ef !important; }
.border-zinc-800 { border-color: rgba(169, 146, 125, 0.15) !important; }
.border-zinc-700 { border-color: rgba(169, 146, 125, 0.2) !important; }
.text-zinc-300 { color: #2d2a26 !important; }
.text-zinc-400 { color: #a9927d !important; }
.text-zinc-500 { color: #a9927d !important; }
.text-zinc-600 { color: #5e503f !important; }
.text-white { color: #2d2a26 !important; }
.bg-zinc-800 { background: rgba(169, 146, 125, 0.1) !important; }
.bg-zinc-900\\/60 { background: white !important; }
.bg-zinc-900\\/80 { background: white !important; }
        `}</style>
        {/* Header */}
        <div style={{ position: 'sticky', top: 0, background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(169, 146, 125, 0.1)', padding: '24px', display: 'flex', alignItems: 'start', justifyContent: 'space-between', zIndex: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{task.title}</h2>
              {taskDetails?.githubIssueUrl && (
                <a
                  href={taskDetails.githubIssueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: '#a9927d', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#5e503f'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#a9927d'}
                >
                  <Github size={16} />
                  <span>#{taskDetails.githubIssueNumber}</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', border: '1px solid rgba(169, 146, 125, 0.3)', background: 'rgba(169, 146, 125, 0.1)', color: '#5e503f' }}>
                {task.status.replace('_', ' ').toUpperCase()}
              </span>
              {taskDetails?.github?.issue?.labels?.map((label, idx) => (
                <span key={idx} style={{ padding: '4px 8px', background: '#fbf7ef', color: '#5e503f', fontSize: '11px', borderRadius: '6px', border: '1px solid rgba(169, 146, 125, 0.2)' }}>
                  {label}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ color: '#a9927d', transition: 'all 0.2s', padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '8px' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#2d2a26'; e.currentTarget.style.background = '#fbf7ef'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#a9927d'; e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
              <div style={{ width: '48px', height: '48px', border: '3px solid rgba(169, 146, 125, 0.2)', borderTop: '3px solid #a9927d', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
          ) : error ? (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle style={{ color: '#dc2626' }} size={20} />
              <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
            </div>
          ) : taskDetails ? (
            <>
              {/* Description */}
              {taskDetails.description && (
                <div style={{ background: '#fbf7ef', border: '1px solid rgba(169, 146, 125, 0.15)', borderRadius: '12px', padding: '16px' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#5e503f', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Description</h3>
                  <p style={{ color: '#2d2a26', whiteSpace: 'pre-wrap', margin: 0 }}>{taskDetails.description}</p>
                </div>
              )}

              {/* Assignees */}
              {taskDetails.assignees && taskDetails.assignees.length > 0 && (
                <div style={{ background: '#fbf7ef', border: '1px solid rgba(169, 146, 125, 0.15)', borderRadius: '12px', padding: '16px' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#5e503f', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={16} />
                    Assigned To
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {taskDetails.assignees.map((assignee, idx) => {
                      const wakatimeData = taskDetails.wakatime?.assigneeStats?.find(s => s.name === assignee);
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'white', border: '1px solid rgba(169, 146, 125, 0.15)', borderRadius: '10px', padding: '12px 16px', flex: '1 1 200px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(169, 146, 125, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#5e503f', border: '2px solid rgba(169, 146, 125, 0.3)' }}>
                            {assignee.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ color: '#2d2a26', fontWeight: '500', margin: 0 }}>{assignee}</p>
                            {wakatimeData?.connected && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#a9927d', marginTop: '4px' }}>
                                <Activity size={12} style={{ color: '#16a34a' }} />
                                <span style={{ color: '#16a34a' }}>{wakatimeData.totalHours}h this week</span>
                                <span>•</span>
                                <span>{wakatimeData.dailyAverage}h/day avg</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Code Review Score */}
              {taskDetails.github?.connected && taskDetails.github.codeReviewScore > 0 && (
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-green-300 uppercase tracking-wide flex items-center gap-2">
                      <Award size={16} />
                      Code Review Score
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className={`text-3xl font-bold ${
                        taskDetails.github.codeReviewScore >= 80 ? 'text-green-400' :
                        taskDetails.github.codeReviewScore >= 60 ? 'text-yellow-400' :
                        'text-orange-400'
                      }`}>
                        {taskDetails.github.codeReviewScore}
                      </div>
                      <span className="text-zinc-500 text-lg">/100</span>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        taskDetails.github.codeReviewScore >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                        taskDetails.github.codeReviewScore >= 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                        'bg-gradient-to-r from-orange-500 to-red-500'
                      }`}
                      style={{ width: `${taskDetails.github.codeReviewScore}%` }}
                    />
                  </div>
                  {taskDetails.github.reviews && taskDetails.github.reviews.length > 0 && (
                    <div className="mt-4 text-xs text-zinc-400">
                      <p className="mb-2 font-medium">Recent Reviews:</p>
                      <div className="space-y-2">
                        {taskDetails.github.reviews.slice(0, 3).map((review, idx) => (
                          <div key={idx} className="bg-zinc-900/60 border border-zinc-700 rounded-lg p-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-indigo-400">{review.author}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                review.state === 'APPROVED' ? 'bg-green-500/20 text-green-300' :
                                review.state === 'CHANGES_REQUESTED' ? 'bg-red-500/20 text-red-300' :
                                'bg-zinc-700 text-zinc-300'
                              }`}>
                                {review.state.replace('_', ' ')}
                              </span>
                              <span className="text-zinc-600">•</span>
                              <span className="text-zinc-500">PR #{review.prNumber}</span>
                            </div>
                            {review.body && (
                              <p className="text-zinc-400 line-clamp-2">{review.body}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* WakaTime Activity */}
              {taskDetails.wakatime?.assigneeStats?.some(s => s.connected) && (
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-purple-300 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Zap size={16} />
                    Developer Activity (Last 7 Days)
                  </h3>
                  <div className="space-y-4">
                    {taskDetails.wakatime.assigneeStats.filter(s => s.connected).map((stats, idx) => (
                      <div key={idx} className="bg-zinc-900/60 border border-zinc-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-sm text-purple-400 border border-purple-500/30">
                              {stats.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-zinc-300 font-medium">{stats.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-purple-400">{stats.totalHours}h</p>
                            <p className="text-xs text-zinc-500">{stats.dailyAverage}h/day</p>
                          </div>
                        </div>
                        {stats.lastSevenDays && stats.lastSevenDays.length > 0 && (
                          <div className="grid grid-cols-7 gap-1 mt-3">
                            {stats.lastSevenDays.map((day, dayIdx) => {
                              const maxHours = Math.max(...stats.lastSevenDays.map(d => parseFloat(d.hours)));
                              const heightPercent = maxHours > 0 ? (parseFloat(day.hours) / maxHours) * 100 : 0;
                              return (
                                <div key={dayIdx} className="flex flex-col items-center gap-1">
                                  <div className="w-full h-16 bg-zinc-800 rounded relative overflow-hidden">
                                    <div 
                                      className="absolute bottom-0 w-full bg-gradient-to-t from-purple-500 to-pink-500 transition-all"
                                      style={{ height: `${heightPercent}%` }}
                                      title={`${day.hours}h`}
                                    />
                                  </div>
                                  <span className="text-[10px] text-zinc-600">
                                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* GitHub Stats */}
              {taskDetails.github?.connected && (
                <>
                  {/* Code Statistics */}
                  {taskDetails.github.prs.length > 0 && (
                    <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-indigo-300 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <GitBranch size={16} />
                        Code Statistics
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-zinc-900/80 border border-zinc-700 rounded-lg p-3">
                          <p className="text-xs text-zinc-500 mb-1">Lines Added</p>
                          <p className="text-2xl font-bold text-green-400">+{taskDetails.github.stats.totalAdditions}</p>
                        </div>
                        <div className="bg-zinc-900/80 border border-zinc-700 rounded-lg p-3">
                          <p className="text-xs text-zinc-500 mb-1">Lines Deleted</p>
                          <p className="text-2xl font-bold text-red-400">-{taskDetails.github.stats.totalDeletions}</p>
                        </div>
                        <div className="bg-zinc-900/80 border border-zinc-700 rounded-lg p-3">
                          <p className="text-xs text-zinc-500 mb-1">Files Changed</p>
                          <p className="text-2xl font-bold text-blue-400">{taskDetails.github.stats.totalChangedFiles}</p>
                        </div>
                        <div className="bg-zinc-900/80 border border-zinc-700 rounded-lg p-3">
                          <p className="text-xs text-zinc-500 mb-1">Merged PRs</p>
                          <p className="text-2xl font-bold text-purple-400">{taskDetails.github.stats.mergedPRs}/{taskDetails.github.prs.length}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Branch Activity */}
                  {taskDetails.github?.branch && (
                    <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-2">
                          <GitBranch size={16} />
                          Branch Activity
                        </h3>
                        <span className="font-mono text-xs bg-zinc-900 px-3 py-1 rounded-full text-indigo-400 border border-zinc-700">
                          {taskDetails.github.branch.branchName}
                        </span>
                      </div>

                      {/* Branch Comparison Stats */}
                      {taskDetails.github.branch.comparison && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          <div className="bg-zinc-900/80 border border-zinc-700 rounded-lg p-3">
                            <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                              <ArrowUp size={12} className="text-green-400" />
                              Ahead
                            </p>
                            <p className="text-xl font-bold text-green-400">{taskDetails.github.branch.comparison.aheadBy}</p>
                          </div>
                          <div className="bg-zinc-900/80 border border-zinc-700 rounded-lg p-3">
                            <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                              <ArrowDown size={12} className="text-orange-400" />
                              Behind
                            </p>
                            <p className="text-xl font-bold text-orange-400">{taskDetails.github.branch.comparison.behindBy}</p>
                          </div>
                          <div className="bg-zinc-900/80 border border-zinc-700 rounded-lg p-3">
                            <p className="text-xs text-zinc-500 mb-1">Files Changed</p>
                            <p className="text-xl font-bold text-blue-400">{taskDetails.github.branch.comparison.filesChanged}</p>
                          </div>
                          <div className="bg-zinc-900/80 border border-zinc-700 rounded-lg p-3">
                            <p className="text-xs text-zinc-500 mb-1">Total Commits</p>
                            <p className="text-xl font-bold text-purple-400">{taskDetails.github.branch.comparison.totalCommits}</p>
                          </div>
                        </div>
                      )}

                      {/* Recent Commits */}
                      {taskDetails.github.branch.commits && taskDetails.github.branch.commits.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <GitCommit size={14} />
                            Recent Commits ({taskDetails.github.branch.commits.length})
                          </h4>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {taskDetails.github.branch.commits.slice(0, 10).map((commit, idx) => (
                              <div key={commit.sha} className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 hover:border-indigo-500/50 transition-colors">
                                <div className="flex items-start gap-3">
                                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs text-indigo-400 border border-indigo-500/30 flex-shrink-0 mt-0.5">
                                    {commit.author.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <a
                                      href={commit.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-zinc-300 hover:text-indigo-400 transition-colors block mb-1 line-clamp-2"
                                    >
                                      {commit.message.split('\n')[0]}
                                    </a>
                                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                                      <span className="text-zinc-400">{commit.author}</span>
                                      <span>•</span>
                                      <span className="font-mono text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded">{commit.sha.substring(0, 7)}</span>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        <Clock size={10} />
                                        {formatDate(commit.date)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {taskDetails.github.branch.commits.length === 0 && (
                        <div className="text-center py-6 text-zinc-500">
                          <GitCommit size={24} className="mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No commits yet on this branch</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pull Requests */}
                  {taskDetails.github.prs.length > 0 && (
                    <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <GitPullRequest size={16} />
                        Pull Requests ({taskDetails.github.prs.length})
                      </h3>
                      <div className="space-y-3">
                        {taskDetails.github.prs.map((pr) => (
                          <div key={pr.number} className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 hover:border-indigo-500/50 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2 flex-1">
                                {pr.merged ? (
                                  <CheckCircle2 className="text-purple-400 flex-shrink-0" size={18} />
                                ) : pr.state === 'open' ? (
                                  <GitPullRequest className="text-green-400 flex-shrink-0" size={18} />
                                ) : (
                                  <X className="text-red-400 flex-shrink-0" size={18} />
                                )}
                                <div className="flex-1">
                                  <a
                                    href={pr.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-white hover:text-indigo-400 transition-colors font-medium block"
                                  >
                                    #{pr.number}: {pr.title}
                                  </a>
                                  {pr.reviewScore !== undefined && pr.reviewScore > 0 && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs text-zinc-500">Review Score:</span>
                                      <div className="flex items-center gap-1">
                                        <Award size={12} className={
                                          pr.reviewScore >= 80 ? 'text-green-400' :
                                          pr.reviewScore >= 60 ? 'text-yellow-400' :
                                          'text-orange-400'
                                        } />
                                        <span className={`text-sm font-bold ${
                                          pr.reviewScore >= 80 ? 'text-green-400' :
                                          pr.reviewScore >= 60 ? 'text-yellow-400' :
                                          'text-orange-400'
                                        }`}>
                                          {pr.reviewScore}/100
                                        </span>
                                      </div>
                                      {pr.reviewSummary && (
                                        <div className="flex items-center gap-1 text-[10px] text-zinc-600">
                                          {pr.reviewSummary.approvals > 0 && (
                                            <span className="text-green-400">✓{pr.reviewSummary.approvals}</span>
                                          )}
                                          {pr.reviewSummary.changesRequested > 0 && (
                                            <span className="text-red-400">✗{pr.reviewSummary.changesRequested}</span>
                                          )}
                                          {pr.reviewSummary.comments > 0 && (
                                            <span className="text-zinc-400">💬{pr.reviewSummary.comments}</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                                pr.merged ? 'bg-purple-500/20 text-purple-300' :
                                pr.state === 'open' ? 'bg-green-500/20 text-green-300' :
                                'bg-red-500/20 text-red-300'
                              }`}>
                                {pr.merged ? 'Merged' : pr.state}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-zinc-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <User size={12} />
                                {pr.author}
                              </span>
                              <span className="text-green-400">+{pr.additions}</span>
                              <span className="text-red-400">-{pr.deletions}</span>
                              <span>{pr.changedFiles} files</span>
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {formatDate(pr.updatedAt)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Issue Details */}
                  {taskDetails.github.issue && (
                    <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <Github size={16} />
                        GitHub Issue Details
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-zinc-500">State:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            taskDetails.github.issue.state === 'open' 
                              ? 'bg-green-500/20 text-green-300' 
                              : 'bg-purple-500/20 text-purple-300'
                          }`}>
                            {taskDetails.github.issue.state}
                          </span>
                        </div>
                        {taskDetails.github.issue.commentsCount > 0 && (
                          <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <MessageSquare size={16} />
                            <span>{taskDetails.github.issue.commentsCount} comments</span>
                          </div>
                        )}
                        {taskDetails.github.issue.comments?.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs text-zinc-500 uppercase tracking-wide">Recent Comments</p>
                            {taskDetails.github.issue.comments.map((comment, idx) => (
                              <div key={idx} className="bg-zinc-900 border border-zinc-700 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-medium text-indigo-400">{comment.author}</span>
                                  <span className="text-xs text-zinc-600">•</span>
                                  <span className="text-xs text-zinc-500">{formatDate(comment.createdAt)}</span>
                                </div>
                                <p className="text-sm text-zinc-300 line-clamp-3">{comment.body}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Timestamps */}
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-500 mb-1">Created</p>
                    <p className="text-zinc-300">{formatDate(taskDetails.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 mb-1">Last Updated</p>
                    <p className="text-zinc-300">{formatDate(taskDetails.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;
