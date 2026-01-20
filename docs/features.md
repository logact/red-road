# Volition OS Feature Roadmap MVP

Based on the finalized feature roadmap for **Volition OS**, this document serves as the "Source of Truth" for driving development in Cursor1.

---

## Milestone 1: The Iron Skeleton (Foundation)

**Goal:** A running Next.js PWA connected to Supabase with Auth2.

| **Feature ID** | **Feature Name** | **Description**                                                                                                                                                              | **Acceptance Criteria**                                                                           | **Est. Effort** |
| -------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------- |
| **1.1**        | Project Scaffold | Initialize Next.js 14+ (App Router), TypeScript, Tailwind, ai SDK, and manifest.json for PWA support3.                                                                       | 1. App loads at localhost:3000.<br><br>  <br><br>2. PWA is installable on mobile4.                | 1.0h            |
| **1.2**        | Supabase Schema  | Create SQL migrations for goals, phases, milestones, and jobs per PRD Section 35.                                                                                            | 1. Tables exist in Supabase Dashboard.<br><br>  <br><br>2. RLS policies set for user privacy6.    | 1.0h            |
| **1.3**        | Type Sync        | Define TypeScript interfaces in `types/volition.ts` (Complexity, Scope, Job, Goal)7.                                                                                         | 1. Types match Supabase DB columns.<br><br>  <br><br>2. No `any` types in core models8.           | 0.5h            |
| **1.4**        | Auth UI          | Implement Login page with Supabase Auth (Magic Link) and a Protected Route wrapper9.<br>Implement Login page with Supabase Auth (Magic Link) and a Protected Route wrapper9. | 1. Unauthenticated access redirects to /login.<br><br>  <br><br>2. Login persists user session10. | 1.5h            |

---

## Milestone 2: The Gatekeeper (Intent Validation)

**Goal:** Filter "Noise" from "Intent" (Module A & B). Does not involve detailed scoping11.

| **Feature ID** | **Feature Name**                  | **Description**                                                                                                                                    | **Acceptance Criteria**                                                                                                                    | **Est. Effort** |
| -------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| **2.1**        | **The Classifier (Logic)**        | **Server Action.**<br><br>  <br><br>Receives raw text. Uses AI to classify as `INCUBATOR`(Mood) or `GATEKEEPER` (Goal).                            | 1. API returns `INCUBATOR` for "I'm sad".<br><br>  <br><br>2. API returns `GATEKEEPER` for "Build app".                                    | 1.0h            |
| **2.2**        | **The Input Interface (UI)**      | **Frontend Component.**<br><br>  <br><br>The landing page input box. Handles the loading state while 2.1 is running and redirects based on result. | 1. "Loading" spinner appears on submit.<br><br>  <br><br>2. Redirects to `/incubator`or `/gatekeeper` correctly.                           | 1.0h            |
| **2.3**        | **Stress Test Generator (Logic)** | **Server Action.**<br><br>  <br><br>Takes the Goal Title. Generates 3 "Pain" questions and 3 "Drive" questions. Returns JSON.                      | 1. Returns valid JSON array of 6 questions.<br><br>  <br><br>2. Questions are specific to the User's goal.                                 | 1.0h            |
| **2.4**        | **Stress Test Form (UI)**         | **Frontend Component.**<br><br>  <br><br>Displays the 6 questions. Inputs: Text Areas + Range Sliders (1-10) for confidence.                       | 1. Form validation (all fields required).<br><br>  <br><br>2. Submitting sends data to Scoring Logic.                                      | 2.0h            |
| **2.5**        | **Scoring & Decision (Logic)**    | **Server Action.**<br><br>  <br><br>Calculates score `(Pain*0.4 + Drive*0.6)`.<br><br>  <br><br>If < 60: Reject. If > 60: Call "Trial Generator".  | 1. Score calculation is accurate.<br><br>  <br><br>2. Returns `REJECT` or `PROCEED` status.                                                | 0.5h            |
| **2.6**        | **Trial Generator (Logic)**       | **Server Action.**<br><br>  <br><br>Generates a 3-7 day "Micro-Plan". Inserts rows into `trial_tasks` table.                                       | 1. DB has 3-7 new rows for this goal.<br><br>  <br><br>2. Tasks are short (<20 min) and executable.                                        | 1.5h            |
| **2.7**        | **Trial Dashboard (UI)**          | **Frontend Component.**<br><br>  <br><br>The "Limbo" View. Shows _only_ the active day's task. Hides future days.                                  | 1. Future tasks are blurred/hidden.<br><br>  <br><br>2. "Mark Done" unlocks the next day.<br><br>  <br><br>3. "Give Up" archives the goal. | 2.5h            |
| **2.8**        | **Graduation Handler (Logic)**    | **Server Action.**<br><br>  <br><br>Triggered when the final task is done. Updates Goal Status to `PENDING_SCOPE`.                                 | 1. Goal Status changes in DB.<br><br>  <br><br>2. User is redirected to Milestone 3 (Scope).                                               | 0.5h            |



---

## Milestone 3: The Adaptive Architect (Scoping & Planning)

**Goal:** Establish Scope (Module C, Phase 1) $\to$ Size (Phase 2) $\to$ Plan (Phase 3)18.

| **Feature ID** | **Feature Name**    | **Description**                                                                      | **Acceptance Criteria**                                                                                   | **Est. Effort** |
| -------------- | ------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | --------------- |
| **3.1**        | The Surveyor Form   | UI Form to collect "Triangle of Scope" (Hours/Week, Tech Stack, DoD)19.              | 1. Validates "Hours/Week" is a number.<br><br>  <br><br>2. Submitting updates `goal.scope` in DB20.       | 2.0h            |
| **3.2**        | Sizing Logic        | AI assesses complexity (S/M/L) based on Intent + Survey Data21.                      | 1. Returns `LARGE` if hours > 100.<br><br>  <br><br>2. Calculates `projected_end_date`22.                 | 1.5h            |
| **3.3**        | Streaming Architect | Streaming API (`streamObject`) that generates Phases and Milestones JSON23.          | 1. UI renders Phase 1 while Phase 2 generates.<br><br>  <br><br>2. Output validates against GoalSchema24. | 3.0h            |
| **3.4**        | Miller's Law Guard  | System Prompt Constraint: "No list may exceed 7 items"25.                            | 1. Lists >7 items are split or rejected.<br><br>  <br><br>2. Verified via massive goal test prompt26.     | 0.5h            |
| **3.5**        | Cluster Generator   | AI generates Jobs only for the Active Milestone, tagged as QUICK_WIN or DEEP_WORK27. | 1. Jobs are tagged correctly.<br><br>  <br><br>2. Jobs are inserted into the jobs table28.                | 2.0h            |

---

## Milestone 4: The Action Engine (Execution)

**Goal:** The Interface (Module D). "Compass, not Map"29.

|**Feature ID**|**Feature Name**|**Description**|**Acceptance Criteria**|**Est. Effort**|
|---|---|---|---|---|
|**4.1**|Energy Filter|Client-side Hook (`useActionEngine`). If user state is LOW, hide DEEP_WORK30.|1. Toggling "Low Energy" filters cards.<br><br>  <br><br>2. UI update is instant31.|2.0h|
|**4.2**|Crisis Override|Logic to bypass filters if deadline < 24h32.|1. Urgent tasks visible in "Low Energy" mode.<br><br>  <br><br>2. Task has "URGENT" badge33.|1.5h|
|**4.3**|Job Card Actions|Interactive UI: Mark Done (Fade out), Mark Failed (Increment counter)34.|1. "Done" updates DB to `COMPLETED`.<br><br>  <br><br>2. "Failed" updates `failure_count`35.|1.5h|

---

## Milestone 5: The Recalibrator (Self-Healing)

**Goal:** Repair broken plans (Module E)36.

|**Feature ID**|**Feature Name**|**Description**|**Acceptance Criteria**|**Est. Effort**|
|---|---|---|---|---|
|**5.1**|Stall Check (L3)|Supabase Edge Function (Cron) checking for 14-day inactivity37.|1. Stalled status updates to `QUARANTINE`.<br><br>  <br><br>2. Function runs automatically at 4 AM38.|2.0h|
|**5.2**|Task Exploder (L2)|Logic triggered when a task fails 3 times; triggers AI decomposition modal39.|1. `failure_count >= 3` triggers modal.<br><br>  <br><br>2. Task replaced by 3 smaller sub-tasks40.|3.0h|
|**5.3**|PWA Finalization|Final polish for mobile installation (icons, splash screens)41.|1. App installs on Android/iOS home screen.<br><br>  <br><br>2. Assets render correctly42.|1.0h|

---

### How to Trigger Milestone 1 in Cursor

Copy the exact prompt below to start coding43:

> "I am starting Milestone 1 of Volition OS. Initialize a Next.js 14 (App Router) project with TypeScript and Tailwind. Install the core dependencies: ai, zod, @supabase/supabase-js, lucide-react, and next-pwa. Create the file types/volition.ts and define the strict TypeScript interfaces for Goal, Scope, Complexity, Phase, Milestone, and Job as defined in our Spec. Generate a Supabase SQL Migration file that creates the matching tables (goals, milestones, jobs) with correct Foreign Keys and RLS policies." 44

**Would you like me to generate the TypeScript interfaces or the SQL migration script for Milestone 1 now?**