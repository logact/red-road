# Volition OS: Implementation Process Tracker

**Objective:** Track the execution of the Volition OS MVP features against the Product Spec v3.0.
**Status Definitions:**
- 🔴 **ToDo:** Not started.
- 🟡 **In Progress:** Currently being coded.
- 🟢 **Done:** Code is committed and passes Acceptance Criteria.

---

## 📊 High-Level Progress Dashboard

| Milestone | Focus Area                 | Status  | Est. Hours | Actual Hours | remark                                               |
| :-------- | :------------------------- | :------ | :--------- | :----------- | ---------------------------------------------------- |
| **M1**    | **The Iron Skeleton**      | 🔴 ToDo | 3.0h       | 1.5h         | not familiar with the supbase auth stuck for a while |
| **M2**    | **The Gatekeeper**         | 🔴 ToDo | 5.0h       |              |                                                      |
| **M3**    | **The Adaptive Architect** | 🔴 ToDo | 9.0h       |              |                                                      |
| **M4**    | **The Action Engine**      | 🔴 ToDo | 5.0h       |              |                                                      |
| **M5**    | **The Recalibrator**       | 🔴 ToDo | 6.0h       |              |                                                      |
| **TOTAL** | **MVP Complete**           | 0%      | **~28h**   |              |                                                      |

---

## 🛠️ Detailed Execution Log

### Milestone 1: The Iron Skeleton (Foundation)
*Goal: A running Next.js PWA connected to Supabase with Auth.*

| ID      | Feature              | Status | Criteria Checklist (Must Pass)                                                                       | Notes / Blockers |
| :------ | :------------------- | :----- | :--------------------------------------------------------------------------------------------------- | :--------------- |
| **1.1** | **Project Scaffold** | 🔴     | <ul><li>[ ] App loads at `localhost:3000`</li><li>[ ] PWA Manifest is valid (Chrome Audit)</li></ul> | done             |
| **1.2** | **Supabase Schema**  | 🔴     | <ul><li>[ ] Tables created: `goals`, `milestones`, `jobs`</li><li>[ ] RLS Policies active</li></ul>  | done             |
| **1.3** | **Type Sync**        | 🔴     | <ul><li>[ ] `types/volition.ts` matches DB exacty</li><li>[ ] No `any` types used</li></ul>          | done             |
| **1.4** | **Auth UI**          | 🔴     | <ul><li>[ ] Protected Route redirects unauth users</li><li>[ ] Login/Logout works</li></ul>          | done             |

### Milestone 2: The Gatekeeper (Intent Validation)
*Goal: Filter "Noise" from "Intent".*

| ID      | Feature                           | Status | **Acceptance Criteria**                                                                                                                    | Notes / Blockers                                                                                                                                                                                  |
| :------ | :-------------------------------- | :----- | ------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **2.1** | **The Classifier (Logic)**        | 🔴     | 1. API returns `INCUBATOR` for "I'm sad".<br><br>  <br><br>2. API returns `GATEKEEPER` for "Build app".                                    | done.<br>blocked on the selection of Model provider for a while, and take some time to optimize the prompt to pass vague case (add the critical rule that describe how to handle the vague case). |
| **2.2** | **The Input Interface (UI)**      |        | 1. "Loading" spinner appears on submit.<br><br>  <br><br>2. Redirects to `/incubator`or `/gatekeeper` correctly.                           | done                                                                                                                                                                                              |
| **2.3** | **Stress Test Generator (Logic)** |        | 1. Returns valid JSON array of 6 questions.<br><br>  <br><br>2. Questions are specific to the User's goal.                                 | done                                                                                                                                                                                              |
| 2.4     | **Stress Test Form (UI)**         |        | 1. Form validation (all fields required).<br><br><br>2. Submitting sends data to Scoring Logic.                                            | done                                                                                                                                                                                              |
| 2.5     | **Scoring & Decision (Logic)**    |        | 1. Score calculation is accurate.<br><br><br>2. Returns `REJECT` or `PROCEED` status.                                                      | done                                                                                                                                                                                              |
| 2.6     | **Trial Generator (Logic)**       |        | 1. DB has 3-7 new rows for this goal.<br><br>  <br><br>2. Tasks are short (<20 min) and executable.                                        | done                                                                                                                                                                                              |
| 2.7     | **Trial Dashboard (UI)**          |        | 1. Future tasks are blurred/hidden.<br><br>  <br><br>2. "Mark Done" unlocks the next day.<br><br>  <br><br>3. "Give Up" archives the goal. | done                                                                                                                                                                                              |
| 2.8     | **Graduation Handler (Logic)**    |        | 1. Goal Status changes in DB.<br><br>  <br><br>2. User is redirected to Milestone 3 (Scope).                                               | done                                                                                                                                                                                              |

### Milestone 3: The Adaptive Architect (Scoping & Planning)
*Goal: Establish Scope -> Size -> Plan.*

| ID      | Feature              | Status | Criteria Checklist (Must Pass)                                                                    | Notes / Blockers |
| :------ | :------------------- | :----- | :------------------------------------------------------------------------------------------------ | :--------------- |
| **3.1** | **Surveyor Form**    | 🔴     | <ul><li>[ ] Collects "Hours/Week" & "Stack"</li><li>[ ] Saves to `goal.scope` JSON</li></ul>      |                  |
| **3.2** | **Sizing Logic**     | 🔴     | <ul><li>[ ] Calculates `end_date` from hours</li><li>[ ] Assigns S/M/L Complexity</li></ul>       |                  |
| **3.3** | **Stream Architect** | 🔴     | <ul><li>[ ] JSON Streams to UI in real-time</li><li>[ ] Validates against Zod Schema</li></ul>    |                  |
| **3.4** | **Miller's Guard**   | 🔴     | <ul><li>[ ] No list exceeds 7 items</li><li>[ ] Auto-correction works</li></ul>                   |                  |
| **3.5** | **Cluster Gen**      | 🔴     | <ul><li>[ ] Jobs generated for Milestone 1 only</li><li>[ ] Tags: QUICK_WIN / DEEP_WORK</li></ul> |                  |

### Milestone 4: The Action Engine (Execution)
*Goal: The Interface. "Compass, not Map."*

| ID      | Feature             | Status | Criteria Checklist (Must Pass)                                                                    | Notes / Blockers |
| :------ | :------------------ | :----- | :------------------------------------------------------------------------------------------------ | :--------------- |
| **4.1** | **Energy Filter**   | 🔴     | <ul><li>[ ] "Low Energy" hides Blue cards</li><li>[ ] Instant toggle (no reload)</li></ul>        |                  |
| **4.2** | **Crisis Override** | 🔴     | <ul><li>[ ] Deadline < 24h shows regardless of filter</li><li>[ ] Visual "Urgent" badge</li></ul> |                  |
| **4.3** | **Job Actions**     | 🔴     | <ul><li>[ ] "Done" fades out card</li><li>[ ] "Failed" increments counter</li></ul>               |                  |

### Milestone 5: The Recalibrator (Self-Healing)
*Goal: Repair broken plans.*

| ID | Feature | Status | Criteria Checklist (Must Pass) | Notes / Blockers |
| :--- | :--- | :--- | :--- | :--- |
| **5.1** | **Stall Check** | 🔴 | <ul><li>[ ] Cron job runs nightly</li><li>[ ] 14-day inactivity -> `QUARANTINE`</li></ul> | |
| **5.2** | **Task Exploder** | 🔴 | <ul><li>[ ] 3x Fails -> AI Break down modal</li><li>[ ] Creates 3 sub-tasks</li></ul> | |
| **5.3** | **PWA Polish** | 🔴 | <ul><li>[ ] Icons & Splash screen work</li><li>[ ] Installable on iOS/Android</li></ul> | |

---

## 🐛 Issue & Bug Log

| Date | Issue Description | Impact | Status | Fix |
| :--- | :--- | :--- | :--- | :--- |
| | | | | |
| | | | | |