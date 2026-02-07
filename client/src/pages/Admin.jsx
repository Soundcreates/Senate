import React, { useState } from 'react';
import { Send, Loader2, Plus, Clock, Users, CheckCircle2, ArrowRight, ArrowLeft, DollarSign, X, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getRecommendations } from '../Apis/recommendationApi';

// Fallback recommended people if RAG fails
const fallbackPeople = [
  { id: 1, name: 'Alice Chen', role: 'Full-Stack', match: 92, avatar: '👩‍💻', reason: 'Strong full-stack experience with React and Node.js. Previously led similar projects with successful outcomes.' },
  { id: 2, name: 'Bob Kumar', role: 'Blockchain', match: 88, avatar: '👨‍💻', reason: 'Expert in smart contracts and Web3 integration. Has deep knowledge of Ethereum and DeFi protocols.' },
  { id: 3, name: 'Charlie Park', role: 'UI/UX', match: 90, avatar: '🎨', reason: 'Exceptional design skills with modern frameworks. Specializes in user-centered design and prototyping.' },
  { id: 4, name: 'Diana Patel', role: 'AI/ML', match: 85, avatar: '🧠', reason: 'Machine learning specialist with experience in RAG pipelines and AI integration for web applications.' },
  { id: 5, name: 'Ethan Lee', role: 'DevOps', match: 82, avatar: '⚙️', reason: 'DevOps expert skilled in cloud infrastructure, CI/CD, and containerization using Docker and Kubernetes.' },
];

const budgetOptions = [
  { label: '$1K-5K', value: '1k-5k' },
  { label: '$5K-15K', value: '5k-15k' },
  { label: '$15K-50K', value: '15k-50k' },
  { label: '$50K+', value: '50k+' },
];

const Admin = () => {
  const [step, setStep] = useState(1);
  const [projectDescription, setProjectDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [teamSize, setTeamSize] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [taskAssignments, setTaskAssignments] = useState({}); // { taskId: [person1, person2, ...] }
  const [draggedPerson, setDraggedPerson] = useState(null);
  const [recommendedPeople, setRecommendedPeople] = useState(fallbackPeople);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [expandedPerson, setExpandedPerson] = useState(null);

  const splitIntoTasks = async (prompt) => {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Break down this project into ${teamSize + 1} tasks. Return ONLY JSON array:
[{"id": 1, "title": "Task", "description": "Description", "priority": "High|Medium|Low", "estimatedHours": number}]
Project: "${prompt}". Return ONLY JSON.`
              }]
            }]
          })
        }
      );
      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        let text = data.candidates[0].content.parts[0].text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(text);
      }
      return [];
    } catch (e) { return []; }
  };

  const handleStep1Submit = (e) => { e.preventDefault(); if (projectDescription.trim()) setStep(2); };
  const handleStep2Submit = () => { if (budget) setStep(3); };
  const handleStep3Submit = async () => {
    setStep(4);
    setIsLoading(true);
    setIsLoadingRecommendations(true);

    // Fetch recommendations from RAG endpoint
    try {
      const query = `Find team members for this project: ${projectDescription}. Budget: ${budget}, Team size: ${teamSize}`;
      const context = {
        projectDescription,
        budget,
        teamSize,
        type: 'team_recommendation'
      };

      const recommendationResult = await getRecommendations(query, context);
      
      console.log('[Admin] Recommendation result:', recommendationResult);

      if (recommendationResult.ok && recommendationResult.data) {
        // Parse and format the recommendations from RAG
        const ragData = recommendationResult.data;
        
        console.log('[Admin] RAG data received:', ragData);
        console.log('[Admin] RAG data type:', typeof ragData, Array.isArray(ragData));
        
        // Check if this is just a workflow start message (n8n returns this when configured for immediate response)
        if (ragData.message === 'Workflow was started') {
          console.warn('[Admin] RAG workflow started but no data returned yet. Using fallback.');
          setRecommendedPeople(fallbackPeople);
          setUsingFallback(true);
        } else {
          // Try to extract people from various possible response structures
          let people = [];

          if (Array.isArray(ragData)) {
            // Direct array of people
            people = ragData;
          } else if (ragData.name && ragData.userid) {
            // Single person object - wrap in array
            people = [ragData];
            console.log('[Admin] Received single person object, converted to array');
          } else if (ragData.recommendations && Array.isArray(ragData.recommendations)) {
            people = ragData.recommendations;
          } else if (ragData.team && Array.isArray(ragData.team)) {
            people = ragData.team;
          } else if (ragData.people && Array.isArray(ragData.people)) {
            people = ragData.people;
          } else if (ragData.data) {
            // Check if data property contains recommendations
            if (Array.isArray(ragData.data)) {
              people = ragData.data;
            } else if (ragData.data.name && ragData.data.userid) {
              people = [ragData.data];
            }
          }

          // Format people to match expected structure
          if (people.length > 0) {
            // Default avatars and roles for variety
            const defaultAvatars = ['👨‍💻', '👩‍💻', '🧑‍💻', '👨‍🔬', '👩‍🔬', '🧑‍🎨', '👨‍🏫', '👩‍🏫'];
            const defaultRoles = ['Full-Stack', 'Backend', 'Frontend', 'DevOps', 'Data Science', 'UI/UX', 'Mobile', 'AI/ML'];
            
            const formattedPeople = people.slice(0, 5).map((person, index) => {
              // Parse match field - handle both number and string formats (e.g., "100%" or 100)
              let matchScore = 95 - index * 3; // Default descending scores
              if (person.match) {
                if (typeof person.match === 'string') {
                  // Remove "%" and parse as integer
                  matchScore = parseInt(person.match.replace('%', ''));
                } else if (typeof person.match === 'number') {
                  matchScore = person.match;
                }
              } else if (person.score) {
                matchScore = typeof person.score === 'number' ? person.score : parseInt(person.score);
              }
              
              return {
                id: person.id || person.userid || index + 1,
                name: person.name || `Team Member ${index + 1}`,
                role: person.role || person.skills || defaultRoles[index % defaultRoles.length],
                match: matchScore,
                avatar: person.avatar || defaultAvatars[index % defaultAvatars.length],
                reason: person.reason || person.explanation || person.why || 
                        `Strong technical background and experience relevant to ${projectDescription}. Recommended based on AI-powered skill matching and project requirements.`
              };
            });

            setRecommendedPeople(formattedPeople);
            setUsingFallback(false);
            console.log('[Admin] Successfully loaded RAG recommendations:', formattedPeople);
          } else {
            console.log('[Admin] No people in RAG response, using fallback');
            setRecommendedPeople(fallbackPeople);
            setUsingFallback(true);
          }
        }
      } else {
        console.warn('[Admin] RAG recommendations failed, using fallback:', recommendationResult.error);
        setRecommendedPeople(fallbackPeople);
        setUsingFallback(true);
      }
    } catch (error) {
      console.error('[Admin] ✗ Error fetching recommendations:', error);
      setRecommendedPeople(fallbackPeople);
      setUsingFallback(true);
    }

    setIsLoadingRecommendations(false);

    // Generate tasks
    const generatedTasks = await splitIntoTasks(projectDescription);
    setTasks(generatedTasks);
    // Initialize empty arrays for each task
    const initial = {};
    generatedTasks.forEach(t => initial[t.id] = []);
    setTaskAssignments(initial);
    setIsLoading(false);
  };

  const handleDragStart = (person) => setDraggedPerson(person);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (taskId) => {
    if (draggedPerson) {
      setTaskAssignments(prev => {
        const current = prev[taskId] || [];
        // Allow same person on multiple tasks, but not duplicate on same task
        if (!current.find(p => p.id === draggedPerson.id)) {
          return { ...prev, [taskId]: [...current, draggedPerson] };
        }
        return prev;
      });
      setDraggedPerson(null);
    }
  };

  const removeFromTask = (taskId, personId) => {
    setTaskAssignments(prev => ({
      ...prev,
      [taskId]: (prev[taskId] || []).filter(p => p.id !== personId)
    }));
  };

  const getPriorityColor = (p) => {
    if (p === 'High') return '#dc2626';
    if (p === 'Medium') return '#ea580c';
    return '#16a34a';
  };

  const selectedTeam = recommendedPeople.slice(0, teamSize);
  const top5People = recommendedPeople.slice(0, 5);

  return (
    <div style={{ minHeight: '100vh', background: '#fbf7ef', fontFamily: "'Jost', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=Jost:wght@300;400;500;600&display=swap');`}</style>
      
      {/* Logo - Top Left */}
      {step === 4 && (
        <div style={{ position: 'absolute', top: '20px', left: '24px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
          <img src="/logo.png" alt="Senate" style={{ height: '24px', width: 'auto' }} />
        </div>
      )}

      {/* Step 1: Project */}
      {step === 1 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ fontFamily: "'Playfair Display', serif", fontSize: '42px', fontWeight: '500', color: '#2d2a26', marginBottom: '32px' }}>
            Build Anything.
          </motion.h1>
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            onSubmit={handleStep1Submit} style={{ width: '100%', maxWidth: '520px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '24px', border: '1px solid rgba(169,146,125,0.3)', padding: '5px 5px 5px 14px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
              <Plus size={18} style={{ color: '#a9927d', marginRight: '10px' }} />
              <input type="text" value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Describe your project..." style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '15px', color: '#2d2a26' }} />
              <button type="submit" disabled={!projectDescription.trim()}
                style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: projectDescription.trim() ? '#a9927d' : 'rgba(169,146,125,0.3)', color: 'white', cursor: projectDescription.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowRight size={16} />
              </button>
            </div>
          </motion.form>
        </div>
      )}

      {/* Step 2: Budget */}
      {step === 2 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <DollarSign size={36} style={{ color: '#a9927d', marginBottom: '12px' }} />
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', color: '#2d2a26', marginBottom: '8px' }}>Budget?</h2>
          <p style={{ fontSize: '14px', color: '#a9927d', marginBottom: '24px' }}>Select your project budget range</p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '24px' }}>
            {budgetOptions.map((opt) => (
              <button key={opt.value} onClick={() => setBudget(opt.value)}
                style={{ padding: '10px 20px', borderRadius: '20px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', background: budget === opt.value ? '#a9927d' : 'white', color: budget === opt.value ? 'white' : '#2d2a26', border: budget === opt.value ? 'none' : '1px solid rgba(169,146,125,0.3)' }}>
                {opt.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setStep(1)} style={{ padding: '10px 20px', borderRadius: '20px', border: '1px solid rgba(169,146,125,0.3)', background: 'white', color: '#2d2a26', fontSize: '14px', cursor: 'pointer' }}><ArrowLeft size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Back</button>
            <button onClick={handleStep2Submit} disabled={!budget} style={{ padding: '10px 20px', borderRadius: '20px', border: 'none', background: budget ? '#a9927d' : 'rgba(169,146,125,0.3)', color: 'white', fontSize: '14px', fontWeight: '600', cursor: budget ? 'pointer' : 'not-allowed' }}>Continue <ArrowRight size={14} style={{ marginLeft: '4px', verticalAlign: 'middle' }} /></button>
          </div>
        </div>
      )}

      {/* Step 3: Team Size */}
      {step === 3 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <Users size={36} style={{ color: '#a9927d', marginBottom: '12px' }} />
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', color: '#2d2a26', marginBottom: '8px' }}>Team Size?</h2>
          <p style={{ fontSize: '14px', color: '#a9927d', marginBottom: '24px' }}>How many people on your team?</p>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            {[2, 3, 4, 5].map((s) => (
              <button key={s} onClick={() => setTeamSize(s)}
                style={{ width: '48px', height: '48px', borderRadius: '50%', fontSize: '18px', fontWeight: '600', cursor: 'pointer', background: teamSize === s ? '#a9927d' : 'white', color: teamSize === s ? 'white' : '#2d2a26', border: teamSize === s ? 'none' : '1px solid rgba(169,146,125,0.3)' }}>
                {s}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setStep(2)} style={{ padding: '10px 20px', borderRadius: '20px', border: '1px solid rgba(169,146,125,0.3)', background: 'white', color: '#2d2a26', fontSize: '14px', cursor: 'pointer' }}><ArrowLeft size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Back</button>
            <button onClick={handleStep3Submit} style={{ padding: '10px 20px', borderRadius: '20px', border: 'none', background: '#a9927d', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Generate <ArrowRight size={14} style={{ marginLeft: '4px', verticalAlign: 'middle' }} /></button>
          </div>
        </div>
      )}

      {/* Step 4: Assignment */}
      {step === 4 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 24px' }}>
          {isLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <Loader2 className="animate-spin" size={24} style={{ color: '#a9927d' }} />
              <span style={{ color: '#a9927d' }}>Generating...</span>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#2d2a26', margin: 0 }}>{projectDescription}</h2>
                <p style={{ fontSize: '13px', color: '#a9927d', margin: '4px 0 0' }}>Drag team members to tasks • One person can do multiple tasks</p>
              </div>

              <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
                {/* Tasks */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {tasks.map((task) => (
                    <div key={task.id} onDragOver={handleDragOver} onDrop={() => handleDrop(task.id)}
                      style={{ background: 'white', border: '1px solid rgba(169,146,125,0.15)', borderRadius: '12px', padding: '12px 14px', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#a9927d', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600' }}>{task.id}</span>
                        <span style={{ fontWeight: '600', color: '#2d2a26', fontSize: '14px', flex: 1 }}>{task.title}</span>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(169,146,125,0.1)', color: getPriorityColor(task.priority), fontWeight: '600' }}>{task.priority}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#5e503f', margin: '0 0 8px 30px' }}>{task.description}</p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginLeft: '30px', minHeight: '28px' }}>
                        {(taskAssignments[task.id] || []).map(p => (
                          <span key={p.id} onClick={() => removeFromTask(task.id, p.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '14px', background: 'rgba(169,146,125,0.15)', fontSize: '11px', cursor: 'pointer' }}>
                            {p.avatar} {p.name.split(' ')[0]} <X size={10} style={{ color: '#a9927d' }} />
                          </span>
                        ))}
                        {(taskAssignments[task.id] || []).length === 0 && (
                          <span style={{ fontSize: '11px', color: '#a9927d', fontStyle: 'italic' }}>Drop here</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Top 5 Recommendations */}
                <div style={{ width: '280px', background: 'white', borderRadius: '12px', border: '1px solid rgba(169,146,125,0.15)', padding: '14px', overflowY: 'auto' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#2d2a26', margin: '0 0 12px' }}>
                    Top 5 Recommendations {isLoadingRecommendations && <Loader2 className="animate-spin" size={12} style={{ display: 'inline', marginLeft: '4px', color: '#a9927d' }} />}
                  </p>
                  {usingFallback && !isLoadingRecommendations && (
                    <div style={{ fontSize: '10px', color: '#ea580c', background: 'rgba(234,88,12,0.1)', padding: '6px 8px', borderRadius: '6px', marginBottom: '10px', lineHeight: '1.3' }}>
                      ⚠ Using default recommendations. RAG service unavailable.
                    </div>
                  )}
                  {isLoadingRecommendations ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0', flexDirection: 'column', gap: '8px' }}>
                      <Loader2 className="animate-spin" size={20} style={{ color: '#a9927d' }} />
                      <span style={{ fontSize: '11px', color: '#a9927d' }}>Loading recommendations...</span>
                    </div>
                  ) : (
                    top5People.map((person, index) => (
                      <div key={person.id} 
                        draggable={index < teamSize} 
                        onDragStart={index < teamSize ? () => handleDragStart(person) : undefined}
                        style={{ 
                          marginBottom: '8px', 
                          borderRadius: '10px', 
                          background: '#fbf7ef', 
                          border: '1px solid rgba(169,146,125,0.1)',
                          overflow: 'hidden'
                        }}>
                        <div 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            padding: '8px 10px', 
                            cursor: index < teamSize ? 'grab' : 'default',
                            opacity: index < teamSize ? 1 : 0.6
                          }}>
                          <span style={{ fontSize: '20px' }}>{person.avatar}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '13px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{person.name}</p>
                            <p style={{ fontSize: '10px', color: '#a9927d', margin: 0 }}>{person.role}</p>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#16a34a' }}>{person.match}%</span>
                            <button 
                              onClick={() => setExpandedPerson(expandedPerson === person.id ? null : person.id)}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                cursor: 'pointer', 
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                color: '#a9927d'
                              }}>
                              {expandedPerson === person.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                        </div>
                        {expandedPerson === person.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ 
                              padding: '0 10px 10px 10px',
                              borderTop: '1px solid rgba(169,146,125,0.1)'
                            }}>
                            <p style={{ 
                              fontSize: '10px', 
                              color: '#5e503f', 
                              margin: '8px 0 0', 
                              lineHeight: '1.4',
                              fontStyle: 'italic'
                            }}>
                              <strong style={{ color: '#a9927d' }}>Why picked:</strong> {person.reason}
                            </p>
                          </motion.div>
                        )}
                      </div>
                    ))
                  )}
                  {!isLoadingRecommendations && (
                    <p style={{ fontSize: '10px', color: '#a9927d', marginTop: '12px', textAlign: 'center', fontStyle: 'italic' }}>
                      {teamSize < 5 ? `Drag top ${teamSize} to assign tasks` : 'Drag any to assign tasks'}
                    </p>
                  )}
                </div>
              </div>

              {/* Create Project Button */}
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  style={{ padding: '14px 32px', borderRadius: '14px', border: 'none', background: '#a9927d', color: 'white', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(169,146,125,0.3)' }}>
                  <CheckCircle2 size={18} /> Create Project
                </motion.button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Admin;
