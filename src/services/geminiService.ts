import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export enum TaskComplexity {
  SIMPLE = "SIMPLE",
  MEDIUM = "MEDIUM",
  COMPLEX = "COMPLEX",
}

export enum Priority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  objective: string;
  expectedOutput: string;
  tools?: string[];
  dependencies?: string[]; // IDs of agents that must complete before this one starts
  load?: number; // Load percentage (0-100)
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  learning_from_feedback?: string;
  failureDiagnosis?: string;
}

export interface Plan {
  systemName: string;
  systemDescription: string;
  complexity: TaskComplexity;
  reasoning: string;
  agents: Agent[];
}

export interface Evaluation {
  score: number;
  feedback: string;
  isSatisfactory: boolean;
}

export class MetaAgentService {
  private model = "gemini-3.1-pro-preview"; // Using Pro for better architectural design
  private flashModel = "gemini-3-flash-preview"; // Using Flash for faster execution
  private agentSkills: string = "";

  private async withRetry<T>(fn: () => Promise<T>, maxRetries: number = 3, initialDelay: number = 2000): Promise<T> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const errorStr = JSON.stringify(error);
        const isQuotaError = errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429;
        
        if (isQuotaError && i < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, i);
          console.warn(`Quota exceeded. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  setAgentSkills(skills: string) {
    this.agentSkills = skills;
  }

  async generatePlan(task: string, priority: Priority = Priority.MEDIUM, previousEvaluation?: Evaluation, previousAgents?: Agent[], suggestedTools?: string[]): Promise<Plan> {
    console.log(`Generating optimized plan for task: "${task}" with priority: ${priority}`);
    
    const timeout = 60000; // Reduced timeout to 60s for faster feedback
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Architect is taking too long to design the system. Please try again.")), timeout)
    );

    const skillsContext = this.agentSkills 
      ? `\n\nUSE THESE AGENT BUILDING SKILLS AS YOUR GUIDE:\n${this.agentSkills}\n\n`
      : "";

    const agentLearnings = previousAgents?.filter(a => a.learning_from_feedback).map(a => `Agent [${a.name}] Learning: ${a.learning_from_feedback}`).join('\n') || "";

    const toolsContext = suggestedTools && suggestedTools.length > 0
      ? `\n\nUSER-SUGGESTED TOOLS:\n${suggestedTools.join(', ')}\n\n`
      : "";

    try {
      const responsePromise = this.withRetry(() => ai.models.generateContent({
        model: this.flashModel, // Switched to Flash for speed
        contents: `You are a Meta-System Architect. Design a custom multi-agent system to solve: "${task}".
        Task Priority: ${priority}
        ${skillsContext}
        ${toolsContext}

        INSTRUCTIONS:
        1. Name the system and describe its architecture.
        2. Define specialized agents with clear objectives and structured expected outputs.
        3. **PROACTIVE TOOL DISCOVERY**: Use Google Search to find specific, real-world tools, APIs, or libraries for each agent.
        4. Define agent dependencies (DAG).
        5. Provide a detailed reasoning for this specific architecture.

        ${previousEvaluation ? `PREVIOUS EVALUATION FEEDBACK: ${previousEvaluation.feedback}` : ""}
        ${agentLearnings ? `AGENT SELF-LEARNINGS: ${agentLearnings}` : ""}`,
        config: {
          systemInstruction: "You are a Meta-System Architect. Design a multi-agent system in strictly valid JSON. Use Google Search to proactively discover the best tools for each agent role. Ensure high quality and structural precision.",
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              systemName: { type: Type.STRING },
              systemDescription: { type: Type.STRING },
              complexity: { type: Type.STRING, enum: Object.values(TaskComplexity) },
              reasoning: { type: Type.STRING },
              agents: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    role: { type: Type.STRING },
                    objective: { type: Type.STRING },
                    expectedOutput: { type: Type.STRING },
                    tools: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    dependencies: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    load: { type: Type.NUMBER }
                  },
                  required: ["id", "name", "role", "objective", "expectedOutput"],
                },
              },
            },
            required: ["systemName", "systemDescription", "complexity", "reasoning", "agents"],
          },
        },
      }));

      const response = await Promise.race([responsePromise, timeoutPromise]);

      const text = response.text;
      if (!text) {
        throw new Error("Model returned an empty response during planning.");
      }

      const plan = JSON.parse(text) as Plan;
      console.log("Optimized plan generated successfully.");
      
      return plan;
    } catch (error) {
      console.error("Error in generatePlan:", error);
      throw error;
    }
  }

  // discoverTools is now integrated into generatePlan for performance.
  // Keeping a dummy version for compatibility if needed, but it's no longer used in App.tsx.
  async discoverTools(task: string, plan: Plan): Promise<Plan> {
    return plan;
  }

  async executeAgent(agent: Agent, task: string, previousResults: string, priority: Priority = Priority.MEDIUM, previousEvaluation?: Evaluation): Promise<string> {
    console.log(`Executing agent: ${agent.name} with priority: ${priority}`);
    if (previousEvaluation) {
      console.log(`Agent ${agent.name} is learning from previous evaluation feedback.`);
    }
    // Truncate previous results if too long to avoid token limits
    const maxContextLength = 10000;
    const truncatedResults = previousResults.length > maxContextLength 
      ? previousResults.substring(previousResults.length - maxContextLength) + "... [truncated]"
      : previousResults;

    const timeout = 120000; // 120 seconds timeout per agent
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Agent ${agent.name} timed out. The task might be too complex.`)), timeout)
    );

    try {
      const responsePromise = this.withRetry(() => ai.models.generateContent({
        model: this.flashModel,
        contents: `You are an autonomous agent named "${agent.name}".
        Your Role: ${agent.role}
        Your Objective: ${agent.objective}
        Your Assigned Tools: ${agent.tools?.join(', ') || 'General AI Capabilities'}
        Expected Output: ${agent.expectedOutput}
        
        Context of the overall task: "${task}"
        Task Priority: ${priority}
        Previous agents' results:
        ${truncatedResults}
        
        ${previousEvaluation ? `PREVIOUS SYSTEM EVALUATION FEEDBACK:
        Feedback: ${previousEvaluation.feedback}
        As an agent in this system, you must adjust your strategy and output to address this feedback and improve the overall system score.` : ""}

        Please execute your task and provide the result. 
        
        CRITICAL: Your output must be visually attractive and well-structured. 
        - Use Markdown extensively: Headings (###), Bullet points, Numbered lists, Bold text, and Tables where appropriate.
        - DO NOT return raw JSON unless the "Expected Output" explicitly requires it for a technical reason.
        - Organize your findings into clear sections with descriptive headers.
        - Ensure your response is concise but comprehensive.
        
        The priority is "${priority}". Adjust your effort and detail level accordingly. High priority tasks require maximum depth and precision.`,
        config: {
          systemInstruction: "You are a highly reliable autonomous agent. Your output must be well-structured using Markdown (headings, lists, bold text, tables). Avoid raw JSON unless strictly necessary. Do not include conversational filler like 'Sure, I can help with that'. Focus only on the task result.",
          maxOutputTokens: 2048,
        },
      }));

      const response = await Promise.race([responsePromise, timeoutPromise]);
      const result = (response.text || "No output generated.").trim();
      console.log(`Agent ${agent.name} execution complete.`);
      return result;
    } catch (error) {
      console.error(`Error executing agent ${agent.name}:`, error);
      throw error;
    }
  }

  async agentSelfReflect(agent: Agent, task: string, evaluation: Evaluation): Promise<string> {
    console.log(`Agent ${agent.name} is reflecting on feedback...`);
    
    try {
      const response = await ai.models.generateContent({
        model: this.flashModel,
        contents: `You are an autonomous agent named "${agent.name}".
        Your Role: ${agent.role}
        Your Objective: ${agent.objective}
        Your Previous Result: ${agent.result || "No result (failed)"}
        
        The overall system evaluation was:
        Score: ${evaluation.score}/10
        Feedback: ${evaluation.feedback}
        
        Reflect on your performance. Why did the system fail to meet expectations? What could you have done better in your specific role? 
        Provide a concise "learning" or "strategy adjustment" for your future self. Focus on technical improvements or objective refinements.`,
        config: {
          systemInstruction: "You are a self-improving autonomous agent. Analyze feedback and provide a concise technical learning or strategy adjustment. Do not be conversational.",
          maxOutputTokens: 512,
        },
      });

      return response.text || "No learning generated.";
    } catch (error) {
      console.error(`Error in agentSelfReflect for ${agent.name}:`, error);
      return "Failed to generate learning from feedback.";
    }
  }

  async diagnoseFailure(agent: Agent, error: string, task: string, allAgents: Agent[]): Promise<string> {
    console.log(`Diagnosing failure for agent ${agent.name}...`);
    
    const agentStates = allAgents.map(a => `- ${a.name} (${a.role}): ${a.status}`).join('\n');

    try {
      const response = await this.withRetry(() => ai.models.generateContent({
        model: this.flashModel,
        contents: `You are a System Diagnostic AI. An autonomous agent in a multi-agent system has failed.
        
        Failed Agent: "${agent.name}"
        Role: ${agent.role}
        Objective: ${agent.objective}
        Error Message: "${error}"
        
        Overall Task: "${task}"
        
        Current System State (Agent Statuses):
        ${agentStates}
        
        Please provide a detailed diagnosis of this failure. 
        1. Identify the specific technical or logical reason for the failure.
        2. Analyze how the state of other agents might have contributed (e.g., missing dependencies, poor quality input).
        3. Suggest 2-3 potential root causes.
        4. Recommend a specific fix or adjustment to the agent's objective or tools.
        
        Format your response as a concise Markdown report.`,
        config: {
          systemInstruction: "You are a System Diagnostic AI. Provide clear, technical, and actionable failure analysis for multi-agent systems.",
          maxOutputTokens: 1024,
        },
      }));

      return response.text || "Failed to generate diagnosis.";
    } catch (err) {
      console.error(`Error in diagnoseFailure for ${agent.name}:`, err);
      return `Diagnosis failed. Original error: ${error}`;
    }
  }

  async evaluateResult(task: string, finalResult: string): Promise<Evaluation> {
    console.log("Evaluating final result...");
    const maxResultLength = 15000;
    const truncatedResult = finalResult.length > maxResultLength 
      ? finalResult.substring(0, maxResultLength) + "... [truncated]"
      : finalResult;

    const timeout = 60000; // 60 seconds timeout
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Evaluator AI timed out.")), timeout)
    );

    try {
      const responsePromise = this.withRetry(() => ai.models.generateContent({
        model: this.flashModel,
        contents: `You are an Evaluator AI.
        User Task: "${task}"
        Final System Output: "${truncatedResult}"
        
        Evaluate the output. Is it complete, accurate, and helpful?
        Provide a score (0-10) and feedback.
        Decide if it is satisfactory or needs improvement.
        
        Return in JSON format.`,
        config: {
          systemInstruction: "You are an Evaluator AI. Your task is to objectively score and provide feedback on the final output of a multi-agent system. You must return your evaluation in a strictly valid JSON format following the provided schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              feedback: { type: Type.STRING },
              isSatisfactory: { type: Type.BOOLEAN },
            },
            required: ["score", "feedback", "isSatisfactory"],
          },
        },
      }));

      const response = await Promise.race([responsePromise, timeoutPromise]);
      const text = response.text;
      if (!text) {
        throw new Error("Model returned an empty response during evaluation.");
      }

      const evaluation = JSON.parse(text) as Evaluation;
      console.log("Evaluation complete:", evaluation);
      return evaluation;
    } catch (error) {
      console.error("Error in evaluateResult:", error);
      throw error;
    }
  }

  async chatWithSystem(
    userMessage: string, 
    task: string, 
    plan: Plan, 
    executionResults: string,
    chatHistory: { role: 'user' | 'model', text: string }[]
  ): Promise<string> {
    console.log("Chatting with the generated system...");
    
    // Truncate context for chat
    const maxResultsForChat = 8000;
    const truncatedResults = executionResults.length > maxResultsForChat
      ? executionResults.substring(executionResults.length - maxResultsForChat) + "... [truncated context]"
      : executionResults;

    // Limit chat history to last 5 exchanges
    const recentHistory = chatHistory.slice(-10);

    try {
      const response = await ai.models.generateContent({
        model: this.flashModel,
        contents: [
          {
            text: `You are the interface for a custom AI system named "${plan.systemName}".
            
            System Context:
            - Original Task: "${task}"
            - Architecture: ${plan.systemDescription}
            - Agents Involved: ${plan.agents.map(a => `${a.name} (${a.role})`).join(', ')}
            - Execution Results:
            ${truncatedResults}
            
            You must respond as the collective intelligence of this system. Answer the user's questions about the results, provide more details, or perform further analysis based on the existing data.
            
            Chat History:
            ${recentHistory.map(h => `${h.role === 'user' ? 'User' : 'System'}: ${h.text}`).join('\n')}
            
            User: ${userMessage}`
          }
        ],
        config: {
          systemInstruction: `You are the interface for a custom AI system named "${plan.systemName}". You must respond as the collective intelligence of this system. Answer the user's questions about the results, provide more details, or perform further analysis based on the existing data. Use Markdown for formatting (headings, lists, bold text, tables) to make your output reliable and easy to read.`,
          maxOutputTokens: 2048,
        },
      });

      return response.text || "I'm sorry, I couldn't generate a response.";
    } catch (error) {
      console.error("Error in chatWithSystem:", error);
      throw error;
    }
  }
}

export const metaAgentService = new MetaAgentService();
