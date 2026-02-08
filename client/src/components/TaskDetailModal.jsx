import React, { useEffect, useState } from 'react';
import { X, User, GitBranch, GitPullRequest, CheckCircle2, Clock, ExternalLink, Github, AlertCircle, MessageSquare, Award, TrendingUp, Zap, Activity, GitCommit, ArrowUp, ArrowDown, Calendar, Timer, Shield, Code2, FileCode, ChevronDown, ChevronUp, Target } from 'lucide-react';

/* ─── Theme Tokens ─── */
const C = {
  bg: '#fbf7ef', card: '#ffffff', text: '#2d2a26', sub: '#5e503f', muted: '#a9927d',
  border: 'rgba(169,146,125,0.15)', borderHov: 'rgba(169,146,125,0.3)',
  accent: '#a9927d', accentDk: '#5e503f',
  green: '#16a34a', greenBg: 'rgba(22,163,74,0.08)', greenBdr: 'rgba(22,163,74,0.2)',
  red: '#dc2626', redBg: 'rgba(220,38,38,0.08)', redBdr: 'rgba(220,38,38,0.2)',
  orange: '#ea580c', orangeBg: 'rgba(234,88,12,0.08)', orangeBdr: 'rgba(234,88,12,0.2)',
  blue: '#2563eb', blueBg: 'rgba(37,99,235,0.08)', blueBdr: 'rgba(37,99,235,0.2)',
  purple: '#7c3aed', purpleBg: 'rgba(124,58,237,0.08)', purpleBdr: 'rgba(124,58,237,0.2)',
};
const scoreColor = (s) => s >= 80 ? C.green : s >= 60 ? C.orange : C.red;

/* ─── Score Ring ─── */
const ScoreRing = ({ score, size = 72, sw = 6, label }) => {
  const r = (size - sw) / 2, circ = 2 * Math.PI * r, off = circ - (score / 100) * circ, col = scoreColor(score);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={sw}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={sw}
            strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}/>
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize: size*0.3, fontWeight:700, color:col }}>{score}</span>
        </div>
      </div>
      {label && <span style={{ fontSize:11, fontWeight:500, color:C.muted, textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</span>}
    </div>
  );
};

/* ─── Stat Card ─── */
const StatCard = ({ icon: Icon, label, value, color, suffix }) => (
  <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:14, display:'flex', flexDirection:'column', gap:4 }}>
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      {Icon && <Icon size={13} style={{ color:C.muted }}/>}
      <span style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.04em', fontWeight:500 }}>{label}</span>
    </div>
    <span style={{ fontSize:22, fontWeight:700, color: color||C.text, fontFamily:"'Playfair Display',serif" }}>
      {value}{suffix && <span style={{ fontSize:13, fontWeight:400, color:C.muted, marginLeft:2 }}>{suffix}</span>}
    </span>
  </div>
);

/* ─── Section Header ─── */
const Hdr = ({ icon: Icon, title, badge }) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
    <h3 style={{ fontSize:12, fontWeight:600, color:C.sub, textTransform:'uppercase', letterSpacing:'0.06em', display:'flex', alignItems:'center', gap:8, margin:0 }}>
      {Icon && <Icon size={15} style={{ color:C.accent }}/>}{title}
    </h3>
    {badge && <span style={{ fontSize:11, color:C.muted, background:C.bg, padding:'3px 10px', borderRadius:20, border:`1px solid ${C.border}` }}>{badge}</span>}
  </div>
);

/* ═══════════════════════════════════════════════════════════════ */
const TaskDetailModal = ({ task, projectId, onClose }) => {
  const [taskDetails, setTaskDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [expandedSections, setExpandedSections] = useState({ reviews: true, commits: false, aiReview: true });
  const toggle = (k) => setExpandedSections(p => ({ ...p, [k]: !p[k] }));

  useEffect(() => {
    if (!taskDetails?.dueDate) return;
    const update = () => {
      const diff = new Date(taskDetails.dueDate) - new Date();
      if (diff <= 0) {
        setTimeRemaining({ overdue: true, days: Math.abs(Math.floor(diff / 86400000)), hours: Math.abs(Math.floor((diff % 86400000) / 3600000)), minutes: Math.abs(Math.floor((diff % 3600000) / 60000)) });
      } else {
        setTimeRemaining({ overdue: false, days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000), minutes: Math.floor((diff % 3600000) / 60000) });
      }
    };
    update();
    const iv = setInterval(update, 60000);
    return () => clearInterval(iv);
  }, [taskDetails?.dueDate]);

  useEffect(() => {
    const fetchTaskDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:3000/api/projects/${projectId}/tasks/${task._id}/details`, { credentials: 'include' });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || e.error || 'Failed to fetch'); }
        setTaskDetails((await res.json()).task);
      } catch (err) { setError(err.message);
      } finally { setLoading(false); }
    };
    if (task && projectId) fetchTaskDetails();
  }, [task, projectId]);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }) : 'N/A';
  const fmtRel = (d) => { if (!d) return ''; const m = Math.floor((Date.now() - new Date(d)) / 60000); if (m < 60) return `${m}m ago`; const h = Math.floor(m/60); return h < 24 ? `${h}h ago` : `${Math.floor(h/24)}d ago`; };

  return (
    <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:16, background:'rgba(45,42,38,0.5)', backdropFilter:'blur(6px)' }} onClick={onClose}>
      <div
        style={{ background:C.bg, borderRadius:20, boxShadow:'0 25px 50px -12px rgba(45,42,38,0.25)', maxWidth:'52rem', width:'100%', maxHeight:'90vh', overflow:'hidden', fontFamily:"'Jost',sans-serif", display:'flex', flexDirection:'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Jost:wght@300;400;500;600&display=swap');
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.tsec{animation:fadeIn .35s ease both}.tsec:nth-child(2){animation-delay:.05s}.tsec:nth-child(3){animation-delay:.1s}.tsec:nth-child(4){animation-delay:.15s}.tsec:nth-child(5){animation-delay:.2s}
.hlift:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(45,42,38,0.08)}
        `}</style>

        {/* ── Header ── */}
        <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:'20px 24px', display:'flex', alignItems:'start', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8, flexWrap:'wrap' }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:600, color:C.text, margin:0 }}>{task.title}</h2>
              <span style={{
                padding:'3px 12px', borderRadius:20, fontSize:11, fontWeight:600, letterSpacing:'0.04em',
                background: (taskDetails?.status||task.status)==='done' ? C.greenBg : C.orangeBg,
                color: (taskDetails?.status||task.status)==='done' ? C.green : C.orange,
                border:`1px solid ${(taskDetails?.status||task.status)==='done' ? C.greenBdr : C.orangeBdr}`,
              }}>
                {(taskDetails?.status || task.status || 'todo').replace('_',' ').toUpperCase()}
              </span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              {taskDetails?.githubIssueUrl && (
                <a href={taskDetails.githubIssueUrl} target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', gap:4, fontSize:13, color:C.muted, textDecoration:'none' }}>
                  <Github size={14}/> #{taskDetails.githubIssueNumber} <ExternalLink size={10}/>
                </a>
              )}
              {taskDetails?.github?.issue?.labels?.map((lb, i) => (
                <span key={i} style={{ padding:'2px 8px', background:C.bg, color:C.sub, fontSize:11, borderRadius:6, border:`1px solid ${C.border}` }}>{lb}</span>
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{ color:C.muted, padding:6, background:'transparent', border:'none', cursor:'pointer', borderRadius:8, transition:'all .2s' }}
            onMouseEnter={e=>{e.currentTarget.style.background=C.bg;e.currentTarget.style.color=C.text}}
            onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=C.muted}}>
            <X size={22}/>
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{ overflow:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:18 }}>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 0', gap:12 }}>
              <div style={{ width:40, height:40, border:`3px solid ${C.border}`, borderTop:`3px solid ${C.accent}`, borderRadius:'50%', animation:'spin 1s linear infinite' }}/>
              <span style={{ fontSize:13, color:C.muted }}>Loading task details...</span>
            </div>
          ) : error ? (
            <div style={{ background:C.redBg, border:`1px solid ${C.redBdr}`, borderRadius:12, padding:16, display:'flex', alignItems:'center', gap:12 }}>
              <AlertCircle size={18} style={{ color:C.red }}/><p style={{ color:C.red, margin:0, fontSize:14 }}>{error}</p>
            </div>
          ) : taskDetails ? (
            <>
              {/* ═══ OVERALL SCORE + RINGS ═══ */}
              {taskDetails.scores?.overall != null && (
                <div className="tsec" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:24 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:20 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:20 }}>
                      <ScoreRing score={taskDetails.scores.overall} size={90} sw={7}/>
                      <div>
                        <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:600, color:C.text, margin:'0 0 4px 0' }}>Overall Score</h3>
                        <p style={{ fontSize:13, color:C.muted, margin:0 }}>Weighted average across all metrics</p>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:24 }}>
                      {taskDetails.scores.punctuality!=null && <ScoreRing score={taskDetails.scores.punctuality} size={62} sw={5} label="Punctuality"/>}
                      {taskDetails.scores.codeReview!=null && <ScoreRing score={taskDetails.scores.codeReview} size={62} sw={5} label="Code Review"/>}
                      {taskDetails.scores.codingTime!=null && <ScoreRing score={taskDetails.scores.codingTime} size={62} sw={5} label="Coding Time"/>}
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ SCORE BREAKDOWN CARDS ═══ */}
              <div className="tsec" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:14 }}>
                {/* Punctuality */}
                <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:18 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                    <div style={{ width:32, height:32, borderRadius:10, background:C.greenBg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Timer size={16} style={{ color:C.green }}/>
                    </div>
                    <div>
                      <p style={{ fontSize:12, fontWeight:600, color:C.sub, margin:0, textTransform:'uppercase', letterSpacing:'0.04em' }}>Punctuality</p>
                      <p style={{ fontSize:10, color:C.muted, margin:0 }}>100% till deadline, then decreases</p>
                    </div>
                  </div>
                  {taskDetails.scores?.punctuality!=null ? (
                    <>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
                        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:scoreColor(taskDetails.scores.punctuality) }}>{taskDetails.scores.punctuality}</span>
                        <span style={{ fontSize:12, color:C.muted }}>/100</span>
                      </div>
                      <div style={{ height:4, background:C.bg, borderRadius:2, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${taskDetails.scores.punctuality}%`, background:scoreColor(taskDetails.scores.punctuality), borderRadius:2, transition:'width 1s ease' }}/>
                      </div>
                      {timeRemaining && <p style={{ fontSize:11, color:timeRemaining.overdue?C.red:C.muted, margin:'8px 0 0 0' }}>{timeRemaining.overdue?`⚠ ${timeRemaining.days}d ${timeRemaining.hours}h overdue`:`${timeRemaining.days}d ${timeRemaining.hours}h remaining`}</p>}
                    </>
                  ) : <p style={{ fontSize:12, color:C.muted, margin:0 }}>No deadline set</p>}
                </div>

                {/* Code Review */}
                <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:18 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                    <div style={{ width:32, height:32, borderRadius:10, background:C.blueBg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Shield size={16} style={{ color:C.blue }}/>
                    </div>
                    <div>
                      <p style={{ fontSize:12, fontWeight:600, color:C.sub, margin:0, textTransform:'uppercase', letterSpacing:'0.04em' }}>Code Review</p>
                      <p style={{ fontSize:10, color:C.muted, margin:0 }}>Fewer issues → higher score</p>
                    </div>
                  </div>
                  {taskDetails.scores?.codeReview!=null ? (
                    <>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
                        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:scoreColor(taskDetails.scores.codeReview) }}>{taskDetails.scores.codeReview}</span>
                        <span style={{ fontSize:12, color:C.muted }}>/100</span>
                      </div>
                      <div style={{ height:4, background:C.bg, borderRadius:2, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${taskDetails.scores.codeReview}%`, background:scoreColor(taskDetails.scores.codeReview), borderRadius:2, transition:'width 1s ease' }}/>
                      </div>
                      <div style={{ display:'flex', gap:12, marginTop:8, fontSize:11, color:C.muted }}>
                        {taskDetails.github?.reviews && (
                          <>
                            <span style={{ color:C.green }}>✓ {taskDetails.github.reviews.filter(r=>r.state==='APPROVED').length} approved</span>
                            <span style={{ color:C.red }}>✗ {taskDetails.github.reviews.filter(r=>r.state==='CHANGES_REQUESTED').length} changes</span>
                          </>
                        )}
                      </div>
                    </>
                  ) : <p style={{ fontSize:12, color:C.muted, margin:0 }}>No PRs submitted yet</p>}
                </div>

                {/* Coding Time */}
                <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:18 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                    <div style={{ width:32, height:32, borderRadius:10, background:C.purpleBg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Code2 size={16} style={{ color:C.purple }}/>
                    </div>
                    <div>
                      <p style={{ fontSize:12, fontWeight:600, color:C.sub, margin:0, textTransform:'uppercase', letterSpacing:'0.04em' }}>Coding Time</p>
                      <p style={{ fontSize:10, color:C.muted, margin:0 }}>Proportional to estimated hours</p>
                    </div>
                  </div>
                  {taskDetails.scores?.codingTime!=null ? (
                    <>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
                        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:scoreColor(taskDetails.scores.codingTime) }}>{taskDetails.scores.codingTime}</span>
                        <span style={{ fontSize:12, color:C.muted }}>/100</span>
                      </div>
                      <div style={{ height:4, background:C.bg, borderRadius:2, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${taskDetails.scores.codingTime}%`, background:scoreColor(taskDetails.scores.codingTime), borderRadius:2, transition:'width 1s ease' }}/>
                      </div>
                      <p style={{ fontSize:11, color:C.muted, margin:'8px 0 0 0' }}>
                        {(taskDetails.wakatime?.assigneeStats?.reduce((s,a)=>s+(a.totalHours||0),0)||0).toFixed(1)}h coded / {taskDetails.estimatedHours||'?'}h estimated
                      </p>
                    </>
                  ) : <p style={{ fontSize:12, color:C.muted, margin:0 }}>No coding time data</p>}
                </div>
              </div>

              {/* ═══ COUNTDOWN + ASSIGNEES ═══ */}
              <div className="tsec" style={{ display:'grid', gridTemplateColumns: taskDetails.dueDate ? '1fr 1fr' : '1fr', gap:14 }}>
                {taskDetails.dueDate && timeRemaining && (
                  <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:18 }}>
                    <Hdr icon={Calendar} title={timeRemaining.overdue?'Overdue':'Time Left'} badge={fmtDate(taskDetails.dueDate)}/>
                    <div style={{ display:'flex', gap:10 }}>
                      {[{v:timeRemaining.days,l:'Days'},{v:timeRemaining.hours,l:'Hrs'},{v:timeRemaining.minutes,l:'Min'}].map((it,i)=>(
                        <div key={i} style={{ flex:1, background:C.bg, borderRadius:10, padding:'12px 8px', textAlign:'center', border:`1px solid ${C.border}` }}>
                          <div style={{ fontSize:24, fontWeight:700, color: timeRemaining.overdue?C.red:timeRemaining.days<=1?C.orange:C.green, fontFamily:"'Playfair Display',serif" }}>{it.v}</div>
                          <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:'0.04em', marginTop:2 }}>{it.l}</div>
                        </div>
                      ))}
                    </div>
                    {taskDetails.estimatedHours > 0 && (
                      <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:6, fontSize:12, color:C.muted }}>
                        <Clock size={12}/> Est. {taskDetails.estimatedHours}h ({Math.ceil(taskDetails.estimatedHours/8)}d)
                      </div>
                    )}
                  </div>
                )}

                {taskDetails.assignees?.length > 0 && (
                  <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:18 }}>
                    <Hdr icon={User} title="Assigned To"/>
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      {taskDetails.assignees.map((a,i)=>{
                        const wk = taskDetails.wakatime?.assigneeStats?.find(s=>s.name===a);
                        return (
                          <div key={i} style={{ display:'flex', alignItems:'center', gap:12, background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px' }}>
                            <div style={{ width:36, height:36, borderRadius:'50%', background:C.card, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, color:C.sub, border:`2px solid ${C.border}`, fontWeight:600 }}>
                              {a.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex:1 }}>
                              <p style={{ color:C.text, fontWeight:500, margin:0, fontSize:14 }}>{a}</p>
                              {wk?.connected && (
                                <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:C.muted, marginTop:2 }}>
                                  <Activity size={11} style={{ color:C.green }}/> <span style={{ color:C.green }}>{wk.totalHours}h/wk</span>
                                  <span style={{ color:C.border }}>|</span> <span>{wk.dailyAverage}h/day</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* ═══ AI CODE REVIEW ═══ */}
              {taskDetails.github?.aiReview && (
                <div className="tsec" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
                  <div onClick={()=>toggle('aiReview')} style={{ padding:18, display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}>
                    <div style={{ flex:1 }}>
                      <h3 style={{ fontSize:14, fontWeight:600, color:C.text, margin:0 }}>AI Code Review</h3>
                      <p style={{ fontSize:12, color:C.muted, margin:'2px 0 0 0', maxWidth:420, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{taskDetails.github.aiReview.summary}</p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:18, fontWeight:700, fontFamily:"'Playfair Display',serif", color:scoreColor(taskDetails.github.aiReview.qualityScore) }}>
                        {taskDetails.github.aiReview.qualityScore}/100
                      </span>
                      {expandedSections.aiReview ? <ChevronUp size={16} style={{ color:C.muted }}/> : <ChevronDown size={16} style={{ color:C.muted }}/>}
                    </div>
                  </div>
                  {expandedSections.aiReview && (
                    <div style={{ borderTop:`1px solid ${C.border}`, padding:'14px 18px', display:'flex', flexDirection:'column', gap:12 }}>

                      {/* Issue Addressal Check */}
                      {taskDetails.github.aiReview.issueAddressal && (
                        <div style={{ padding:'12px 14px', borderRadius:10, border:`1px solid ${taskDetails.github.aiReview.issueAddressal.addressed ? C.greenBdr : C.redBdr}`, background: taskDetails.github.aiReview.issueAddressal.addressed ? C.greenBg : C.redBg }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                            <span style={{ fontSize:12, fontWeight:600, color: taskDetails.github.aiReview.issueAddressal.addressed ? C.green : C.red }}>
                              {taskDetails.github.aiReview.issueAddressal.addressed ? '✓ Issue Addressed' : '✗ Issue Not Fully Addressed'}
                            </span>
                            <span style={{ fontSize:11, color:C.muted }}>{taskDetails.github.aiReview.issueAddressal.confidence}% confidence</span>
                          </div>
                          <p style={{ fontSize:12, color:C.text, margin:0, lineHeight:1.5 }}>{taskDetails.github.aiReview.issueAddressal.reasoning}</p>
                          {taskDetails.github.aiReview.issueAddressal.missingItems?.length > 0 && (
                            <div style={{ marginTop:8 }}>
                              <p style={{ fontSize:11, fontWeight:600, color:C.red, margin:'0 0 4px 0' }}>Missing:</p>
                              {taskDetails.github.aiReview.issueAddressal.missingItems.map((item,idx)=>(
                                <p key={idx} style={{ fontSize:12, color:C.text, margin:'2px 0', paddingLeft:10, borderLeft:`2px solid ${C.redBdr}` }}>• {item}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Issues */}
                      {taskDetails.github.aiReview.issues?.length>0 && (
                        <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:250, overflowY:'auto' }}>
                          {taskDetails.github.aiReview.issues.map((iss,i)=>(
                            <div key={i} style={{ display:'flex', gap:10, padding:'10px 12px', background:C.bg, borderRadius:10, border:`1px solid ${C.border}` }}>
                              <span style={{
                                fontSize:10, fontWeight:600, textTransform:'uppercase', padding:'2px 8px', borderRadius:4, whiteSpace:'nowrap', height:'fit-content',
                                background: iss.severity==='critical'?C.redBg:iss.severity==='high'?C.orangeBg:iss.severity==='medium'?'#fef3c7':C.greenBg,
                                color: iss.severity==='critical'?C.red:iss.severity==='high'?C.orange:iss.severity==='medium'?'#92400e':C.green,
                                border:`1px solid ${iss.severity==='critical'?C.redBdr:iss.severity==='high'?C.orangeBdr:iss.severity==='medium'?'#fde68a':C.greenBdr}`,
                              }}>{iss.severity}</span>
                              <div style={{ flex:1 }}>
                                <p style={{ fontSize:13, color:C.text, margin:0, fontWeight:500 }}>{iss.message}</p>
                                {iss.file && <p style={{ fontSize:11, color:C.muted, margin:'2px 0 0 0', fontFamily:'monospace' }}>{iss.file}{iss.line?`:${iss.line}`:''}</p>}
                                {iss.suggestion && (
                                  <div style={{ marginTop:6, padding:'6px 10px', background:C.greenBg, borderRadius:6, fontSize:12, color:C.sub, borderLeft:`3px solid ${C.green}` }}>
                                    Suggestion: {iss.suggestion}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Suggested Changes */}
                      {taskDetails.github.aiReview.suggestedChanges?.length > 0 && (
                        <div>
                          <p style={{ fontSize:12, fontWeight:600, color:C.sub, margin:'0 0 8px 0', textTransform:'uppercase', letterSpacing:'0.04em' }}>Suggested Changes</p>
                          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                            {taskDetails.github.aiReview.suggestedChanges.map((sc,i)=>(
                              <div key={i} style={{ padding:'10px 12px', background:C.bg, borderRadius:10, border:`1px solid ${C.border}`, borderLeft:`3px solid ${sc.priority==='high'?C.orange:sc.priority==='medium'?C.accent:C.muted}` }}>
                                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                                  <span style={{ fontFamily:'monospace', fontSize:11, color:C.sub, fontWeight:500 }}>{sc.file}</span>
                                  <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', color: sc.priority==='high'?C.orange:sc.priority==='medium'?C.sub:C.muted }}>{sc.priority}</span>
                                </div>
                                <p style={{ fontSize:12, color:C.text, margin:0, lineHeight:1.5 }}>{sc.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ GITHUB REVIEW COMMENTS ═══ */}
              {taskDetails.github?.reviewComments?.length > 0 && (
                <div className="tsec" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
                  <div onClick={()=>toggle('reviews')} style={{ padding:18, display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flex:1, marginRight:10 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:C.sub, textTransform:'uppercase', letterSpacing:'0.06em' }}>Code Review Comments</span>
                      <span style={{ fontSize:11, color:C.muted, background:C.bg, padding:'3px 10px', borderRadius:20, border:`1px solid ${C.border}` }}>{taskDetails.github.reviewComments.length}</span>
                    </div>
                    {expandedSections.reviews ? <ChevronUp size={16} style={{ color:C.muted }}/> : <ChevronDown size={16} style={{ color:C.muted }}/>}
                  </div>
                  {expandedSections.reviews && (
                    <div style={{ borderTop:`1px solid ${C.border}`, padding:'14px 18px', display:'flex', flexDirection:'column', gap:8, maxHeight:300, overflowY:'auto' }}>
                      {taskDetails.github.reviewComments.map((cm,i)=>(
                        <div key={i} style={{ padding:'10px 12px', background:C.bg, borderRadius:10, border:`1px solid ${C.border}` }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                            <span style={{ fontSize:12, fontWeight:600, color:cm.authorType==='bot'?C.purple:C.blue }}>{cm.author}</span>
                            {cm.authorType==='bot' && <span style={{ fontSize:9, background:C.purpleBg, color:C.purple, padding:'1px 6px', borderRadius:4, fontWeight:600 }}>BOT</span>}
                            {cm.path && <span style={{ fontSize:11, color:C.muted, fontFamily:'monospace' }}>{cm.path}{cm.line?`:${cm.line}`:''}</span>}
                            <span style={{ fontSize:11, color:C.muted, marginLeft:'auto' }}>{fmtRel(cm.createdAt)}</span>
                          </div>
                          <p style={{ fontSize:12, color:C.text, margin:0, lineHeight:1.5, whiteSpace:'pre-wrap', maxHeight:120, overflow:'hidden' }}>{cm.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ CODE STATISTICS ═══ */}
              {taskDetails.github?.connected && taskDetails.github.prs?.length > 0 && (
                <div className="tsec" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                  <StatCard icon={ArrowUp} label="Lines Added" value={`+${taskDetails.github.stats?.totalAdditions||0}`} color={C.green}/>
                  <StatCard icon={ArrowDown} label="Lines Deleted" value={`-${taskDetails.github.stats?.totalDeletions||0}`} color={C.red}/>
                  <StatCard icon={FileCode} label="Files Changed" value={taskDetails.github.stats?.totalChangedFiles||0} color={C.blue}/>
                  <StatCard icon={GitPullRequest} label="Merged PRs" value={taskDetails.github.stats?.mergedPRs||0} suffix={`/${taskDetails.github.prs.length}`} color={C.purple}/>
                </div>
              )}

              {/* ═══ BRANCH ACTIVITY ═══ */}
              {taskDetails.github?.branch && (
                <div className="tsec" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
                  <div onClick={()=>toggle('commits')} style={{ padding:18, display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}>
                    <Hdr icon={GitBranch} title="Branch Activity"/>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontFamily:'monospace', fontSize:11, background:C.bg, padding:'3px 10px', borderRadius:20, color:C.sub, border:`1px solid ${C.border}` }}>
                        {taskDetails.github.branch.branchName}
                      </span>
                      {expandedSections.commits ? <ChevronUp size={16} style={{ color:C.muted }}/> : <ChevronDown size={16} style={{ color:C.muted }}/>}
                    </div>
                  </div>
                  {expandedSections.commits && (
                    <div style={{ borderTop:`1px solid ${C.border}`, padding:'14px 18px' }}>
                      {taskDetails.github.branch.comparison && (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14 }}>
                          <StatCard icon={ArrowUp} label="Ahead" value={taskDetails.github.branch.comparison.aheadBy} color={C.green}/>
                          <StatCard icon={ArrowDown} label="Behind" value={taskDetails.github.branch.comparison.behindBy} color={C.orange}/>
                          <StatCard icon={FileCode} label="Files" value={taskDetails.github.branch.comparison.filesChanged} color={C.blue}/>
                          <StatCard icon={GitCommit} label="Commits" value={taskDetails.github.branch.comparison.totalCommits} color={C.purple}/>
                        </div>
                      )}
                      {taskDetails.github.branch.commits?.length > 0 && (
                        <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:240, overflowY:'auto' }}>
                          {taskDetails.github.branch.commits.slice(0,10).map(cm=>(
                            <a key={cm.sha} href={cm.url} target="_blank" rel="noopener noreferrer" className="hlift"
                              style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:C.bg, borderRadius:10, border:`1px solid ${C.border}`, textDecoration:'none', transition:'all .2s' }}>
                              <div style={{ width:28, height:28, borderRadius:'50%', background:C.card, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:C.sub, border:`1px solid ${C.border}`, fontWeight:600, flexShrink:0 }}>
                                {cm.author.charAt(0).toUpperCase()}
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <p style={{ fontSize:13, color:C.text, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cm.message.split('\n')[0]}</p>
                                <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:C.muted, marginTop:2 }}>
                                  <span>{cm.author}</span>
                                  <span style={{ fontFamily:'monospace', fontSize:10, background:C.card, padding:'1px 6px', borderRadius:4, border:`1px solid ${C.border}` }}>{cm.sha.substring(0,7)}</span>
                                  <span>{fmtRel(cm.date)}</span>
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ PULL REQUESTS ═══ */}
              {taskDetails.github?.prs?.length > 0 && (
                <div className="tsec" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:18 }}>
                  <Hdr icon={GitPullRequest} title="Pull Requests" badge={`${taskDetails.github.prs.length}`}/>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {taskDetails.github.prs.map(pr=>(
                      <a key={pr.number} href={pr.url} target="_blank" rel="noopener noreferrer" className="hlift"
                        style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', background:C.bg, borderRadius:10, border:`1px solid ${C.border}`, textDecoration:'none', transition:'all .2s', gap:12 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
                          {pr.merged ? <CheckCircle2 size={16} style={{ color:C.purple, flexShrink:0 }}/> : pr.state==='open' ? <GitPullRequest size={16} style={{ color:C.green, flexShrink:0 }}/> : <X size={16} style={{ color:C.red, flexShrink:0 }}/>}
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:13, color:C.text, fontWeight:500, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>#{pr.number} {pr.title}</p>
                            <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:C.muted, marginTop:2 }}>
                              <span>{pr.author}</span>
                              <span style={{ color:C.green }}>+{pr.additions}</span>
                              <span style={{ color:C.red }}>-{pr.deletions}</span>
                              {pr.reviewScore>0 && (
                                <span style={{ display:'flex', alignItems:'center', gap:3 }}>
                                  <Award size={10} style={{ color:scoreColor(pr.reviewScore) }}/>
                                  <span style={{ color:scoreColor(pr.reviewScore), fontWeight:600 }}>{pr.reviewScore}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span style={{
                          padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:600, flexShrink:0,
                          background:pr.merged?C.purpleBg:pr.state==='open'?C.greenBg:C.redBg,
                          color:pr.merged?C.purple:pr.state==='open'?C.green:C.red,
                          border:`1px solid ${pr.merged?C.purpleBdr:pr.state==='open'?C.greenBdr:C.redBdr}`,
                        }}>
                          {pr.merged?'MERGED':pr.state.toUpperCase()}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* ═══ DESCRIPTION + TIMELINE ═══ */}
              <div className="tsec" style={{ display:'grid', gridTemplateColumns:taskDetails.description?'1fr 1fr':'1fr', gap:14 }}>
                {taskDetails.description && (
                  <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:18 }}>
                    <Hdr icon={FileCode} title="Description"/>
                    <p style={{ fontSize:13, color:C.text, margin:0, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{taskDetails.description}</p>
                  </div>
                )}
                <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:18 }}>
                  <Hdr icon={Clock} title="Timeline"/>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {[['Created',taskDetails.createdAt],['Updated',taskDetails.updatedAt],taskDetails.dueDate&&['Due Date',taskDetails.dueDate]].filter(Boolean).map(([lb,dt],i)=>(
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                        <span style={{ color:C.muted }}>{lb}</span>
                        <span style={{ color:lb==='Due Date'&&timeRemaining?.overdue?C.red:C.text, fontWeight:500 }}>{fmtDate(dt)}</span>
                      </div>
                    ))}
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

