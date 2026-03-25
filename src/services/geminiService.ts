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

export interface AgentOutput {
  agent_name: string;
  status: 'success' | 'failed' | 'partial';
  output: string;
  next_action: string;
  confidence: number;
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
  timeout?: number; // Timeout in milliseconds
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  structuredOutput?: AgentOutput;
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
  score: number; // 0-100
  feedback: string;
  decision: 'continue' | 'refine' | 'terminate';
}

async function apiCall(endpoint: string, payload: any): Promise<string> {
  const response = await fetch(`/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.text;
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
    console.log(`Generating plan for task: "${task}" with priority: ${priority}`);
    if (previousEvaluation) {
      console.log("Incorporating previous evaluation feedback into planning...");
    }
    
    const timeout = 120000; // 120 seconds timeout
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
      const prompt = `You are a Meta-System Architect. Your task is to design a custom multi-agent system (a "mini-system") specifically tailored to solve this user request: "${task}".
        Task Priority: ${priority}
        ${skillsContext}
        ${toolsContext}
        1. Name the system (e.g., "News-Insight-Engine", "Stock-Predictor-V1").
        2. Describe the system's architecture.
        3. Decide on the complexity and number of agents based on the guide.
        
        4. **Reasoning & Strategy**: Provide a detailed justification for this specific architecture. 
           - Analyze the task's core requirements.
           - Identify potential bottlenecks or challenges.
           - Explicitly consider potential agent conflicts or overlaps and how your design mitigates them.
           - Justify why these specific agents were chosen and how their roles complement each other.
           - Explain the choice of complexity level.
           - **Tool Strategy**: Reason about the types of tools needed (e.g., Search, Data Analysis, Code Execution, Creative Writing, API Integration).
           - **IMPORTANT**: This detailed reasoning MUST be included in the 'reasoning' field of the JSON response.
        
        5. **Agent Types & Selection**: Define the agents. Each agent must be specialized. 
           - **EXECUTOR Agent**: Include an 'EXECUTOR' agent type when the task involves executing code, performing calculations, or interacting with external systems/APIs. 
           - **Role**: Action Execution & Task Completion.
           - **Objective**: Execute provided code snippets, perform API calls, or modify state based on task requirements.
           - **Expected Output**: Execution results, status reports, or data returned from external systems in a structured format.
           - **Tools**: Assign appropriate tools like 'Python/Node.js execution environment', 'API interaction libraries', or 'System command utilities'.
           - Ensure its dependencies and load are correctly configured according to the AGENT BUILDING SKILLS GUIDE.
           - Ensure the "expectedOutput" for each agent is clear and specifies a structured format (e.g., Markdown table, list, or JSON snippet) to ensure reliability.
           - **WEB_SEARCHER Agent**: Include a 'WEB_SEARCHER' agent type when the task requires up-to-date, real-time information from the web. 
             - **Role**: Real-Time Information Retrieval.
             - **Objective**: Fetch current data, news, or facts from the web using Google Search to provide context for other agents.
             - **Expected Output**: A structured summary of the search results with sources.
             - **Tools**: MUST include 'googleSearch'.
             - Ensure it is set as a dependency for any DATA_FETCHER, ANALYZER, or other agents that rely on current information.
             - Set an appropriate timeout (e.g., 60000 ms) for this agent to prevent hanging on slow searches.
           - **ANALYZER Agent**: Include an 'ANALYZER' agent type when the task requires data analysis, synthesis, or evaluation.
             - **Role**: Data Analysis & Synthesis.
             - **Objective**: Analyze provided data or context, leveraging real-time information from the web when necessary for accurate analysis. You MUST always fetch real-time info to ensure accuracy and NEVER provide fake, hallucinated, or false information.
             - **Expected Output**: Analytical reports, insights, or synthesized data summaries.
             - **Tools**: MUST include 'googleSearch' to verify and enrich analysis with real-time data.
        
        6. **Dynamic Tool Discovery & Assignment**:
           - For each agent, proactively discover and suggest a set of relevant tools.
           - **Reference the "TOOL MAPPING" section in the AGENT BUILDING SKILLS GUIDE** to identify appropriate tool categories for each agent type (e.g., PLANNER, DATA_FETCHER, ANALYZER).
           - Incorporate any "USER-SUGGESTED TOOLS" if they align with the agent's specialized role.
           - **Propose specific, high-value tools** (e.g., "Python/Pandas for data frame manipulation", "Google Search Grounding for current events", "Recharts for JSON-to-Chart logic", "NLP Sentiment Analysis libraries").
           - Ensure the tools are listed in the 'tools' array for each agent.
           - In your 'reasoning', explain the logic behind the tool selection for the overall system.
        
        7. **Agent Dependencies**: Define explicit dependencies between agents. Some agents may need to complete their tasks before others can start. Specify these dependencies using agent IDs (e.g., agent 'A' must complete before agent 'B' can start). This will allow for a Directed Acyclic Graph (DAG) execution strategy.
        
        ${previousEvaluation ? `PREVIOUS EVALUATION FEEDBACK (LEARN FROM THIS):
        Score: ${previousEvaluation.score}/100
        Feedback: ${previousEvaluation.feedback}
        Please adjust the system architecture and agent objectives to address this feedback.` : ""}

        ${agentLearnings ? `AGENT SELF-LEARNINGS FROM PREVIOUS ATTEMPT:
        ${agentLearnings}
        Use these specific agent insights to improve the next system design.` : ""}

        The priority "${priority}" should influence the depth of research, the number of agents (higher priority might need more specialized agents), and the overall thoroughness of the design.
        
        Return the result as a JSON object with the following structure:
        {
          "systemName": "string",
          "systemDescription": "string",
          "complexity": "SIMPLE" | "MEDIUM" | "COMPLEX",
          "reasoning": "string",
          "agents": [
            {
              "id": "string",
              "name": "string",
              "role": "string",
              "objective": "string",
              "expectedOutput": "string",
              "tools": ["string"],
              "dependencies": ["string"],
              "load": number,
              "timeout": number
            }
          ]
        }`;

      const systemInstruction = "You are a Meta-System Architect. Your task is to design a custom multi-agent system (a 'mini-system') specifically tailored to solve a user request. You must return your design in a strictly valid JSON format following the provided schema. Ensure each agent has a clear role, a structured 'expectedOutput' format, and a list of tools they should use. The 'reasoning' field must contain a thorough justification of your design choices, including agent selection, complexity, and conflict resolution.";

      const responsePromise = this.withRetry(() => apiCall("generatePlan", { prompt, systemInstruction }));
      
      const text = await Promise.race([responsePromise, timeoutPromise]);

      if (!text) {
        throw new Error("Model returned an empty response during planning.");
      }

      const plan = JSON.parse(text) as Plan;
      console.log("Initial plan generated successfully. Proceeding to tool discovery...");
      
      // STEP 2: PROACTIVE TOOL DISCOVERY (Optional but recommended for complex tasks)
      // We can either do it in one call or two. Let's stick to one for now but refine the prompt.
      // Actually, the user asked for it to be "After identifying the task and planning the agents".
      // So let's make it a separate internal step if needed, or just ensure the architect's reasoning reflects this.
      // Given the constraints, a single high-quality call with googleSearch is often better.
      // But let's add a separate method for "Refining tools" if the user wants to see it.
      
      console.log("Plan generated successfully:", plan);
      return plan;
    } catch (error) {
      console.error("Error in generatePlan:", error);
      throw error;
    }
  }

  async discoverTools(task: string, plan: Plan): Promise<Plan> {
    console.log(`Proactively discovering tools for system: ${plan.systemName}`);
    
    try {
      const prompt = `You are the Meta-System Architect. You have already designed the following multi-agent system for the task: "${task}".
        
        SYSTEM DESIGN:
        Name: ${plan.systemName}
        Description: ${plan.systemDescription}
        Agents:
        ${plan.agents.map(a => `- ${a.name} (${a.role}): ${a.objective}`).join('\n')}
        
        YOUR TASK:
        Proactively search for and suggest relevant tools that each agent can use to achieve its objective more effectively.
        
        GUIDELINES:
        1. **Reference the "TOOL MAPPING" section in the AGENT BUILDING SKILLS GUIDE** (provided earlier) for categories.
        2. **Use Google Search** to find real-world, specific tools, libraries, or APIs that fit these categories (e.g., specific Python libraries, specialized APIs, visualization frameworks).
        3. For each agent, provide a list of 2-4 highly relevant tools.
        4. Update the 'tools' field for each agent in the provided plan.
        5. Preserve the 'timeout' field for each agent if it exists.
        
        Return the updated plan in JSON format.`;

      const systemInstruction = "You are a Meta-System Architect specialized in tool discovery. Use Google Search to find the most relevant and powerful tools for your agents. Return the updated plan in a strictly valid JSON format.";

      const text = await this.withRetry(() => apiCall("discoverTools", { prompt, systemInstruction }));
      
      if (!text) throw new Error("Tool discovery returned empty response.");
      
      const updatedPlan = JSON.parse(text) as Plan;
      console.log("Tools discovered and assigned successfully.");
      return updatedPlan;
    } catch (error) {
      console.error("Error in discoverTools:", error);
      return plan; // Return original plan if discovery fails
    }
  }

  async executeAgent(agent: Agent, task: string, previousResults: string, priority: Priority = Priority.MEDIUM, previousEvaluation?: Evaluation): Promise<AgentOutput> {
    console.log(`Executing agent: ${agent.name} with priority: ${priority}`);
    if (previousEvaluation) {
      console.log(`Agent ${agent.name} is learning from previous evaluation feedback.`);
    }
    // Truncate previous results if too long to avoid token limits
    const maxContextLength = 10000;
    const truncatedResults = previousResults.length > maxContextLength 
      ? previousResults.substring(previousResults.length - maxContextLength) + "... [truncated]"
      : previousResults;

    const timeout = agent.timeout || 120000; // Use agent specific timeout or default to 120 seconds
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Agent ${agent.name} timed out after ${timeout}ms. The task might be too complex.`)), timeout)
    );

    try {
      const prompt = `You are an autonomous agent named "${agent.name}".
        Your Role: ${agent.role}
        Your Objective: ${agent.objective}
        Your Assigned Tools: ${agent.tools?.join(', ') || 'General AI Capabilities'}
        Expected Output: ${agent.expectedOutput}
        ${agent.learning_from_feedback ? `\n        YOUR PREVIOUS LEARNING/STRATEGY ADJUSTMENT:\n        ${agent.learning_from_feedback}\n        Apply this learning to improve your execution this time.` : ""}
        
        Context of the overall task: "${task}"
        Task Priority: ${priority}
        Previous agents' results:
        ${truncatedResults}
        
        ${agent.tools?.includes('googleSearch') ? `CRITICAL INSTRUCTION: You have access to 'googleSearch'. You MUST use it to fetch real-time, up-to-date information to complete your objective. NEVER hallucinate, guess, or provide fake/false information. If you cannot find the information, state that clearly.` : ""}
        
        ${previousEvaluation ? `PREVIOUS SYSTEM EVALUATION FEEDBACK:
        Feedback: ${previousEvaluation.feedback}
        As an agent in this system, you must adjust your strategy and output to address this feedback and improve the overall system score.` : ""}

        Please execute your task and provide the result. 
        
        CRITICAL: You MUST return your output in the following JSON structure:
        {
          "agent_name": "${agent.name}",
          "status": "success" | "failed" | "partial",
          "output": "Your detailed markdown-formatted result here...",
          "next_action": "What should happen next or what is missing",
          "confidence": 0-100
        }
        
        Make sure the "output" field contains visually attractive and well-structured Markdown.
        - Use Markdown extensively: Headings (###), Bullet points, Numbered lists, Bold text, and Tables where appropriate.
        - Organize your findings into clear sections with descriptive headers.
        - Ensure your response is concise but comprehensive.
        
        The priority is "${priority}". Adjust your effort and detail level accordingly. High priority tasks require maximum depth and precision.`;

      const systemInstruction = "You are a highly reliable autonomous agent. You MUST return a strictly valid JSON object matching the requested schema. The 'output' field inside the JSON should contain your detailed Markdown response.";

      const responsePromise = this.withRetry(() => apiCall("executeAgent", { prompt, systemInstruction, tools: agent.tools }));

      const text = await Promise.race([responsePromise, timeoutPromise]);
      if (!text) {
        throw new Error("Model returned an empty response during execution.");
      }
      
      const result = JSON.parse(text) as AgentOutput;
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
      const prompt = `You are an autonomous agent named "${agent.name}".
        Your Role: ${agent.role}
        Your Objective: ${agent.objective}
        Your Previous Result: ${agent.result || "No result (failed)"}
        
        The overall system evaluation was:
        Score: ${evaluation.score}/100
        Feedback: ${evaluation.feedback}
        
        Reflect on your performance. Why did the system fail to meet expectations? What could you have done better in your specific role? 
        Provide a concise "learning" or "strategy adjustment" for your future self. Focus on technical improvements or objective refinements.`;

      const systemInstruction = "You are a self-improving autonomous agent. Analyze feedback and provide a concise technical learning or strategy adjustment. Do not be conversational.";

      const text = await this.withRetry(() => apiCall("agentSelfReflect", { prompt, systemInstruction }));

      return text || "No learning generated.";
    } catch (error) {
      console.error(`Error in agentSelfReflect for ${agent.name}:`, error);
      return "Failed to generate learning from feedback.";
    }
  }

  async diagnoseFailure(agent: Agent, error: string, task: string, allAgents: Agent[]): Promise<string> {
    console.log(`Diagnosing failure for agent ${agent.name}...`);
    
    const agentStates = allAgents.map(a => `- ${a.name} (${a.role}): ${a.status}`).join('\n');

    try {
      const prompt = `You are a System Diagnostic AI. An autonomous agent in a multi-agent system has failed.
        
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
        
        Format your response as a concise Markdown report.`;

      const systemInstruction = "You are a System Diagnostic AI. Provide clear, technical, and actionable failure analysis for multi-agent systems.";

      const text = await this.withRetry(() => apiCall("diagnoseFailure", { prompt, systemInstruction }));

      return text || "Failed to generate diagnosis.";
    } catch (err) {
      console.error(`Error in diagnoseFailure for ${agent.name}:`, err);
      return `Diagnosis failed. Original error: ${error}`;
    }
  }

  async evaluateResult(task: string, finalResult: string, plan?: Plan): Promise<Evaluation> {
    console.log("Evaluating final result...");
    const maxResultLength = 15000;
    const truncatedResult = finalResult.length > maxResultLength 
      ? finalResult.substring(0, maxResultLength) + "... [truncated]"
      : finalResult;

    const agentsContext = plan ? `
        SYSTEM ARCHITECTURE: ${plan.systemDescription}
        AGENTS AND THEIR OBJECTIVES:
        ${plan.agents.map(a => `- ${a.name} (${a.role}): ${a.objective}`).join('\n')}
    ` : "";

    const timeout = 60000; // 60 seconds timeout
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Evaluator AI timed out.")), timeout)
    );

    try {
      const prompt = `You are a Senior System Evaluator AI. Your task is to perform a rigorous quality audit of the final output generated by a multi-agent system.

        USER ORIGINAL TASK: "${task}"
        ${agentsContext}
        
        FINAL SYSTEM OUTPUT TO EVALUATE:
        "${truncatedResult}"
        
        EVALUATION CRITERIA:
        1. **Objective Alignment**: Did the system follow the designed architecture? Did each agent's contribution (as seen in the final output) meet its specific objective?
        2. **Completeness**: Are all parts of the user's request addressed?
        3. **Accuracy & Technical Depth**: Is the information factually correct and sufficiently detailed for the task complexity?
        4. **Structural Integrity**: Is the output well-formatted (Markdown, tables, etc.) and easy to consume?

        SCORING RUBRIC (0-100):
        - 0-30: CRITICAL FAILURE. Missing core components, highly inaccurate, or ignored the user task.
        - 31-60: PARTIAL SUCCESS. Met basic requirements but lacks depth, has minor inaccuracies, or failed specific agent objectives.
        - 61-85: HIGH QUALITY. Meets all core objectives, accurate, and well-structured.
        - 86-100: EXCEPTIONAL. Exceeds expectations, perfect alignment with architecture, and provides deep insights.

        DECISION LOGIC:
        - "terminate": The score is 86-100 (Exceptional) OR the task is completely impossible to improve further.
        - "refine": The score is 31-85 and can be improved with another iteration.
        - "continue": The score is 0-30 and the system should try a completely different approach or continue the loop.

        Your feedback must be technical and constructive. Explicitly state what is missing or what needs improvement for the next refinement iteration.

        Return in JSON format.`;

      const systemInstruction = "You are a Senior System Evaluator AI. Provide a rigorous, objective, and technical evaluation of the system output. Return your audit in a strictly valid JSON format.";

      const responsePromise = this.withRetry(() => apiCall("evaluateResult", { prompt, systemInstruction }));

      const text = await Promise.race([responsePromise, timeoutPromise]);
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
      const prompt = `You are the interface for a custom AI system named "${plan.systemName}".
            
            System Context:
            - Original Task: "${task}"
            - Architecture: ${plan.systemDescription}
            - Agents Involved: ${plan.agents.map(a => `${a.name} (${a.role})`).join(', ')}
            - Execution Results:
            ${truncatedResults}
            
            You must respond as the collective intelligence of this system. Answer the user's questions about the results, provide more details, or perform further analysis based on the existing data.
            
            Chat History:
            ${recentHistory.map(h => `${h.role === 'user' ? 'User' : 'System'}: ${h.text}`).join('\n')}
            
            User: ${userMessage}`;

      const systemInstruction = `You are the interface for a custom AI system named "${plan.systemName}". You must respond as the collective intelligence of this system. Answer the user's questions about the results, provide more details, or perform further analysis based on the existing data. Use Markdown for formatting (headings, lists, bold text, tables) to make your output reliable and easy to read.`;

      const text = await this.withRetry(() => apiCall("chatWithSystem", { prompt, systemInstruction }));

      return text || "I'm sorry, I couldn't generate a response.";
    } catch (error) {
      console.error("Error in chatWithSystem:", error);
      throw error;
    }
  }
}

export const metaAgentService = new MetaAgentService();
