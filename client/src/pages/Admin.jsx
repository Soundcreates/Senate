import React, { useState } from 'react';
import { Send, Loader2, Plus, Clock, Users, CheckCircle2, ArrowRight, ArrowLeft, DollarSign, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Hardcoded recommended people
const recommendedPeople = [
  { id: 1, name: 'Alice Chen', role: 'Full-Stack', match: 92, avatar: '👩‍💻' },
  { id: 2, name: 'Bob Kumar', role: 'Blockchain', match: 88, avatar: '👨‍💻' },
  { id: 3, name: 'Charlie Park', role: 'UI/UX', match: 90, avatar: '🎨' },
  { id: 4, name: 'Diana Patel', role: 'AI/ML', match: 85, avatar: '🧠' },
  { id: 5, name: 'Ethan Lee', role: 'DevOps', match: 82, avatar: '⚙️' },
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

  return (
    <div style={{ minHeight: '100vh', background: '#fbf7ef', fontFamily: "'Jost', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=Jost:wght@300;400;500;600&display=swap');`}</style>

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

                {/* Team */}
                <div style={{ width: '200px', background: 'white', borderRadius: '12px', border: '1px solid rgba(169,146,125,0.15)', padding: '14px', overflowY: 'auto' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#2d2a26', margin: '0 0 12px' }}>Team</p>
                  {selectedTeam.map((person) => (
                    <div key={person.id} draggable onDragStart={() => handleDragStart(person)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '10px', background: '#fbf7ef', marginBottom: '8px', cursor: 'grab', border: '1px solid rgba(169,146,125,0.1)' }}>
                      <span style={{ fontSize: '20px' }}>{person.avatar}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '13px', fontWeight: '600', color: '#2d2a26', margin: 0 }}>{person.name.split(' ')[0]}</p>
                        <p style={{ fontSize: '10px', color: '#a9927d', margin: 0 }}>{person.role}</p>
                      </div>
                    </div>
                  ))}
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
