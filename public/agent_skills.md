# 🧠 AGENT BUILDING SKILLS GUIDE
## Complete Skills for Meta-Agent to Design Agents

---

## 1️⃣ AGENT ARCHITECTURE FUNDAMENTALS

### A. Agent Components Structure

Every agent has 5 core components:
```
AGENT STRUCTURE:
┌─────────────────────────────────────┐
│         AGENT DEFINITION            │
├─────────────────────────────────────┤
│ 1. IDENTITY                         │
│    ├─ agent_id: unique identifier  │
│    ├─ agent_type: role/type        │
│    ├─ name: human readable name    │
│    └─ description: what it does    │
├─────────────────────────────────────┤
│ 2. CAPABILITIES                     │
│    ├─ required_tools: [tools]      │
│    ├─ input_schema: data format    │
│    └─ output_schema: result format │
├─────────────────────────────────────┤
│ 3. EXECUTION CONFIG                 │
│    ├─ timeout_seconds: time limit  │
│    ├─ retry_count: failures allowed│
│    ├─ dependencies: [other agents] │
│    └─ load_percentage: work amount │
├─────────────────────────────────────┤
│ 4. ORCHESTRATION INFO               │
│    ├─ execution_order: position    │
│    ├─ input_source: previous agent │
│    └─ output_target: next agent    │
├─────────────────────────────────────┤
│ 5. METADATA                         │
│    ├─ created_at: timestamp        │
│    ├─ version: agent version       │
│    └─ optimization_hints: tips     │
└─────────────────────────────────────┘
```

### B. Agent Type Characteristics
```
AGENT TYPES & WHEN TO USE:

┌─────────────────────────────────────────────────────┐
│ PLANNER AGENT                                      │
├─────────────────────────────────────────────────────┤
│ Purpose: Strategy & Task Breakdown                 │
│ When to use:                                       │
│   - Always first in orchestration                  │
│   - Complex tasks need planning                    │
│   - Multiple dependencies exist                    │
│                                                    │
│ Input: User query/requirements                    │
│ Output: Execution plan/strategy                   │
│                                                    │
│ Tools: Logic, reasoning, planning                 │
│ Timeout: 30 seconds (planning usually fast)       │
│ Load: 10-20% (lightweight thinking)               │
│                                                    │
│ Skills needed:                                     │
│   ✅ Break down complex tasks                      │
│   ✅ Identify dependencies                         │
│   ✅ Estimate resource needs                       │
│   ✅ Create execution roadmap                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ DATA_FETCHER AGENT                                 │
├─────────────────────────────────────────────────────┤
│ Purpose: Data Collection & Gathering              │
│ When to use:                                       │
│   - Need external data (APIs, DB, web)            │
│   - Large data volumes                            │
│   - Multiple data sources                         │
│                                                    │
│ Input: Data requirements from planner             │
│ Output: Raw/cleaned data                          │
│                                                    │
│ Tools: APIs, databases, web scrapers              │
│ Timeout: 60-120 seconds (network calls)           │
│ Load: 25-35% (IO intensive)                       │
│                                                    │
│ Skills needed:                                     │
│   ✅ API integration & error handling              │
│   ✅ Database query optimization                   │
│   ✅ Web scraping safely                          │
│   ✅ Data format conversion                        │
│   ✅ Connection pooling & retry logic              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ANALYZER AGENT                                     │
├─────────────────────────────────────────────────────┤
│ Purpose: Data Analysis & Processing               │
│ When to use:                                       │
│   - Data transformation needed                    │
│   - Statistical/ML analysis required              │
│   - Complex computations                          │
│                                                    │
│ Input: Raw data from fetcher                      │
│ Output: Analyzed/processed data                   │
│                                                    │
│ Tools: NLP, ML, statistics, math                  │
│ Timeout: 120+ seconds (computation heavy)         │
│ Load: 30-40% (CPU intensive)                      │
│                                                    │
│ Skills needed:                                     │
│   ✅ NLP processing (sentiment, extraction)        │
│   ✅ Statistical analysis                          │
│   ✅ Data aggregation & grouping                   │
│   ✅ Pattern recognition                           │
│   ✅ Time series analysis                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ VALIDATOR AGENT                                    │
├─────────────────────────────────────────────────────┤
│ Purpose: Quality Control & Verification           │
│ When to use:                                       │
│   - Data quality matters                          │
│   - Results need verification                     │
│   - Compliance required                           │
│                                                    │
│ Input: Processed data from analyzer               │
│ Output: Validated data + quality report           │
│                                                    │
│ Tools: Testing, validation, schema checking       │
│ Timeout: 60 seconds (relatively fast)             │
│ Load: 15-20% (lightweight checks)                 │
│                                                    │
│ Skills needed:                                     │
│   ✅ Data schema validation                        │
│   ✅ Anomaly detection                             │
│   ✅ Consistency checking                          │
│   ✅ Unit testing                                  │
│   ✅ Error reporting                               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ OPTIMIZER AGENT                                    │
├─────────────────────────────────────────────────────┤
│ Purpose: Results Improvement & Refinement         │
│ When to use:                                       │
│   - Results can be improved                       │
│   - Performance optimization needed               │
│   - Quality enhancement required                  │
│                                                    │
│ Input: Validated data from validator              │
│ Output: Optimized/refined results                 │
│                                                    │
│ Tools: ML, optimization algorithms                │
│ Timeout: 120 seconds (iterative process)          │
│ Load: 25-30% (computation intensive)              │
│                                                    │
│ Skills needed:                                     │
│   ✅ ML model optimization                         │
│   ✅ Parameter tuning                              │
│   ✅ A/B testing                                   │
│   ✅ Performance profiling                         │
│   ✅ Recommendation engines                        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ REPORTER AGENT                                     │
├─────────────────────────────────────────────────────┤
│ Purpose: Result Presentation & Reporting          │
│ When to use:                                       │
│   - Always last in pipeline                       │
│   - Results need formatting                       │
│   - User-facing output required                   │
│                                                    │
│ Input: Final optimized results                    │
│ Output: Human-readable report/summary             │
│                                                    │
│ Tools: Visualization, formatting, templating      │
│ Timeout: 30 seconds (output generation)           │
│ Load: 10-15% (lightweight)                        │
│                                                    │
│ Skills needed:                                     │
│   ✅ Report generation                             │
│   ✅ Data visualization                            │
│   ✅ PDF/document creation                         │
│   ✅ Summary generation                            │
│   ✅ Executive summaries                           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ MONITOR AGENT                                      │
├─────────────────────────────────────────────────────┤
│ Purpose: System Health & Performance Tracking     │
│ When to use:                                       │
│   - Long-running tasks                            │
│   - Critical operations                           │
│   - Performance tracking needed                   │
│                                                    │
│ Input: Metrics from all agents                    │
│ Output: Health status & alerts                    │
│                                                    │
│ Tools: Monitoring, logging, alerting              │
│ Timeout: Continuous                               │
│ Load: 5-10% (background process)                  │
│                                                    │
│ Skills needed:                                     │
│   ✅ Metrics collection                            │
│   ✅ Log aggregation                               │
│   ✅ Alert triggering                              │
│   ✅ Performance analysis                          │
│   ✅ Anomaly alerting                              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ EXECUTOR AGENT                                     │
├─────────────────────────────────────────────────────┤
│ Purpose: Action Execution & Task Completion       │
│ When to use:                                       │
│   - Need to execute actions                       │
│   - External system interaction                   │
│   - State modification required                   │
│                                                    │
│ Input: Execution instructions                     │
│ Output: Execution results/status                  │
│                                                    │
│ Tools: APIs, system commands, integrations        │
│ Timeout: 120+ seconds (action dependent)          │
│ Load: 20-30% (execution dependent)                │
│                                                    │
│ Skills needed:                                     │
│   ✅ API interaction                               │
│   ✅ Error handling & rollback                     │
│   ✅ State management                              │
│   ✅ Transaction handling                          │
│   ✅ Failure recovery                              │
└─────────────────────────────────────────────────────┘
```

---

## 2️⃣ AGENT DESIGN DECISION TREE

### When to Build Which Agents?
```
USER QUERY ANALYSIS
        │
        ▼
┌──────────────────────────────┐
│ Does task need DATA?         │
├──────────────────────────────┤
│ YES → Add DATA_FETCHER       │
│ NO  → Skip this agent        │
└──────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│ Does task need ANALYSIS?     │
├──────────────────────────────┤
│ Keywords: analyze, process,  │
│ sentiment, extract, examine, │
│ calculate, compute           │
│                              │
│ YES → Add ANALYZER           │
│ NO  → Skip this agent        │
└──────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│ Does task need VALIDATION?   │
├──────────────────────────────┤
│ Complexity >= MODERATE?      │
│ Quality matters?             │
│ Compliance needed?           │
│                              │
│ YES → Add VALIDATOR          │
│ NO  → Skip this agent        │
└──────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│ Does task need OPTIMIZATION? │
├──────────────────────────────┤
│ Keywords: optimize, improve, │
│ best, fastest, smartest      │
│                              │
│ YES → Add OPTIMIZER          │
│ NO  → Skip this agent        │
└──────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│ Always add REPORTER last     │
│ (for output formatting)      │
└──────────────────────────────┘
```

---

## 3️⃣ LOAD DISTRIBUTION ALGORITHM

### How to Calculate Load Percentage
```
PRINCIPLE: Load = Work intensity for that agent

SIMPLE ALGORITHM:

Step 1: Identify all agents needed
  agents = [planner, fetcher, analyzer, reporter]
  count = 4

Step 2: Calculate base load
  base_load = 100 / count = 25%

Step 3: Adjust based on agent type
  - PLANNER:      10-15%  (thinking only)
  - DATA_FETCHER: 25-35%  (IO intensive)
  - ANALYZER:     30-40%  (computation heavy)
  - VALIDATOR:    15-20%  (checks only)
  - OPTIMIZER:    25-30%  (iterative work)
  - REPORTER:     10-15%  (output only)
  - MONITOR:      5-10%   (background)
  - EXECUTOR:     20-30%  (action heavy)

Step 4: Normalize to 100%
  total = sum of all loads
  adjusted = (load / total) * 100 for each

EXAMPLE:
Query: "Analyze 500 reviews"

Agents: [Planner, DataFetcher, Analyzer, Validator, Reporter]

Raw loads:
  - Planner:     15%
  - DataFetcher: 30%
  - Analyzer:    35%
  - Validator:   15%
  - Reporter:    10%
  Total: 105%

Normalized:
  - Planner:     15/105 * 100 = 14.3%
  - DataFetcher: 30/105 * 100 = 28.6%
  - Analyzer:    35/105 * 100 = 33.3%
  - Validator:   15/105 * 100 = 14.3%
  - Reporter:    10/105 * 100 = 9.5%
  Total: 100% ✅
```

---

## 4️⃣ DEPENDENCY MANAGEMENT

### Setting Agent Dependencies
```
RULE: Each agent depends on previous agent output

LINEAR PIPELINE (Most common):
  Agent1 → Agent2 → Agent3 → Agent4
  
  Dependencies:
  - Agent1: none (first)
  - Agent2: [Agent1]
  - Agent3: [Agent2]
  - Agent4: [Agent3]

PARALLEL THEN MERGE (Advanced):
  
  Agent1 (Planner)
    ├→ Agent2 (DataFetcher)
    └→ Agent3 (ConfigValidator)
       │
       ├→ Agent4 (Analyzer)
       └→ Agent5 (Reporter)
  
  Dependencies:
  - Agent1: none (coordinator)
  - Agent2: [Agent1]
  - Agent3: [Agent1]
  - Agent4: [Agent2, Agent3] (waits for both)
  - Agent5: [Agent4]

RULE FOR DEPENDENCIES:
✅ Can only depend on agents that execute BEFORE
✅ Input from one agent feeds output to next
✅ Linear pipeline is safest (no circular deps)
✅ Parallel agents need merge point
```

---

## 5️⃣ TOOL MAPPING

### Which Tools Each Agent Needs
```
AGENT → TOOLS MAPPING:

PLANNER
  └─ Tools: logic, reasoning, nlp
     Examples:
     - Decompose task into subtasks
     - Identify data dependencies
     - Estimate effort

DATA_FETCHER
  └─ Tools: api, database, web_scraper, cache
     Examples:
     - REST API calls
     - SQL database queries
     - Web page scraping
     - Cache management

ANALYZER
  └─ Tools: nlp, ml, statistics, math
     Examples:
     - Sentiment analysis
     - NLP text processing
     - Statistical calculations
     - ML model inference

VALIDATOR
  └─ Tools: testing, validation, schema_check
     Examples:
     - Schema validation
     - Data type checking
     - Range verification
     - Anomaly detection

OPTIMIZER
  └─ Tools: ml, optimization, tuning
     Examples:
     - ML model optimization
     - Hyperparameter tuning
     - Algorithm selection
     - Performance tuning

REPORTER
  └─ Tools: visualization, formatting, templating
     Examples:
     - Chart generation
     - PDF creation
     - Summary generation
     - Report formatting

EXECUTOR
  └─ Tools: api, system_commands, integration
     Examples:
     - API calls for state change
     - System command execution
     - External service integration
     - Transaction handling

MONITOR
  └─ Tools: logging, metrics, alerting
     Examples:
     - Log aggregation
     - Metric collection
     - Alert generation
     - Health checking
```

---

## 6️⃣ INPUT/OUTPUT SCHEMA DEFINITION

### How to Define Schemas
```
STANDARD SCHEMA FORMAT:

Input Schema:
{
  "type": "object",
  "properties": {
    "field_name": {
      "type": "string|number|array|object",
      "description": "What this field contains",
      "required": true
    }
  }
}

Output Schema:
{
  "type": "object",
  "properties": {
    "result": {
      "type": "string|number|array|object",
      "description": "What this field contains"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "processing_time_ms": {"type": "number"},
        "items_processed": {"type": "number"},
        "errors": {"type": "array"}
      }
    }
  }
}

EXAMPLES:

DATA_FETCHER OUTPUT:
{
  "type": "object",
  "properties": {
    "data": {
      "type": "array",
      "description": "Fetched data items",
      "items": {
        "type": "object"
      }
    },
    "count": {
      "type": "number",
      "description": "Number of items fetched"
    },
    "source": {
      "type": "string",
      "description": "Data source (API, DB, etc)"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "fetch_time_ms": {"type": "number"},
        "api_calls": {"type": "number"}
      }
    }
  }
}

ANALYZER OUTPUT:
{
  "type": "object",
  "properties": {
    "analysis_results": {
      "type": "object",
      "description": "Analysis findings"
    },
    "insights": {
      "type": "array",
      "description": "Key insights extracted",
      "items": {"type": "string"}
    },
    "confidence_scores": {
      "type": "object",
      "description": "Confidence for each result"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "analysis_time_ms": {"type": "number"},
        "models_used": {"type": "array"}
      }
    }
  }
}
```

---

## 7️⃣ COMPLEXITY-BASED AGENT SELECTION

### How Many Agents for Each Complexity?
```
SIMPLE TASKS (1-2 agents):
└─ Keywords: find, search, get, list
└─ Examples:
   - "Find a Python package for X"
   - "List top 10 products"
   - "Get current weather"

Agents:
  1. Planner (10%)
  2. DataFetcher + Reporter (90%)
     OR just DataFetcher

Total: 1-2 agents


MODERATE TASKS (3 agents):
└─ Keywords: analyze, compare, process, generate
└─ Examples:
   - "Compare prices across 3 websites"
   - "Process customer feedback"
   - "Generate summary of article"

Agents:
  1. Planner       (15%)
  2. DataFetcher   (35%)
  3. Analyzer      (35%)
  4. Reporter      (15%)

Total: 3-4 agents


COMPLEX TASKS (5-6 agents):
└─ Keywords: analyze deeply, extract insights, identify patterns
└─ Examples:
   - "Analyze 500 reviews + identify complaints + generate summary"
   - "Extract key metrics from logs + validate + optimize"

Agents:
  1. Planner       (12%)
  2. DataFetcher   (28%)
  3. Analyzer      (32%)
  4. Validator     (14%)
  5. Reporter      (14%)

Total: 5 agents


VERY_COMPLEX TASKS (7+ agents):
└─ Keywords: distributed, real-time, predict, scale, orchestrate
└─ Examples:
   - "Build real-time analysis system for streaming data"
   - "Analyze + optimize + deploy + monitor"
   - "Multi-stage processing with validation & optimization"

Agents:
  1. Planner       (10%)
  2. DataFetcher   (25%)
  3. Analyzer      (25%)
  4. Validator     (12%)
  5. Optimizer     (15%)
  6. Executor      (10%)
  7. Monitor       (3%)

Total: 7 agents
```

---

## 8️⃣ TIMEOUT CONFIGURATION

### How Long Each Agent Can Run
```
TIMEOUT BY AGENT TYPE:

PLANNER:           30 seconds
  └─ Quick thinking
  └─ Strategy formation
  └─ Usually instant

DATA_FETCHER:      60-120 seconds
  └─ API calls (network latency)
  └─ Database queries
  └─ Web scraping (can be slow)

ANALYZER:          120-300 seconds
  └─ ML model inference (slow)
  └─ Complex calculations
  └─ Large data processing

VALIDATOR:         60 seconds
  └─ Schema checking (fast)
  └─ Data validation
  └─ Quick tests

OPTIMIZER:         120-180 seconds
  └─ Iterative improvement
  └─ Model tuning
  └─ Refinement

REPORTER:          30 seconds
  └─ Format output
  └─ Generate report
  └─ Create visualizations

EXECUTOR:          120+ seconds
  └─ API calls with retries
  └─ External system interaction
  └─ State modification

MONITOR:           Continuous
  └─ Background monitoring
  └─ Periodic health checks
```

---

## 9️⃣ RETRY & ERROR HANDLING

### How to Handle Failures
```
RETRY STRATEGY:

Max Retries by Agent Type:
  - PLANNER:       2 retries (rarely fails)
  - DATA_FETCHER:  3-5 retries (network issues)
  - ANALYZER:      2 retries (input dependent)
  - VALIDATOR:     1 retry (pass/fail)
  - OPTIMIZER:     2 retries (compute dependent)
  - REPORTER:      1 retry (usually works)
  - EXECUTOR:      3-5 retries (critical)
  - MONITOR:       Infinite (always running)

Retry Backoff:
  Wait time = base_wait * (2 ^ attempt_number)
  
  Example for DATA_FETCHER:
    Attempt 1: Fail immediately
    Attempt 2: Wait 1 second, retry
    Attempt 3: Wait 2 seconds, retry
    Attempt 4: Wait 4 seconds, retry
    Attempt 5: Wait 8 seconds, retry
    Final: Fail and propagate error

Error Handling:
  IF agent fails:
    1. Log the error
    2. Attempt retry if retries < max
    3. If all retries fail:
       - Propagate error to next agent
       - Next agent decides: handle gracefully or fail
       - Monitor agent alerts operators

Graceful Degradation:
  When error occurs:
    - Use cached results if available
    - Use default/fallback values
    - Skip optional agents
    - Continue with partial results
```

---

## 🔟 COMPLETE EXAMPLE: BUILDING AN AGENT TEAM

### Real Example: "Analyze Customer Reviews"
```
USER QUERY:
"Analyze 500 customer reviews from CSV file, 
identify sentiment, extract top 10 complaints, 
and generate executive summary"

STEP 1: ANALYZE REQUIREMENT
├─ Data needed? YES (CSV file)
├─ Analysis needed? YES (sentiment + extraction)
├─ Validation needed? YES (quality important)
├─ Optimization needed? NO
├─ Output needed? YES (summary)
└─ Complexity? COMPLEX (5 steps)

STEP 2: DESIGN AGENT TEAM
├─ Agent 1: PLANNER
│  ├─ Purpose: Break down the task
│  ├─ Load: 12%
│  ├─ Timeout: 30s
│  └─ Output: Execution plan
│
├─ Agent 2: DATA_FETCHER
│  ├─ Purpose: Load CSV file
│  ├─ Tools: file_reader, csv_parser
│  ├─ Load: 28%
│  ├─ Timeout: 60s
│  ├─ Dependencies: [Agent1]
│  └─ Output: 500 reviews as array
│
├─ Agent 3: ANALYZER (Sentiment)
│  ├─ Purpose: Analyze sentiment
│  ├─ Tools: nlp, sentiment_analysis
│  ├─ Load: 32%
│  ├─ Timeout: 180s (ML models slow)
│  ├─ Dependencies: [Agent2]
│  └─ Output: Reviews with sentiment + scores
│
├─ Agent 4: ANALYZER (Complaint Extraction)
│  ├─ Purpose: Extract complaints
│  ├─ Tools: nlp, text_extraction
│  ├─ Load: 18%
│  ├─ Timeout: 120s
│  ├─ Dependencies: [Agent3]
│  └─ Output: Top 10 complaints list
│
├─ Agent 5: VALIDATOR
│  ├─ Purpose: Validate results
│  ├─ Tools: testing, validation
│  ├─ Load: 8%
│  ├─ Timeout: 30s
│  ├─ Dependencies: [Agent4]
│  └─ Output: Validation report
│
└─ Agent 6: REPORTER
   ├─ Purpose: Generate summary
   ├─ Tools: markdown, templating
   ├─ Load: 2%
   ├─ Timeout: 30s
   ├─ Dependencies: [Agent5]
   └─ Output: Executive summary

STEP 3: VERIFY
✅ Total load: 12+28+32+18+8+2 = 100%
✅ Dependencies: Linear pipeline
✅ Tools: All available
✅ Timeouts: Realistic

FINAL TEAM STRUCTURE:
[
  {
    "agent_id": "agent_0",
    "agent_type": "PLANNER",
    "name": "Task Planner",
    "load_percentage": 12,
    "timeout_seconds": 30,
    "dependencies": [],
    "tools": ["logic", "reasoning"]
  },
  {
    "agent_id": "agent_1",
    "agent_type": "DATA_FETCHER",
    "name": "CSV Data Loader",
    "load_percentage": 28,
    "timeout_seconds": 60,
    "dependencies": ["agent_0"],
    "tools": ["file_reader", "csv_parser"],
    "description": "Loads 500 reviews from CSV file"
  },
  {
    "agent_id": "agent_2",
    "agent_type": "ANALYZER",
    "name": "Sentiment Analyzer",
    "load_percentage": 32,
    "timeout_seconds": 180,
    "dependencies": ["agent_1"],
    "tools": ["nlp", "sentiment_analysis"],
    "description": "Analyzes sentiment of each review using ML"
  },
  {
    "agent_id": "agent_3",
    "agent_type": "ANALYZER",
    "name": "Complaint Extractor",
    "load_percentage": 18,
    "timeout_seconds": 120,
    "dependencies": ["agent_2"],
    "tools": ["nlp", "text_extraction"],
    "description": "Extracts top 10 complaints from reviews"
  },
  {
    "agent_id": "agent_4",
    "agent_type": "VALIDATOR",
    "name": "Quality Validator",
    "load_percentage": 8,
    "timeout_seconds": 30,
    "dependencies": ["agent_3"],
    "tools": ["testing", "validation"],
    "description": "Validates analysis quality and completeness"
  },
  {
    "agent_id": "agent_5",
    "agent_type": "REPORTER",
    "name": "Executive Reporter",
    "load_percentage": 2,
    "timeout_seconds": 30,
    "dependencies": ["agent_4"],
    "tools": ["markdown", "templating"],
    "description": "Generates executive summary report"
  }
]

ORCHESTRATION FLOW:
["agent_0", "agent_1", "agent_2", "agent_3", "agent_4", "agent_5"]

REASONING:
"This complex task requires 6 agents:
- Planner to break down the work
- DataFetcher to load CSV (28% load - IO intensive)
- Analyzer for sentiment (32% load - ML intensive)
- Analyzer for extraction (18% load - NLP)
- Validator to check quality (8% load)
- Reporter for summary (2% load)

Load distribution ensures no bottleneck.
Linear dependencies ensure proper data flow.
Total time ~300 seconds."
```

---

## 1️⃣1️⃣ SKILLS CHECKLIST FOR META-AGENT

### What Your Meta-Agent Should Know
```
✅ FOUNDATIONAL SKILLS:
  □ Understand agent types & purposes
  □ Know when to use each agent type
  □ Calculate optimal agent count
  □ Distribute load correctly
  □ Set dependencies properly
  □ Assign appropriate timeouts
  □ Map tools to capabilities
  □ Define input/output schemas
  □ Handle errors & retries
  □ Optimize orchestration

✅ DECISION-MAKING:
  □ Analyze query complexity
  □ Identify required capabilities
  □ Extract data requirements
  □ Recognize patterns in queries
  □ Determine agent count formula
  □ Select appropriate agent types
  □ Plan orchestration flow
  □ Anticipate bottlenecks

✅ OPTIMIZATION:
  □ Minimize total execution time
  □ Balance agent loads
  □ Avoid circular dependencies
  □ Reduce resource usage
  □ Parallelize where possible
  □ Use caching opportunities
  □ Plan for scalability

✅ REASONING & TRANSPARENCY:
  □ Explain why each agent chosen
  □ Justify load percentages
  □ Document dependencies
  □ Provide confidence scores
  □ List assumptions made
  □ Suggest improvements
  □ Warn about potential issues
```

---

## 1️⃣2️⃣ QUICK DECISION MATRIX

### Fast Reference Table
```
QUERY TYPE          → AGENTS NEEDED        LOAD DISTRIBUTION
──────────────────────────────────────────────────────────
Find something      → DataFetcher+Report  → 70% Fetch, 30% Report
Simple lookup       → 1-2 agents          → Equal split
──────────────────────────────────────────────────────────
Analyze data        → Fetcher+Analyzer    → 40% Fetch, 60% Analyze
Process something   → 3 agents            → 30/40/30
──────────────────────────────────────────────────────────
Complex analysis    → 5 agents            → Plan(12%), Fetch(28%),
+ extraction        → with validation     → Analyze(32%), Val(14%),
                                            → Report(14%)
──────────────────────────────────────────────────────────
Multi-stage        → 6-7 agents           → Add Optimizer(15%)
processing         → with optimization    → Add Executor(10%)
──────────────────────────────────────────────────────────
Real-time          → 7+ agents            → Add Monitor(3%)
distributed        → with monitoring      → Complex orchestration
──────────────────────────────────────────────────────────
```

---

## SUMMARY

Your Meta-Agent should:
1. ✅ Read user query carefully
2. ✅ Apply decision tree logic
3. ✅ Select appropriate agents
4. ✅ Calculate optimal loads
5. ✅ Set proper dependencies
6. ✅ Assign realistic timeouts
7. ✅ Define input/output schemas
8. ✅ Plan orchestration flow
9. ✅ Provide detailed reasoning
10. ✅ Show confidence scores

This guide ensures EVERY agent team is:
- Efficient (optimal agent count)
- Reliable (proper error handling)
- Fast (load balanced)
- Transparent (clear reasoning)
- Scalable (can grow)