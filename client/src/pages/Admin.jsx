import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, CheckCircle2, List } from 'lucide-react';
import { gsap } from 'gsap';

const Admin = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.admin-header', {
        y: -30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      });

      gsap.from('.chat-container', {
        scale: 0.95,
        opacity: 0,
        duration: 0.8,
        delay: 0.2,
        ease: 'power3.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const splitIntoTasks = async (prompt) => {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are a project management assistant. Break down the following project request into a clear, actionable list of tasks. Return ONLY a JSON array of task objects with this exact format:
[
  {
    "id": 1,
    "title": "Task title",
    "description": "Brief description",
    "priority": "High|Medium|Low",
    "estimatedHours": number
  }
]

Project request: "${prompt}"

Important: Return ONLY the JSON array, no additional text or markdown formatting.`
              }]
            }]
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Gemini API error:', errorData);
        throw new Error('Failed to process request with AI service');
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        let responseText = data.candidates[0].content.parts[0].text.trim();
        
        // Remove markdown code blocks if present
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const parsedTasks = JSON.parse(responseText);
        return parsedTasks;
      }
      
      throw new Error('Invalid response format from AI service');
    } catch (error) {
      console.error('Error splitting tasks:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const generatedTasks = await splitIntoTasks(input);
      
      const assistantMessage = {
        role: 'assistant',
        content: `I've broken down your project into ${generatedTasks.length} actionable tasks:`,
        tasks: generatedTasks,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setTasks(generatedTasks);

      // Animate tasks appearing
      setTimeout(() => {
        gsap.from('.task-item', {
          x: -20,
          opacity: 0,
          duration: 0.4,
          stagger: 0.1,
          ease: 'power2.out',
        });
      }, 100);
    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'Medium':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'Low':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <div className="admin-header border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            Project Builder
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Describe your project and I'll break it down into actionable tasks
          </p>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {messages.length === 0 ? (
            <div className="chat-container flex flex-col items-center justify-center h-[60vh]">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
                <List size={32} />
              </div>
              <h2 className="text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                What do you want to build today?
              </h2>
              <p className="text-zinc-400 text-center max-w-md">
                Describe your project idea and I'll help you break it down into manageable tasks
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl ${
                      message.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm'
                        : 'bg-zinc-900/50 border border-zinc-800 rounded-2xl rounded-tl-sm'
                    } px-6 py-4 shadow-lg`}
                  >
                    <p className={`${message.isError ? 'text-red-400' : ''}`}>
                      {message.content}
                    </p>
                    
                    {message.tasks && message.tasks.length > 0 && (
                      <div className="mt-6 space-y-3">
                        {message.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="task-item bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-400">
                                  {task.id}
                                </div>
                                <h3 className="font-semibold text-white">{task.title}</h3>
                              </div>
                              <span
                                className={`text-xs px-2 py-1 rounded-md border font-medium ${getPriorityColor(
                                  task.priority
                                )}`}
                              >
                                {task.priority}
                              </span>
                            </div>
                            <p className="text-sm text-zinc-400 ml-9 mb-2">
                              {task.description}
                            </p>
                            <div className="flex items-center gap-4 ml-9 text-xs text-zinc-500">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 size={14} />
                                Est. {task.estimatedHours}h
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl rounded-tl-sm px-6 py-4 shadow-lg">
                    <div className="flex items-center gap-3">
                      <Loader2 className="animate-spin text-indigo-400" size={20} />
                      <span className="text-zinc-400">Analyzing your project...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Describe your project... (e.g., 'I want to build an ecommerce site')"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 pr-14 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
              rows={3}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-3 bottom-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white p-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:shadow-none"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Send size={20} />
              )}
            </button>
          </form>
          <p className="text-xs text-zinc-500 mt-2 text-center">
            Press Enter to send, Shift + Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default Admin;
