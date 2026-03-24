import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Brain, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Loader2, 
  Search, 
  Cpu, 
  ShieldCheck, 
  RefreshCw,
  ChevronRight,
  Terminal,
  Layers,
  Zap,
  Layout,
  Settings,
  Activity,
  MessageSquare,
  Send,
  User,
  Bot,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { metaAgentService, Plan, Agent, TaskComplexity, Evaluation, Priority } from './services/geminiService';

type Step = 'idle' | 'planning' | 'discovering' | 'building' | 'executing' | 'evaluating' | 'improving' | 'completed';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface LogEntry {
  timestamp: string;
  agent: string;
  message: string;
  type: 'system' | 'architect' | 'builder' | 'executor' | 'evaluator' | 'error';
}

export default function App() {
  const [task, setTask] = useState('');
  const [suggestedTools, setSuggestedTools] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [currentStep, setCurrentStep] = useState<Step>('idle');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [executionResults, setExecutionResults] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  
  const [attempts, setAttempts] = useState(0);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const renderFormattedResult = (result: string) => {
    if (!result) return null;
    
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(result);
      if (typeof parsed === 'object' && parsed !== null) {
        return (
          <div className="space-y-6">
            {Object.entries(parsed).map(([key, value]) => (
              <div key={key} className="group">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">
                    {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                  </h4>
                </div>
                <div className="pl-4 border-l border-white/10 ml-[3px]">
                  {typeof value === 'object' ? (
                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 overflow-x-auto">
                      <pre className="text-[11px] text-gray-400 font-mono leading-relaxed">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {String(value)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      }
    } catch (e) {
      // Not JSON, fall back to Markdown
    }

    return (
      <div className="prose prose-invert prose-sm max-w-none 
        prose-headings:text-purple-300 prose-headings:font-bold prose-headings:tracking-tight
        prose-strong:text-white prose-strong:font-bold
        prose-code:text-purple-200 prose-code:bg-purple-500/10 prose-code:px-1 prose-code:rounded
        prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl
        prose-a:text-blue-400 hover:prose-a:text-blue-300
        text-gray-300 leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {result}
        </ReactMarkdown>
      </div>
    );
  };

  useEffect(() => {
    const loadSkills = async () => {
      try {
        const response = await fetch('/agent_skills.md');
        if (response.ok) {
          const skills = await response.text();
          console.log("Agent Skills loaded and sent to Meta-Architect.");
          metaAgentService.setAgentSkills(skills);
        }
      } catch (err) {
        console.error("Failed to load agent skills:", err);
      }
    };
    loadSkills();
  }, []);

  const addLog = (message: string) => {
    let type: LogEntry['type'] = 'system';
    let agent = 'Meta-System';

    if (message.includes('Architect') || message.includes('System Design') || message.includes('Architecture') || message.includes('Priority') || message.includes('Complexity')) {
      type = 'architect';
      agent = 'Meta-Architect';
    } else if (message.includes('searching') || message.includes('Tool discovery')) {
      type = 'system';
      agent = 'Tool-Discovery';
    } else if (message.includes('Building') || message.includes('Constructing') || message.includes('Injecting') || message.includes('construction finalized')) {
      type = 'builder';
      agent = 'System-Builder';
    } else if (message.includes('Activating') || message.includes('active') || message.includes('completed successfully') || message.includes('FAILED')) {
      type = 'executor';
      agent = 'System-Executor';
    } else if (message.includes('Evaluator') || message.includes('Quality Score') || message.includes('Evaluation successful') || message.includes('Evaluation failed')) {
      type = 'evaluator';
      agent = 'System-Evaluator';
    } else if (message.includes('ERROR')) {
      type = 'error';
      agent = 'System-Error';
    } else if (message.includes('learning') || message.includes('analyzing feedback') || message.includes('Learning:')) {
      type = 'system';
      agent = 'Self-Improvement';
    }

    const newLog: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      agent,
      message,
      type
    };
    setLogs(prev => [...prev, newLog]);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleStart = async (isRetry = false) => {
    if (!task.trim()) return;

    setError(null);
    
    if (!isRetry) {
      setLogs([]);
      setEvaluation(null);
      setAgents([]);
      setPlan(null);
      setExecutionResults('');
      setChatMessages([]);
      setAttempts(1);
    } else {
      setAttempts(prev => prev + 1);
      addLog(`--- REFINEMENT ATTEMPT ${attempts + 1} ---`);
      addLog("System is learning from previous evaluation and agent self-reflections...");
    }
    
    let currentEvaluation: Evaluation | null = isRetry ? evaluation : null;
    let previousAgents: Agent[] = isRetry ? agents : [];

    try {
      if (isRetry && currentEvaluation) {
        setCurrentStep('improving');
        addLog(`Evaluation feedback: ${currentEvaluation.feedback}`);
        addLog("Agents are reflecting on their performance...");
        
        const reflectingAgents = [...previousAgents];
        for (let i = 0; i < reflectingAgents.length; i++) {
          const agent = reflectingAgents[i];
          addLog(`[${agent.name}] is analyzing feedback...`);
          const learning = await metaAgentService.agentSelfReflect(agent, task, currentEvaluation);
          reflectingAgents[i] = { ...agent, learning_from_feedback: learning };
          addLog(`[${agent.name}] Learning: ${learning}`);
        }
        previousAgents = reflectingAgents;
        setAgents(reflectingAgents);

        addLog("Triggering self-improvement loop with agent learnings...");
        await new Promise(r => setTimeout(r, 2000));
      }

      // STEP 1 & 2: Meta-System Architect
      setCurrentStep('planning');
      if (!isRetry) addLog(`User Query Received: "${task}"`);
      
      const toolsList = suggestedTools.split(',').map(t => t.trim()).filter(t => t !== '');
      if (toolsList.length > 0 && !isRetry) {
        addLog(`Suggested Tools: ${toolsList.join(', ')}`);
      }
      
      addLog("Meta-System Architect is designing a custom solution...");
      
      console.log("Calling generatePlan...");
      const generatedPlan = await metaAgentService.generatePlan(task, priority, currentEvaluation || undefined, previousAgents, toolsList);
      console.log("Plan received:", generatedPlan);
      
      setPlan(generatedPlan);
      addLog(`System Design Complete: "${generatedPlan.systemName}"`);
      addLog(`Architecture: ${generatedPlan.systemDescription}`);
      addLog(`Priority: ${priority}`);
      addLog(`Complexity: ${generatedPlan.complexity}`);

      // STEP 3: Proactive Tool Discovery
      setCurrentStep('discovering');
      addLog("Proactively searching for specialized tools based on agent roles...");
      const planWithTools = await metaAgentService.discoverTools(task, generatedPlan);
      setPlan(planWithTools);
      addLog("Tool discovery complete. Specialized tools assigned to agents.");

      // STEP 5: Builder (Actual Construction)
      setCurrentStep('building');
      addLog(`Building Custom System: ${generatedPlan.systemName}...`);
      
      for (const agent of generatedPlan.agents) {
        console.log("Constructing agent:", agent.name);
        addLog(`Constructing Agent: ${agent.name} (${agent.role})`);
        addLog(`-> Injecting Objective: ${agent.objective}`);
        await new Promise(r => setTimeout(r, 600)); // Simulate construction
      }
      
      const initializedAgents = generatedPlan.agents.map(a => ({ ...a, status: 'pending' as const }));
      setAgents(initializedAgents);
      addLog("System construction finalized. All agents initialized and aware.");

      // STEP 6: Executor (DAG-based)
      setCurrentStep('executing');
      addLog(`Activating ${generatedPlan.systemName} execution sequence...`);
      
      let results = "";
      const currentExecutionAgents: Agent[] = initializedAgents.map(a => ({ ...a }));
      const completedAgentIds = new Set<string>();
      const runningAgentIds = new Set<string>();
      const agentResults: Record<string, string> = {};

      const executeDAG = async () => {
        while (completedAgentIds.size < currentExecutionAgents.length) {
          // Find agents that are pending and have all dependencies met
          const readyAgents = currentExecutionAgents.filter(agent => 
            agent.status === 'pending' && 
            (!agent.dependencies || agent.dependencies.every(depId => completedAgentIds.has(depId))) &&
            !runningAgentIds.has(agent.id)
          );

          if (readyAgents.length === 0 && runningAgentIds.size === 0) {
            // This could happen if there's a circular dependency or a dead-end
            throw new Error("Execution stalled: Circular dependencies or unmet prerequisites detected.");
          }

          if (readyAgents.length > 0) {
            // Start all ready agents in parallel
            readyAgents.forEach(agent => {
              runningAgentIds.add(agent.id);
              setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: 'running' } : a));
              addLog(`[${agent.name}] is now active and processing...`);
            });

            // Map each ready agent to an execution promise
            const executionPromises = readyAgents.map(async (agent) => {
              try {
                // Construct context from dependencies
                let context = "";
                if (agent.dependencies && agent.dependencies.length > 0) {
                  agent.dependencies.forEach(depId => {
                    const depAgent = currentExecutionAgents.find(a => a.id === depId);
                    if (depAgent && agentResults[depId]) {
                      context += `\n--- Prerequisite Result from ${depAgent.name} ---\n${agentResults[depId]}\n`;
                    }
                  });
                } else {
                  // If no explicit dependencies, provide all currently available results as a fallback
                  // We build this from agentResults to avoid race conditions
                  context = Object.entries(agentResults)
                    .map(([id, res]) => {
                      const a = currentExecutionAgents.find(ag => ag.id === id);
                      return `\n--- Result from ${a?.name || id} ---\n${res}\n`;
                    })
                    .join("");
                }

                const result = await metaAgentService.executeAgent(agent, task, context, priority, currentEvaluation || undefined);
                
                agentResults[agent.id] = result;
                completedAgentIds.add(agent.id);
                runningAgentIds.delete(agent.id);
                
                // Update the local agent object in our tracking array
                const agentIdx = currentExecutionAgents.findIndex(a => a.id === agent.id);
                if (agentIdx !== -1) {
                  currentExecutionAgents[agentIdx] = { ...currentExecutionAgents[agentIdx], status: 'completed', result };
                }

                setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: 'completed', result } : a));
                addLog(`[${agent.name}] task completed successfully.`);
              } catch (agentErr: any) {
                const agentIdx = currentExecutionAgents.findIndex(a => a.id === agent.id);
                const errorMsg = agentErr.message || "Unknown error";
                
                // Call diagnoseFailure to get detailed context
                const diagnosis = await metaAgentService.diagnoseFailure(agent, errorMsg, task, currentExecutionAgents);
                
                if (agentIdx !== -1) {
                  currentExecutionAgents[agentIdx] = { ...currentExecutionAgents[agentIdx], status: 'failed', failureDiagnosis: diagnosis };
                }
                setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: 'failed', failureDiagnosis: diagnosis } : a));
                addLog(`[${agent.name}] FAILED. Diagnosis generated.`);
                throw agentErr;
              }
            });

            // Wait for all currently started ones to finish or fail.
            await Promise.all(executionPromises);
          } else {
            // If no new agents are ready but some are running, we just wait.
            await new Promise(r => setTimeout(r, 500));
          }
        }
      };

      await executeDAG();
      
      // Build final results string from all agents in the order they were defined in the plan
      results = currentExecutionAgents
        .filter(a => a.status === 'completed')
        .map(a => `\n--- Result from ${a.name} ---\n${a.result}\n`)
        .join("");
      
      setExecutionResults(results);

      // STEP 7: Evaluator
      setCurrentStep('evaluating');
      addLog("Meta-System Evaluator is verifying the final output...");
      console.log("Calling evaluateResult...");
      const evalResult = await metaAgentService.evaluateResult(task, results, generatedPlan || undefined);
      console.log("Evaluation received:", evalResult);
      
      setEvaluation(evalResult);
      currentEvaluation = evalResult;
      addLog(`Quality Score: ${evalResult.score}/10`);

      if (evalResult.isSatisfactory) {
        addLog("Evaluation successful. Output meets quality standards.");
      } else {
        addLog(`Evaluation feedback: ${evalResult.feedback}`);
        addLog("You can manually refine the system to improve the score.");
      }

      setCurrentStep('completed');
      if (generatedPlan) {
        addLog(`Orchestration of ${generatedPlan.systemName} finished.`);
        
        // Initial System Message
        setChatMessages([
          { role: 'model', text: `Hello! I am the interface for the **${generatedPlan.systemName}** system. I have completed the task: "${task}". How can I help you further with these results?` }
        ]);
      }

    } catch (err: any) {
      console.error("Orchestration Error:", err);
      setError(err.message || "An unexpected error occurred during orchestration.");
      addLog(`ERROR: ${err.message || "Unknown error"}`);
      setCurrentStep('idle');
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || !plan || isChatLoading) return;

    const newMessage: ChatMessage = { role: 'user', text: userInput };
    setChatMessages(prev => [...prev, newMessage]);
    setUserInput('');
    setIsChatLoading(true);

    try {
      const response = await metaAgentService.chatWithSystem(
        userInput,
        task,
        plan,
        executionResults,
        chatMessages
      );
      setChatMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (err: any) {
      console.error("Chat Error:", err);
      setChatMessages(prev => [...prev, { role: 'model', text: "Error: I encountered a problem while processing your request." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const getStepIcon = (step: Step) => {
    switch (step) {
      case 'planning': return <Brain className="w-5 h-5 text-purple-400 animate-pulse" />;
      case 'discovering': return <Search className="w-5 h-5 text-blue-400 animate-pulse" />;
      case 'building': return <Settings className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'executing': return <Activity className="w-5 h-5 text-green-400 animate-pulse" />;
      case 'evaluating': return <ShieldCheck className="w-5 h-5 text-yellow-400 animate-pulse" />;
      case 'improving': return <RefreshCw className="w-5 h-5 text-orange-400 animate-spin" />;
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      default: return <Zap className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500/30">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <Cpu className="w-8 h-8 text-purple-400" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Agent System Builder
              </h1>
            </div>
            <p className="text-gray-400 max-w-2xl text-lg">
              The meta-system that builds custom agent architectures on-the-fly to solve any query.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Meta-Controller Online</span>
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Builder Ready</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Input & Status */}
          <div className="lg:col-span-4 space-y-6">
            <section className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                <Terminal className="w-4 h-4" /> System Input
              </h2>
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Enter your query... (e.g., Build a system to research and write a blog post about Mars colonization)"
                className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none mb-4"
                disabled={currentStep !== 'idle' && currentStep !== 'completed'}
              />

              <div className="mb-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 block flex items-center gap-2">
                  <Zap className="w-3 h-3" /> Suggested Tools (Optional)
                </label>
                <input
                  type="text"
                  value={suggestedTools}
                  onChange={(e) => setSuggestedTools(e.target.value)}
                  placeholder="e.g. Google Search, Python, SQL"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  disabled={currentStep !== 'idle' && currentStep !== 'completed'}
                />
                <p className="text-[10px] text-gray-600 mt-1 italic">Comma-separated list of tools for agents to consider.</p>
              </div>
              
              <div className="mb-6">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 block">Task Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH'] as Priority[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      disabled={currentStep !== 'idle' && currentStep !== 'completed'}
                      className={`py-2 rounded-lg text-[10px] font-bold transition-all border ${
                        priority === p 
                          ? p === 'HIGH' ? 'bg-red-500/20 border-red-500 text-red-400' :
                            p === 'MEDIUM' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' :
                            'bg-green-500/20 border-green-500 text-green-400'
                          : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleStart(false)}
                  disabled={currentStep !== 'idle' && currentStep !== 'completed' || !task.trim()}
                  className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                >
                  {currentStep === 'idle' || currentStep === 'completed' ? (
                    <>
                      <Play className="w-4 h-4 fill-current" /> Build & Run System
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> System Building...
                    </>
                  )}
                </button>

                {currentStep === 'completed' && evaluation && !evaluation.isSatisfactory && (
                  <button
                    onClick={() => handleStart(true)}
                    className="w-full py-3 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/50 font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                  >
                    <RefreshCw className="w-4 h-4" /> Refine & Improve Score
                  </button>
                )}
                
                {currentStep !== 'idle' && (
                  <button
                    onClick={() => {
                      setCurrentStep('idle');
                      setError(null);
                      setLogs([]);
                      setPlan(null);
                      setAgents([]);
                      setEvaluation(null);
                      setExecutionResults('');
                      setChatMessages([]);
                      setAttempts(0);
                    }}
                    className="w-full py-3 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10 font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" /> Reset System
                  </button>
                )}
              </div>
            </section>

            {/* Step Progress */}
            <section className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-6">Orchestration Pipeline</h2>
              <div className="space-y-4">
                {[
                  { id: 'planning', label: 'Meta-Architect (Design)' },
                  { id: 'discovering', label: 'Tool Discovery (Search)' },
                  { id: 'building', label: 'System Builder (Construct)' },
                  { id: 'executing', label: 'Custom System (Execute)' },
                  { id: 'evaluating', label: 'Quality Control (Verify)' },
                  { id: 'completed', label: 'Deployment' }
                ].map((s, idx) => {
                  const isActive = currentStep === s.id;
                  const isPast = ['planning', 'discovering', 'building', 'executing', 'evaluating', 'completed'].indexOf(currentStep) > idx;
                  
                  return (
                    <div key={s.id} className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                        isActive ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 
                        isPast ? 'bg-green-500/20 border-green-500 text-green-400' : 
                        'bg-white/5 border-white/10 text-gray-600'
                      }`}>
                        {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span className={`text-sm font-medium ${isActive ? 'text-white' : isPast ? 'text-gray-300' : 'text-gray-600'}`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right Column: Visualization & Results */}
          <div className="lg:col-span-8 space-y-8">
            {/* Status Header & Error (Standalone if no plan) */}
            {(currentStep !== 'idle' || error) && !plan && (
              <section className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold flex items-center gap-3">
                    {getStepIcon(currentStep)}
                    {currentStep === 'planning' ? 'Architecting Custom System' :
                     currentStep === 'discovering' ? 'Discovering Specialized Tools' :
                     currentStep === 'building' ? 'Constructing Agents' :
                     currentStep === 'executing' ? 'System Active' :
                     currentStep === 'evaluating' ? 'Validating Output' :
                     currentStep === 'completed' ? 'System Task Complete' :
                     'System Error'}
                  </h2>
                  {currentStep === 'executing' && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                      <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Processing</span>
                    </div>
                  )}
                </div>
                {error && (
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {error}
                  </div>
                )}
              </section>
            )}

            {/* System Blueprint Card */}
            <AnimatePresence>
              {plan && (
                <motion.section
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-purple-500/5 border border-purple-500/20 rounded-3xl backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Layout className="w-5 h-5 text-purple-400" />
                      <h2 className="text-lg font-bold">System Blueprint: {plan.systemName}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest ${
                        priority === Priority.HIGH ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        priority === Priority.MEDIUM ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                        'bg-green-500/20 text-green-400 border border-green-500/30'
                      }`}>
                        {priority} Priority
                      </span>
                      <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded uppercase tracking-widest">
                        {plan.complexity} Architecture
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed mb-4">
                    {plan.systemDescription}
                  </p>
                  
                  {plan.reasoning && (
                    <div className="mt-4 p-4 bg-black/40 border border-white/5 rounded-2xl">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-purple-400 mb-2 flex items-center gap-2">
                        <Brain className="w-3 h-3" /> Architect's Reasoning
                      </h3>
                      <p className="text-xs text-gray-400 leading-relaxed italic">
                        {plan.reasoning}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                    {/* Integrated Status Card */}
                    {(currentStep !== 'idle' || error) && (
                      <button 
                        onClick={() => setIsStatusModalOpen(true)}
                        className={`p-4 bg-white/5 border rounded-2xl hover:bg-white/10 transition-all group relative overflow-hidden cursor-pointer ${
                          error ? 'border-red-500/30' : 'border-purple-500/30'
                        }`}
                      >
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                          <Activity className="w-12 h-12" />
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(168,85,247,0.2)] ${
                            error ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-purple-500/20 border-purple-500 text-purple-400'
                          }`}>
                            {getStepIcon(currentStep)}
                          </div>
                          <div className="text-left">
                            <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                              {error ? 'System Error' : 'System Status'}
                            </h4>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                              {currentStep}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[11px] text-gray-400 line-clamp-2 italic leading-relaxed">
                            {error ? error : `Current Phase: ${currentStep.charAt(0).toUpperCase() + currentStep.slice(1)}`}
                          </p>
                          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[8px] font-bold text-purple-400 uppercase tracking-widest">Live Monitor</span>
                            <span className="text-[8px] text-gray-500 flex items-center gap-1">
                              View Details <ChevronRight className="w-2 h-2" />
                            </span>
                          </div>
                        </div>
                      </button>
                    )}

                    {plan.agents.map((a, i) => {
                      const liveAgent = agents.find(la => la.id === a.id);
                      const status = liveAgent?.status || 'pending';
                      
                      return (
                        <button 
                          key={i} 
                          onClick={() => setSelectedAgentId(a.id)}
                          className={`w-full text-left p-4 bg-white/5 border rounded-2xl hover:bg-white/10 transition-all group relative overflow-hidden cursor-pointer ${
                            status === 'running' ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)]' :
                            status === 'completed' ? 'border-green-500/30' :
                            status === 'failed' ? 'border-red-500/30' :
                            'border-white/10'
                          }`}
                        >
                          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Cpu className="w-12 h-12" />
                          </div>
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(168,85,247,0.2)] ${
                              status === 'running' ? 'bg-purple-500/20 border-purple-500 text-purple-400 animate-pulse' :
                              status === 'completed' ? 'bg-green-500/20 border-green-500 text-green-400' :
                              status === 'failed' ? 'bg-red-500/20 border-red-500 text-red-400' :
                              'bg-purple-500/20 border-purple-500/30 text-purple-400'
                            }`}>
                              {status === 'running' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                               status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> :
                               status === 'failed' ? <AlertTriangle className="w-5 h-5" /> :
                               <Bot className="w-5 h-5" />}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">{a.name}</h4>
                              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{a.role}</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold mb-1">Objective</p>
                              <p className="text-[11px] text-gray-400 line-clamp-3 italic leading-relaxed">
                                "{a.objective}"
                              </p>
                            </div>
                            {a.tools && a.tools.length > 0 && (
                              <div>
                                <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold mb-1">Capabilities</p>
                                <div className="flex flex-wrap gap-1">
                                  {a.tools.map((tool, ti) => (
                                    <span key={ti} className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-md text-[9px] text-purple-300 flex items-center gap-1">
                                      <Terminal className="w-2 h-2" /> {tool}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          {status !== 'pending' && (
                            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                              <span className={`text-[8px] font-bold uppercase tracking-widest ${
                                status === 'running' ? 'text-purple-400' :
                                status === 'completed' ? 'text-green-400' :
                                'text-red-400'
                              }`}>
                                {status}
                              </span>
                              <span className="text-[8px] text-gray-500 flex items-center gap-1">
                                View Details <ChevronRight className="w-2 h-2" />
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Final Result & Evaluation */}
            <AnimatePresence>
              {evaluation && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="p-8 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-white/10 rounded-3xl backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold flex items-center gap-3">
                        <ShieldCheck className="w-6 h-6 text-yellow-400" />
                        Final System Evaluation
                      </h3>
                      <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-2xl border border-white/10">
                        <span className="text-3xl font-black text-white">{evaluation.score}</span>
                        <span className="text-gray-500 text-sm">/ 10</span>
                      </div>
                    </div>
                    <p className="text-gray-300 mb-6 leading-relaxed">
                      {evaluation.feedback}
                    </p>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest ${
                      evaluation.isSatisfactory ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {evaluation.isSatisfactory ? 'Satisfactory Delivery' : 'Refinement Required'}
                    </div>
                  </div>

                  {executionResults && (
                    <div className="p-8 bg-white/5 border border-white/10 rounded-3xl shadow-2xl relative overflow-hidden group backdrop-blur-sm">
                      <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                        <CheckCircle2 className="w-32 h-32 text-green-500" />
                      </div>
                      
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                            <Zap className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">Final System Result</h3>
                            <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-bold">Orchestration Complete</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => navigator.clipboard.writeText(executionResults)}
                          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white"
                        >
                          <RefreshCw className="w-3 h-3" /> Copy Result
                        </button>
                      </div>

                      <div className="bg-black/30 p-8 rounded-2xl border border-white/5 shadow-inner">
                        {renderFormattedResult(executionResults)}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Idle State */}
            {currentStep === 'idle' && !error && !plan && (
              <section className="flex flex-col items-center justify-center h-[400px] text-center bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm">
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 border border-white/10 rotate-12">
                  <Zap className="w-10 h-10 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-400">System Ready for Construction</h3>
                <p className="text-sm text-gray-600 max-w-sm mt-3">
                  Input a task to trigger the Meta-System. It will design and build a custom agent architecture specifically for you.
                </p>
              </section>
            )}

            {/* Status Detail Modal */}
            <AnimatePresence>
              {isStatusModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsStatusModalOpen(false)}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                  >
                    <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${
                          error ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-purple-500/20 border-purple-500 text-purple-400'
                        }`}>
                          {getStepIcon(currentStep)}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{error ? 'System Error' : 'System Status'}</h3>
                          <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Live Orchestration Monitor</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsStatusModalOpen(false)}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-500 hover:text-white"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="p-8 overflow-y-auto space-y-8 scrollbar-thin scrollbar-thumb-white/10">
                      <section>
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Current Phase</h4>
                        <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
                          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                          <span className="text-lg font-medium text-white capitalize">{currentStep}</span>
                        </div>
                      </section>

                      {error && (
                        <section className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-3 flex items-center gap-2">
                            <AlertCircle className="w-3 h-3" /> Error Details
                          </h4>
                          <p className="text-sm text-red-200/80 leading-relaxed">
                            {error}
                          </p>
                        </section>
                      )}

                      <section>
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">System Activity Stream</h4>
                        <div className="bg-black/40 p-6 rounded-2xl border border-white/5 h-64 overflow-y-auto font-mono text-[11px] space-y-2 scrollbar-thin scrollbar-thumb-white/10">
                          {logs.map((log, i) => (
                            <div key={i} className="flex gap-3">
                              <span className="text-gray-700 shrink-0">[{log.timestamp}]</span>
                              <span className={`font-bold shrink-0 ${
                                log.type === 'architect' ? 'text-purple-400' :
                                log.type === 'builder' ? 'text-blue-400' :
                                log.type === 'executor' ? 'text-green-400' :
                                log.type === 'evaluator' ? 'text-yellow-400' :
                                log.type === 'error' ? 'text-red-400' :
                                'text-gray-500'
                              }`}>
                                {log.agent}:
                              </span>
                              <span className="text-gray-400">{log.message}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Agent Detail Modal */}
            <AnimatePresence>
              {selectedAgentId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedAgentId(null)}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                  >
                    {(() => {
                      const agent = agents.find(a => a.id === selectedAgentId);
                      if (!agent) return null;

                      return (
                        <>
                          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${
                                agent.status === 'running' ? 'bg-purple-500/20 border-purple-500 text-purple-400' :
                                agent.status === 'completed' ? 'bg-green-500/20 border-green-500 text-green-400' :
                                agent.status === 'failed' ? 'bg-red-500/20 border-red-500 text-red-400' :
                                'bg-white/5 border-white/10 text-gray-500'
                              }`}>
                                {agent.status === 'running' ? <Loader2 className="w-6 h-6 animate-spin" /> :
                                 agent.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> :
                                 agent.status === 'failed' ? <AlertTriangle className="w-6 h-6" /> :
                                 <Bot className="w-6 h-6" />}
                              </div>
                              <div>
                                <h3 className="text-xl font-bold">{agent.name}</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">{agent.role}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setSelectedAgentId(null)}
                              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-500 hover:text-white"
                            >
                              <X className="w-6 h-6" />
                            </button>
                          </div>

                          <div className="p-8 overflow-y-auto space-y-8 scrollbar-thin scrollbar-thumb-white/10">
                            <section>
                              <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Objective</h4>
                              <p className="text-sm text-gray-300 leading-relaxed italic">"{agent.objective}"</p>
                            </section>

                            {agent.failureDiagnosis && (
                              <section className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-3 flex items-center gap-2">
                                  <AlertTriangle className="w-3 h-3" /> Failure Diagnosis
                                </h4>
                                <div className="text-sm text-red-200/80 prose prose-invert prose-sm max-w-none leading-relaxed">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {agent.failureDiagnosis}
                                  </ReactMarkdown>
                                </div>
                              </section>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {agent.tools && agent.tools.length > 0 && (
                                <section>
                                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Capabilities</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {agent.tools.map((tool, i) => (
                                      <span key={i} className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs text-purple-300 flex items-center gap-2">
                                        <Terminal className="w-3 h-3" /> {tool}
                                      </span>
                                    ))}
                                  </div>
                                </section>
                              )}

                              {agent.dependencies && agent.dependencies.length > 0 && (
                                <section>
                                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Dependencies</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {agent.dependencies.map((depId, i) => {
                                      const depAgent = agents.find(a => a.id === depId);
                                      return (
                                        <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-400 flex items-center gap-2">
                                          <ChevronRight className="w-3 h-3" /> {depAgent?.name || depId}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </section>
                              )}
                            </div>

                            {agent.result && (
                              <section>
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Agent Output</h4>
                                  <button 
                                    onClick={() => navigator.clipboard.writeText(agent.result!)}
                                    className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors"
                                  >
                                    Copy Result
                                  </button>
                                </div>
                                <div className="bg-black/40 p-6 rounded-2xl border border-white/5 shadow-inner">
                                  {renderFormattedResult(agent.result)}
                                </div>
                              </section>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Chat Interface */}
            <AnimatePresence>
              {currentStep === 'completed' && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <MessageSquare className="w-6 h-6 text-purple-400" />
                    <h2 className="text-xl font-bold">Interact with {plan?.systemName}</h2>
                  </div>

                  <div 
                    ref={chatScrollRef}
                    className="h-80 overflow-y-auto mb-6 space-y-4 pr-2 scrollbar-thin scrollbar-thumb-white/10"
                  >
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          msg.role === 'user' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                        <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed prose prose-invert prose-sm max-w-none ${
                          msg.role === 'user' ? 'bg-purple-500/10 border border-purple-500/20 rounded-tr-none' : 'bg-white/5 border border-white/10 rounded-tl-none'
                        }`}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.text}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder={`Ask ${plan?.systemName} anything about the results...`}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isChatLoading || !userInput.trim()}
                      className="px-6 bg-white text-black font-bold rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-all flex items-center justify-center"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* System Activity Stream */}
            <section className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-sm">
              <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">System Activity Stream</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-purple-500/20" />
                  <div className="w-2 h-2 rounded-full bg-blue-500/20" />
                  <div className="w-2 h-2 rounded-full bg-green-500/20" />
                </div>
              </div>
              <div 
                ref={scrollRef}
                className="p-6 h-56 overflow-y-auto font-mono text-[12px] text-gray-400 space-y-2 scrollbar-thin scrollbar-thumb-white/10"
              >
                {logs.length === 0 && <div className="text-gray-800 italic">Waiting for system initialization...</div>}
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                        log.type === 'architect' ? 'bg-purple-500/20 border-purple-500/40 text-purple-400' :
                        log.type === 'builder' ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' :
                        log.type === 'executor' ? 'bg-green-500/20 border-green-500/40 text-green-400' :
                        log.type === 'evaluator' ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' :
                        log.type === 'error' ? 'bg-red-500/20 border-red-500/40 text-red-400' :
                        'bg-white/5 border-white/10 text-gray-500'
                      }`}>
                        {log.type === 'architect' && <Brain className="w-3 h-3" />}
                        {log.type === 'builder' && <Settings className="w-3 h-3" />}
                        {log.type === 'executor' && <Activity className="w-3 h-3" />}
                        {log.type === 'evaluator' && <ShieldCheck className="w-3 h-3" />}
                        {log.type === 'error' && <AlertTriangle className="w-3 h-3" />}
                        {log.type === 'system' && <Cpu className="w-3 h-3" />}
                      </div>
                      {i < logs.length - 1 && <div className="w-px h-full bg-white/5 mt-1" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${
                          log.type === 'architect' ? 'text-purple-400' :
                          log.type === 'builder' ? 'text-blue-400' :
                          log.type === 'executor' ? 'text-green-400' :
                          log.type === 'evaluator' ? 'text-yellow-400' :
                          log.type === 'error' ? 'text-red-400' :
                          'text-gray-500'
                        }`}>
                          {log.agent}
                        </span>
                        <span className="text-[9px] text-gray-700">{log.timestamp}</span>
                      </div>
                      <p className={`text-xs leading-relaxed ${
                        log.type === 'error' ? 'text-red-300' : 'text-gray-400'
                      }`}>
                        {log.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-white/5 text-center">
        <p className="text-gray-600 text-[10px] uppercase tracking-[0.4em] font-bold">
          Meta-System Builder Core v2.0 // Neural Orchestration Active
        </p>
      </footer>
    </div>
  );
}
