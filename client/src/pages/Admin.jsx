import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, Plus, Clock, Users, CheckCircle2, ArrowRight, ArrowLeft, DollarSign, X, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getRecommendations } from '../Apis/recommendationApi';
import { generateTitle as generateTitleApi, splitTasks as splitTasksApi } from '../Apis/geminiApi';
import { createFullProject } from '../Apis/projectApis';

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
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [projectDescription, setProjectDescription] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [budget, setBudget] = useState(5000); // Default 5k
  const [deadline, setDeadline] = useState('');
  const [teamSize, setTeamSize] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [taskAssignments, setTaskAssignments] = useState({}); // { taskId: [person1, person2, ...] }
  const [draggedPerson, setDraggedPerson] = useState(null);
  const [recommendedPeople, setRecommendedPeople] = useState(fallbackPeople);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [expandedPerson, setExpandedPerson] = useState(null);
  const [loadingStage, setLoadingStage] = useState(0);
  const [createdProjectId, setCreatedProjectId] = useState(null);
  const [saveError, setSaveError] = useState(null);

  // Calculate progress percentage
  const progress = (step / 8) * 100;

  // Multi-stage loading messages
  const loadingMessages = [
    { text: 'Analyzing project requirements...', duration: 0 },
    { text: 'Searching talent database...', duration: 15000 },
    { text: 'Evaluating skill matches...', duration: 30000 },
    { text: 'Ranking candidates...', duration: 50000 },
    { text: 'Finalizing recommendations...', duration: 70000 },
  ];

  // Effect to cycle through loading stages
  React.useEffect(() => {
    if (!isLoading && !isLoadingRecommendations) {
      setLoadingStage(0);
      return;
    }

    const intervals = loadingMessages.map((msg, idx) => {
      return setTimeout(() => {
        if (isLoading || isLoadingRecommendations) {
          setLoadingStage(idx);
        }
      }, msg.duration);
    });

    return () => intervals.forEach(clearTimeout);
  }, [isLoading, isLoadingRecommendations]);

  const generateTitle = async (prompt) => {
    try {
      const result = await generateTitleApi({ prompt });
      if (result.ok && result.data?.title) {
        return result.data.title.trim();
      }
      return prompt;
    } catch (e) { return prompt; }
  };

  const splitIntoTasks = async (prompt) => {
    try {
      const formattedPrompt = `Break down this project into ${teamSize + 1} tasks. Return ONLY JSON array:
[{"id": 1, "title": "Task", "description": "Description", "priority": "High|Medium|Low", "estimatedHours": number}]
Project: "${prompt}". Deadline: "${deadline}". Return ONLY JSON.`;

      const result = await splitTasksApi({ prompt: formattedPrompt });
      if (result.ok && Array.isArray(result.data?.tasks)) {
        return result.data.tasks;
      }
      return [];
    } catch (e) { return []; }
  };

  const handleStep1Submit = (e) => { e.preventDefault(); if (projectDescription.trim()) setStep(2); };
  const handleStep2Submit = () => { setStep(3); };
  const handleStep3Submit = (e) => { e.preventDefault(); if (deadline.trim()) setStep(4); };
  const handleStep4Submit = async () => {
    setStep(5);
    setIsLoading(true);
    setIsLoadingRecommendations(true);

    // Generate Title in parallel
    generateTitle(projectDescription).then(title => setProjectTitle(title));

    // Fetch recommendations from RAG endpoint

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
        console.log('[Admin] RAG data keys:', Object.keys(ragData || {}));
        console.log('[Admin] RAG data stringified:', JSON.stringify(ragData));

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
            console.log('[Admin] Using direct array format');
          } else if (ragData.name && ragData.userid) {
            // Single person object - wrap in array
            people = [ragData];
            console.log('[Admin] Received single person object, converted to array');
          } else if (ragData.recommendations && Array.isArray(ragData.recommendations)) {
            people = ragData.recommendations;
            console.log('[Admin] Using ragData.recommendations');
          } else if (ragData.team && Array.isArray(ragData.team)) {
            people = ragData.team;
            console.log('[Admin] Using ragData.team');
          } else if (ragData.people && Array.isArray(ragData.people)) {
            people = ragData.people;
            console.log('[Admin] Using ragData.people');
          } else if (ragData.data) {
            // Check if data property contains recommendations
            console.log('[Admin] Found nested data field:', ragData.data);
            if (Array.isArray(ragData.data)) {
              people = ragData.data;
              console.log('[Admin] Using ragData.data as array');
            } else if (ragData.data.name && ragData.data.userid) {
              people = [ragData.data];
              console.log('[Admin] Using ragData.data as single person');
            } else if (ragData.data.recommendations) {
              people = ragData.data.recommendations;
              console.log('[Admin] Using ragData.data.recommendations');
            } else if (ragData.data.people) {
              people = ragData.data.people;
              console.log('[Admin] Using ragData.data.people');
            }
          }

          console.log('[Admin] Extracted people array:', people);

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

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '4px', background: 'rgba(169,146,125,0.1)', position: 'absolute', top: 0, left: 0, zIndex: 20 }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          style={{ height: '100%', background: '#a9927d' }}
        />
      </div>

      {/* Logo - Top Left */}
      {step === 5 && (
        <div style={{ position: 'absolute', top: '24px', left: '24px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
          <img src="/logo.png" alt="Senate" style={{ height: '24px', width: 'auto' }} />
        </div>
      )}

      {/* Step 1: Project */}
      {step === 1 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ fontFamily: "'Jost', sans-serif", fontSize: '42px', fontWeight: '500', color: '#2d2a26', marginBottom: '32px' }}>
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

      {/* Step 2: Budget (Slider) */}
      {step === 2 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <DollarSign size={36} style={{ color: '#a9927d', marginBottom: '12px' }} />
          <h2 style={{ fontFamily: "'Jost', sans-serif", fontSize: '28px', color: '#2d2a26', marginBottom: '8px' }}>Budget?</h2>
          <p style={{ fontSize: '14px', color: '#a9927d', marginBottom: '32px' }}>Estimating costs for your project</p>

          <div style={{ width: '100%', maxWidth: '400px', marginBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '14px', color: '#a9927d' }}>$1k</span>
              <span style={{ fontSize: '32px', fontWeight: '600', color: '#2d2a26' }}>${budget.toLocaleString()}</span>
              <span style={{ fontSize: '14px', color: '#a9927d' }}>$100k+</span>
            </div>
            <input
              type="range"
              min="1000"
              max="100000"
              step="1000"
              value={budget}
              onChange={(e) => setBudget(parseInt(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                background: `linear-gradient(to right, #a9927d 0%, #a9927d ${(budget / 100000) * 100}%, rgba(169,146,125,0.2) ${(budget / 100000) * 100}%, rgba(169,146,125,0.2) 100%)`,
                borderRadius: '3px',
                appearance: 'none',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '10px' }}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setStep(1)} style={{ padding: '12px 24px', borderRadius: '14px', border: '1px solid rgba(169,146,125,0.2)', background: 'white', color: '#5e503f', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}><ArrowLeft size={16} style={{ marginRight: '6px' }} /> Back</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleStep2Submit} style={{ padding: '12px 32px', borderRadius: '14px', border: 'none', background: '#a9927d', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 4px 12px rgba(169,146,125,0.3)' }}>Continue <ArrowRight size={16} style={{ marginLeft: '6px' }} /></motion.button>
          </div>
        </div>
      )}

      {/* Step 3: Deadline */}
      {step === 3 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <Clock size={36} style={{ color: '#a9927d', marginBottom: '12px' }} />
          <h2 style={{ fontFamily: "'Jost', sans-serif", fontSize: '28px', color: '#2d2a26', marginBottom: '8px' }}>Timeline?</h2>
          <p style={{ fontSize: '14px', color: '#a9927d', marginBottom: '24px' }}>By when do you need this completed?</p>

          <form onSubmit={handleStep3Submit} style={{ width: '100%', maxWidth: '320px', marginBottom: '24px' }}>
            <input
              type="text"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              placeholder="e.g., 2 months, Dec 25th..."
              autoFocus
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(169,146,125,0.3)',
                background: 'white',
                fontSize: '16px',
                color: '#2d2a26',
                textAlign: 'center',
                outline: 'none'
              }}
            />
          </form>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '32px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {['1 month', '3 months', '6 months', 'ASAP'].map(opt => (
              <button key={opt} onClick={() => setDeadline(opt)}
                style={{ padding: '8px 16px', borderRadius: '16px', border: deadline === opt ? 'none' : '1px solid rgba(169,146,125,0.2)', background: deadline === opt ? '#a9927d' : 'white', color: deadline === opt ? 'white' : '#5e503f', fontSize: '13px', cursor: 'pointer' }}>
                {opt}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setStep(2)} style={{ padding: '12px 24px', borderRadius: '14px', border: '1px solid rgba(169,146,125,0.2)', background: 'white', color: '#5e503f', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}><ArrowLeft size={16} style={{ marginRight: '6px' }} /> Back</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={(e) => handleStep3Submit(e)} disabled={!deadline.trim()} style={{ padding: '12px 32px', borderRadius: '14px', border: 'none', background: deadline.trim() ? '#a9927d' : 'rgba(169,146,125,0.3)', color: 'white', fontSize: '14px', fontWeight: '600', cursor: deadline.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', boxShadow: deadline.trim() ? '0 4px 12px rgba(169,146,125,0.3)' : 'none' }}>Continue <ArrowRight size={16} style={{ marginLeft: '6px' }} /></motion.button>
          </div>
        </div>
      )}

      {/* Step 4: Team Size */}
      {step === 4 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <Users size={36} style={{ color: '#a9927d', marginBottom: '12px' }} />
          <h2 style={{ fontFamily: "'Jost', sans-serif", fontSize: '28px', color: '#2d2a26', marginBottom: '8px' }}>Team Size?</h2>
          <p style={{ fontSize: '14px', color: '#a9927d', marginBottom: '24px' }}>How many people on your team?</p>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            {[2, 3, 4, 5].map((s) => (
              <button key={s} onClick={() => setTeamSize(s)}
                style={{ width: '48px', height: '48px', borderRadius: '50%', fontSize: '18px', fontWeight: '600', cursor: 'pointer', background: teamSize === s ? '#a9927d' : 'white', color: teamSize === s ? 'white' : '#2d2a26', border: teamSize === s ? 'none' : '1px solid rgba(169,146,125,0.3)' }}>
                {s}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setStep(3)} style={{ padding: '12px 24px', borderRadius: '14px', border: '1px solid rgba(169,146,125,0.2)', background: 'white', color: '#5e503f', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}><ArrowLeft size={16} style={{ marginRight: '6px' }} /> Back</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleStep4Submit} style={{ padding: '12px 32px', borderRadius: '14px', border: 'none', background: '#a9927d', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 4px 12px rgba(169,146,125,0.3)' }}>Generate <ArrowRight size={16} style={{ marginLeft: '6px' }} /></motion.button>
          </div>
        </div>
      )}

      {/* Step 5: Assignment */}
      {step === 5 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 24px' }}>
          {isLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 size={32} style={{ color: '#a9927d' }} />
              </motion.div>
              <motion.div
                key={loadingStage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ textAlign: 'center' }}
              >
                <span style={{ color: '#a9927d', fontSize: '14px', fontWeight: 500 }}>
                  {loadingMessages[loadingStage]?.text || 'Generating...'}
                </span>
                <div style={{ 
                  width: '200px', 
                  height: '3px', 
                  background: 'rgba(169,146,125,0.2)', 
                  borderRadius: '2px', 
                  marginTop: '12px',
                  overflow: 'hidden'
                }}>
                  <motion.div
                    style={{ 
                      height: '100%', 
                      background: '#a9927d', 
                      borderRadius: '2px' 
                    }}
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ 
                      duration: loadingMessages[loadingStage + 1] 
                        ? (loadingMessages[loadingStage + 1].duration - loadingMessages[loadingStage].duration) / 1000 
                        : 20,
                      ease: 'linear'
                    }}
                  />
                </div>
              </motion.div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontFamily: "'Jost', sans-serif", fontSize: '22px', color: '#2d2a26', margin: 0 }}>{projectDescription}</h2>
                <p style={{ fontSize: '13px', color: '#a9927d', margin: '4px 0 0' }}>Drag team members to tasks • One person can do multiple tasks</p>
              </div>

              <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
                {/* Tasks */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {tasks.map((task) => (
                    <div key={task.id} onDragOver={handleDragOver} onDrop={() => handleDrop(task.id)}
                      style={{
                        background: 'white',
                        border: '1px solid rgba(169,146,125,0.2)',
                        borderRadius: '16px',
                        padding: '16px',
                        marginBottom: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                        transition: 'all 0.2s ease',
                        cursor: 'default'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#a9927d'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(169,146,125,0.2)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span style={{
                          width: '24px', height: '24px', borderRadius: '50%',
                          background: '#fbf7ef', color: '#a9927d', border: '1px solid rgba(169,146,125,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '12px', fontWeight: '700'
                        }}>{task.id}</span>
                        <span style={{ fontWeight: '600', color: '#2d2a26', fontSize: '15px', flex: 1 }}>{task.title}</span>
                        <span style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '20px', background: `${getPriorityColor(task.priority)}15`, color: getPriorityColor(task.priority), fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{task.priority}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#5e503f', margin: '0 0 12px 34px', lineHeight: '1.5' }}>{task.description}</p>

                      {/* Drop Zone / Assigned People */}
                      <div style={{
                        display: 'flex', gap: '8px', flexWrap: 'wrap', marginLeft: '34px', minHeight: '36px',
                        padding: '4px', borderRadius: '12px',
                        background: (taskAssignments[task.id] || []).length === 0 ? 'rgba(169,146,125,0.05)' : 'transparent',
                        border: (taskAssignments[task.id] || []).length === 0 ? '1px dashed rgba(169,146,125,0.3)' : '1px solid transparent',
                        alignItems: 'center'
                      }}>
                        {(taskAssignments[task.id] || []).map(p => (
                          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} key={p.id} onClick={() => removeFromTask(task.id, p.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', background: 'white', border: '1px solid rgba(169,146,125,0.2)', fontSize: '12px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                            <span style={{ fontSize: '14px' }}>{p.avatar}</span>
                            <span style={{ fontWeight: '500', color: '#2d2a26' }}>{p.name.split(' ')[0]}</span>
                            <X size={12} style={{ color: '#a9927d', marginLeft: '2px' }} />
                          </motion.div>
                        ))}
                        {(taskAssignments[task.id] || []).length === 0 && (
                          <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <span style={{ fontSize: '12px', color: '#a9927d', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <ArrowRight size={12} /> Drag team members here
                            </span>
                          </div>
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px 0', flexDirection: 'column', gap: '12px' }}>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      >
                        <Loader2 size={24} style={{ color: '#a9927d' }} />
                      </motion.div>
                      <motion.span
                        key={loadingStage}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        style={{ fontSize: '12px', color: '#a9927d', fontWeight: 500 }}
                      >
                        {loadingMessages[loadingStage]?.text || 'Loading recommendations...'}
                      </motion.span>
                      <div style={{ 
                        width: '160px', 
                        height: '2px', 
                        background: 'rgba(169,146,125,0.2)', 
                        borderRadius: '2px',
                        overflow: 'hidden'
                      }}>
                        <motion.div
                          style={{ 
                            height: '100%', 
                            background: '#a9927d', 
                            borderRadius: '2px' 
                          }}
                          initial={{ width: '0%' }}
                          animate={{ width: '100%' }}
                          transition={{ 
                            duration: loadingMessages[loadingStage + 1] 
                              ? (loadingMessages[loadingStage + 1].duration - loadingMessages[loadingStage].duration) / 1000 
                              : 20,
                            ease: 'linear'
                          }}
                        />
                      </div>
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

              {/* Navigation: Back & Next */}
              <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '16px' }}>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setStep(4)} style={{ padding: '12px 24px', borderRadius: '14px', border: '1px solid rgba(169,146,125,0.2)', background: 'white', color: '#5e503f', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}><ArrowLeft size={16} style={{ marginRight: '6px' }} /> Back</motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setStep(6)}
                  style={{ padding: '12px 32px', borderRadius: '14px', border: 'none', background: '#a9927d', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(169,146,125,0.3)' }}>
                  Review Project <ArrowRight size={18} />
                </motion.button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 6: Summary & Launch */}
      {step === 6 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', maxWidth: '800px', margin: '0 auto', width: '100%', alignItems: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h1 style={{ fontFamily: "'Jost', sans-serif", fontSize: '32px', color: '#2d2a26', marginBottom: '8px' }}>Ready to Launch?</h1>
              <p style={{ fontSize: '14px', color: '#a9927d' }}>Review your project details before creating</p>
            </div>

            {/* Project Overview Card */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid rgba(169,146,125,0.15)', padding: '24px', marginBottom: '24px', width: '100%' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px', borderBottom: '1px solid rgba(169,146,125,0.1)', paddingBottom: '20px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#a9927d', fontWeight: '500', margin: '0 0 4px' }}>PROJECT</p>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{projectTitle || 'Generating Title...'}</p>
                  <p style={{ fontSize: '12px', color: '#5e503f', marginTop: '4px', fontStyle: 'italic' }}>"{projectDescription}"</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#a9927d', fontWeight: '500', margin: '0 0 4px' }}>BUDGET</p>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>${budget.toLocaleString()}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#a9927d', fontWeight: '500', margin: '0 0 4px' }}>TIMELINE</p>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{deadline}</p>
                </div>
              </div>

              {/* Team Section */}
              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '11px', color: '#a9927d', fontWeight: '500', margin: '0 0 12px' }}>SELECTED TEAM ({selectedTeam.length})</p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {selectedTeam.map((person) => (
                    <div key={person.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', background: '#fbf7ef', border: '1px solid rgba(169,146,125,0.1)' }}>
                      <span style={{ fontSize: '16px' }}>{person.avatar}</span>
                      <div>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{person.name}</p>
                        <p style={{ fontSize: '10px', color: '#a9927d', margin: 0 }}>{person.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Summary */}
              <div>
                <p style={{ fontSize: '11px', color: '#a9927d', fontWeight: '500', margin: '0 0 12px' }}>TASK DISTRIBUTION ({tasks.length} Tasks)</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {tasks.map((task) => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '10px', background: '#fafaf9', border: '1px solid rgba(0,0,0,0.03)' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getPriorityColor(task.priority) }} />
                      <span style={{ fontSize: '12px', fontWeight: '500', color: '#2d2a26', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</span>
                      <div style={{ display: 'flex', marginLeft: 'auto' }}>
                        {(taskAssignments[task.id] || []).slice(0, 3).map((p, i) => (
                          <span key={i} style={{ marginLeft: i > 0 ? '-6px' : 0, fontSize: '14px', background: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e5e5' }}>{p.avatar}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '10px' }}>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setStep(5)} style={{ padding: '12px 24px', borderRadius: '14px', border: '1px solid rgba(169,146,125,0.2)', background: 'white', color: '#5e503f', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}><ArrowLeft size={16} style={{ marginRight: '6px' }} /> Back to Edit</motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setStep(7)}
                style={{ padding: '12px 36px', borderRadius: '14px', border: 'none', background: '#a9927d', color: 'white', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(169,146,125,0.4)' }}>
                <CheckCircle2 size={18} /> Proceed to Payment
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Step 7: Payment (Escrow) */}
      {step === 7 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', maxWidth: '480px', width: '100%', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fbf7ef', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Loader2 size={32} style={{ color: '#a9927d' }} />
            </div>
            <h2 style={{ fontFamily: "'Jost', sans-serif", fontSize: '28px', color: '#2d2a26', marginBottom: '8px' }}>Secure Escrow</h2>
            <p style={{ fontSize: '14px', color: '#a9927d', marginBottom: '32px' }}>Deposit funds to start the project. Released only when milestones are met.</p>

            <div style={{ marginBottom: '32px', padding: '20px', background: '#fbf7ef', borderRadius: '16px' }}>
              <p style={{ fontSize: '12px', color: '#a9927d', fontWeight: '600', letterSpacing: '1px', marginBottom: '4px' }}>TOTAL AMOUNT</p>
              <p style={{ fontSize: '36px', fontWeight: '600', color: '#2d2a26' }}>${budget.toLocaleString()}</p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={async () => {
                setIsProcessingPayment(true);
                setSaveError(null);
                try {
                  // Build the full project payload
                  const selectedTeamForSave = recommendedPeople.slice(0, teamSize);
                  const tasksForSave = tasks.map((task) => ({
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    estimatedHours: task.estimatedHours || 0,
                    assignees: (taskAssignments[task.id] || []).map(p => ({
                      name: p.name,
                      role: p.role,
                      match: p.match,
                      avatar: p.avatar,
                      reason: p.reason,
                    })),
                  }));

                  const result = await createFullProject({
                    name: projectDescription,
                    description: projectTitle || projectDescription,
                    budget,
                    deadline,
                    teamSize,
                    team: selectedTeamForSave.map(p => ({
                      name: p.name,
                      role: p.role,
                      match: p.match,
                      avatar: p.avatar,
                      reason: p.reason,
                    })),
                    tasks: tasksForSave,
                  });

                  if (result.ok) {
                    setCreatedProjectId(result.project._id);
                    setStep(8);
                  } else {
                    setSaveError(result.error || 'Failed to create project');
                  }
                } catch (err) {
                  console.error('Project save error:', err);
                  setSaveError('Network error saving project');
                } finally {
                  setIsProcessingPayment(false);
                }
              }}
              disabled={isProcessingPayment}
              style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: '#2d2a26', color: 'white', fontSize: '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              {isProcessingPayment ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
              {isProcessingPayment ? 'Processing...' : 'Pay & Start Project'}
            </motion.button>

            <button onClick={() => setStep(6)} style={{ marginTop: '20px', background: 'none', border: 'none', color: '#a9927d', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}>Cancel & Go Back</button>
            {saveError && (
              <p style={{ marginTop: '12px', fontSize: '13px', color: '#dc2626', background: 'rgba(220,38,38,0.08)', padding: '8px 12px', borderRadius: '8px' }}>
                {saveError}
              </p>
            )}
          </motion.div>
        </div>
      )}

      {/* Step 8: Success */}
      {step === 8 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 10px 30px rgba(34,197,94,0.3)' }}>
              <CheckCircle2 size={40} style={{ color: 'white' }} />
            </div>
            <h1 style={{ fontFamily: "'Jost', sans-serif", fontSize: '42px', color: '#2d2a26', marginBottom: '16px' }}>Project Started!</h1>
            <p style={{ fontSize: '16px', color: '#5e503f', marginBottom: '40px', maxWidth: '400px', margin: '0 auto 40px', lineHeight: '1.6' }}>
              Your project <strong>"{projectTitle}"</strong> is now live. The team has been notified and funds are secured in escrow.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              {createdProjectId && (
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => navigate(`/project/${createdProjectId}`)}
                  style={{ padding: '14px 32px', borderRadius: '24px', border: 'none', background: '#a9927d', color: 'white', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                  View Project
                </motion.button>
              )}
              <motion.button whileHover={{ scale: 1.05 }} onClick={() => navigate('/dashboard')}
                style={{ padding: '14px 32px', borderRadius: '24px', border: createdProjectId ? '1px solid rgba(169,146,125,0.3)' : 'none', background: createdProjectId ? 'white' : '#2d2a26', color: createdProjectId ? '#2d2a26' : 'white', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                Go to Dashboard
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Admin;
