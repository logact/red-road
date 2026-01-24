Here is the fully updated **Product Specification (Version 3.0)**.

This version integrates the **Adaptive Architect** logic to handle goals of varying scale (from simple tasks to massive software projects) and defines the **MVP Strategy** based on our discussion.

---

# Product Specification: The Action Engine (Volition OS) v3.0

## Core Philosophy

Traditional tools manage Time (Calendars) or Lists (To-Do apps). This system manages **Volition (Human Willpower)**. It assumes the user is biological, volatile, and prone to "loss of flow." It proactively restructures large, scary goals into atomic, edible units based on the user's current energy state.

---

## 1. System Architecture: The "Idea-to-Action" Pipeline

The system moves data through six distinct stages to ensure clarity before execution.

1. **Input:** Voice/Text Entry.
    
2. **The Classifier:** Sorts "Noise" from "Intent."
    
3. **The Gatekeeper:** Validates "Intent" via Stress Tests & MVP Proof.
    
4. **The Surveyor:** Defines Scope, Context, and Constraints.
    
5. **The Adaptive Architect:** Dynamically structures the plan based on Complexity Sizing (S/M/L/XL).
    
6. **The Action Engine:** serves "Jobs" based on Energy/State using a Context-Aware Filter.
    
7. **The Recalibrator:** Feeds execution data back to the Architect to repair broken plans.
    

---

## 2. Module Breakdown

### Module A: The Classifier (The Sorter)

- **Logic:** Immediate semantic analysis.
    
- **Routing:**
    
    - _Reflective_ ("I feel stuck") $\rightarrow$ **The Incubator**.
        
    - _Intent_ ("I want to build X") $\rightarrow$ **The Gatekeeper**.
        

### Module B: The Gatekeeper (The Validator)

- **Objective:** Prevent "Wishful Thinking" from clogging the system.
    
- **Mechanism 1: The Contextual Stress Test.** (Trade-off questions).
    
- **Mechanism 2: The MVP (Minimum Viable Proof).**
    
    - _Logic:_ The User must produce a tiny _output_ before the system agrees to plan the project.
        
    - _Example:_ "Write the README.md," not "Watch a tutorial."
        

### Module C: The Adaptive Architect (The Strategist)

_Updated to handle variable scale via 'Duration-Based Decomposition'._

#### **Phase 1: The Site Survey (The Scoping)**

- **Objective:** Establish the "Triangle of Scope."
    
- **Vectors:**
    
    1. **Tools:** Stack/Resources available.
        
    2. **Constraints:** Hard time-cap per week.
        
    3. **Definition of Done:** The binary finish line.
        

#### **Phase 2: Complexity Assessment (The Sizing)**

- **Logic:** Before planning, the Agent estimates total effort based on survey data.
    
    - **Small (<20h):** Linear Structure.
        
    - **Medium (20-100h):** Functional Structure.
        
    - **Large (>100h):** Phased Structure (Chapters).
        

#### **Phase 3: Fractal Decomposition (The Blueprint)**

- **Objective:** Breaking the goal down without overwhelming the user.
    
- **The "Miller’s Law" Constraint:** No list may exceed 7 items at any hierarchy level.
    
- **The Hierarchy:**
    
    1. **Phases:** (Only for Large Goals) High-level chapters (e.g., "MVP", "Scale").
        
    2. **Milestones:** Major deliverables.
        
    3. **Job Clusters:** (New) Groupings within dense milestones to organize tasks (e.g., "Database Setup," "Frontend Logic").
        
    4. **Jobs:** Atomic units ($< 2$ hours).
        

### Module D: The Action Engine (The Tactician)

- **Objective:** Dynamic Execution via Context-Aware Filtering.
    
- **Logic:** It does not "plan"; it "serves" from the Architect’s active cluster.
    
- **The Filter Chain:**
    
    1. **Crisis Check:** Is `deadline < 24h`? If YES $\rightarrow$ Override Menu, show only Urgent Task.
        
    2. **Energy Match:** If `user_state == LOW` $\rightarrow$ Filter for `type: QUICK_WIN`.
        
    3. **Cluster Focus:** Only show jobs from the _current_ Job Cluster to prevent context switching.
        

### Module E: The Recalibrator (The Self-Healing Loop)

**Objective:** Fix plans when execution fails.

#### process
1. When user failed to give user following choice:
	1. Try next time: the system will
		1. Record these fail record(record failed note),
		2. Upgrade the job's level of difficulty
		3. Change the job's state to active wait user's next try
	2. Change the content of job: the system will
		1. review the change reason(user input) and give opinion to user insist on the job or change the content of job.
		2. if user confirm to change the content of job ,the system should regenerate the job to replace the current job and wait user's confirm ,the user can select regenerate the content of the job until confirm the new content job.
	3. Give up the goal
		1. user mark the goal's status to failed.

---

## 3. The Technical Data Model (Updated)

Updated to support **Complexity Sizing** and **Job Clusters**.

JSON

```
{
  "goal_id": "G_001",
  "title": "Build SaaS Platform",
  "complexity": {
     "size": "LARGE",
     "estimated_total_hours": 150,
     "projected_end_date": "2024-12-01"
  },
  "scope": {
     "hard_constraint_hours_per_week": 10,
     "tech_stack": ["Next.js", "Supabase"]
  },
  "architecture": {
    "current_phase_index": 0,
    "phases": [
      {
        "id": "PH_1",
        "title": "The MVP Core",
        "status": "ACTIVE",
        "milestones": [
          {
            "id": "M_1",
            "title": "Authentication & Database",
            "status": "ACTIVE",
            "job_clusters": [
              {
                "title": "Supabase Configuration",
                "jobs": [
                  {
                    "id": "J_101",
                    "title": "Init Supabase Project",
                    "type": "QUICK_WIN",
                    "est_minutes": 15,
                    "status": "PENDING"
                  },
                  {
                    "id": "J_102",
                    "title": "Design User Table Schema",
                    "type": "ANCHOR",
                    "est_minutes": 90,
                    "status": "PENDING"
                  }
                ]
              },
              {
                "title": "Auth Middleware",
                "jobs": [] // Populated only when active
              }
            ]
          }
        ]
      }
    ]
  }
}
```

---

## 4. MVP Implementation Strategy

To validate this product without building a complex custom backend engine, the MVP will utilize **LLM Prompt Chaining** with **Strict JSON Schemas**.

### The "Wizard of Oz" Logic Flow:

1. **The Prompt Chain (Architect):**
    
    - Instead of one prompt, use a 3-step chain:
        
        - _Prompt A:_ Assess Size $\rightarrow$ Output `Complexity` JSON.
            
        - _Prompt B:_ Based on `Complexity`, generate `Phases` and `Milestones`.
            
        - _Prompt C:_ Based on `Active Milestone`, generate `Job Clusters` and `Jobs`.
            
2. **The Logic Layer (Action Engine):**
    
    - A simple Python/JS script that reads the JSON.
        
    - `if job.deadline < now + 24h: return CRISIS_UI`
        
    - `if user.input == "Low Energy": return filter(jobs, type="QUICK_WIN")`
        
3. **The Interface:**
    
    - Text-based chat (Streamlit/React) wrapper.
        

---

## 5. UX Philosophy

- **Compass, not Map:** Focus on "What is next," not "Everything at once."
    
- **Smart Friction:**
    
    - _Planning Phase:_ **High Friction.** The AI asks clarifying questions to prevent hallucinated plans.
        
    - _Execution Phase:_ **Zero Friction.** The AI serves tasks immediately.
        
- **No Shame:** Stalled tasks are treated as a data problem (wrong size), not a character flaw.