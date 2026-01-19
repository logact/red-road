Based on our discussion and the correction regarding "The Surveyor" (moving it to Module C/Milestone 3), here is the **Finalized Feature Roadmap** for Volition OS.

This is the "Source of Truth" you should use to drive Cursor.

### **Milestone 1: The Iron Skeleton (Foundation)**

**Goal:** A running Next.js PWA connected to Supabase with Auth.

| Feature ID | Feature Name | Description | Acceptance Criteria | Est. Effort |
| --- | --- | --- | --- | --- |
| **1.1** | **Project Scaffold** | Initialize Next.js 14+ (App Router), TypeScript, Tailwind, `ai` SDK, and `manifest.json` for PWA support. | 1. App loads at `localhost:3000`.<br>

<br>2. PWA is installable on mobile (Chrome DevTools check). | **1.0h** |
| **1.2** | **Supabase Schema** | Create SQL migrations for `goals`, `phases`, `milestones`, and `jobs`. *Must match the JSON Model in PRD Section 3.* | 1. Tables exist in Supabase Dashboard.<br>

<br>2. RLS policies set (users only see their own data). | **1.0h** |
| **1.3** | **Type Sync** | Define TypeScript interfaces in `types/volition.ts` (`Complexity`, `Scope`, `Job`, `Goal`). | 1. Types match the Supabase DB columns exactly.<br>

<br>2. No `any` types in core data models. | **0.5h** |
| **1.4** | **Auth UI** | Implement Login page with Supabase Auth (Magic Link) and a Protected Route wrapper for `/dashboard`. | 1. Unauthenticated access to `/dashboard` redirects to `/login`.<br>

<br>2. Successful login persists user session. | **1.5h** |

---

### **Milestone 2: The Gatekeeper (Intent Validation)**

**Goal:** Filter "Noise" from "Intent" (Module A & B). *Does not involve detailed scoping.*

| Feature ID | Feature Name | Description | Acceptance Criteria | Est. Effort |
| --- | --- | --- | --- | --- |
| **2.1** | **The Classifier** | Server Action using GPT-4o-mini to route input. <br>

<br>*Logic:* "Sadness"  Incubator; "Ambition"  Gatekeeper. | 1. Input "I'm tired" returns `{ route: 'INCUBATOR' }`.<br>

<br>2. Input "Build a bot" returns `{ route: 'GATEKEEPER' }`. | **1.5h** |
| **2.2** | **Wishful Thinking Check** | Server Action (Module B) that negotiates the goal. <br>

<br>*Logic:* If goal is vague/huge without MVP proof, return a "Challenge." | 1. "Build Google" triggers Rejection + "Define MVP" challenge.<br>

<br>2. Valid Intent creates DB row with `status: PENDING_SCOPE`. | **2.0h** |
| **2.3** | **Intent UI** | The input interface. Displays the AI's "Challenge" in a red alert box if rejected. | 1. User cannot proceed until they modify a rejected goal.<br>

<br>2. "Approved" goal unlocks the "Next" button (to Milestone 3). | **1.5h** |

---

### **Milestone 3: The Adaptive Architect (Scoping & Planning)**

**Goal:** Establish Scope (Module C, Phase 1)  Size (Phase 2)  Plan (Phase 3).

| Feature ID | Feature Name | Description | Acceptance Criteria | Est. Effort |
| --- | --- | --- | --- | --- |
| **3.1** | **The Surveyor Form** | **(Module C, Phase 1)** UI Form to collect "Triangle of Scope".<br>

<br>*Inputs:* Hours/Week, Tech Stack, Definition of Done. | 1. Form validates that "Hours/Week" is a number.<br>

<br>2. Submitting updates the `goal.scope` JSON column in DB. | **2.0h** |
| **3.2** | **Sizing Logic** | **(Module C, Phase 2)** AI assesses complexity (S/M/L) based on Intent + Survey Data. | 1. Returns `size: LARGE` if hours > 100.<br>

<br>2. Calculates `projected_end_date` based on user's weekly hours. | **1.5h** |
| **3.3** | **Streaming Architect** | **(Module C, Phase 3)** Streaming API (`streamObject`) that generates the `Phases` and `Milestones` JSON. | 1. UI renders "Phase 1" instantly while "Phase 2" is still generating.<br>

<br>2. Output validates strictly against `GoalSchema`. | **3.0h** |
| **3.4** | **Miller's Law Guard** | System Prompt Constraint. <br>

<br>*Rule:* "No list may exceed 7 items." | 1. Generated lists >7 items are automatically split or rejected.<br>

<br>2. Verified via test prompt with a massive goal. | **0.5h** |
| **3.5** | **Cluster Generator** | **(Module C, Phase 3)** AI generates `Jobs` *only* for the Active Milestone. | 1. Jobs are tagged `QUICK_WIN` or `DEEP_WORK`.<br>

<br>2. Jobs are inserted into `jobs` table linked to the Milestone. | **2.0h** |

---

### **Milestone 4: The Action Engine (Execution)**

**Goal:** The Interface (Module D). "Compass, not Map."

| Feature ID | Feature Name | Description | Acceptance Criteria | Est. Effort |
| --- | --- | --- | --- | --- |
| **4.1** | **Energy Filter** | **(Module D)** Client-side Hook (`useActionEngine`). <br>

<br>*Logic:* If `user_state == LOW`, hide `DEEP_WORK` tasks. | 1. Toggling "Low Energy" hides Blue cards, shows Green cards.<br>

<br>2. UI update is instant (no server loading). | **2.0h** |
| **4.2** | **Crisis Override** | **(Module D)** Logic to bypass filters. <br>

<br>*Logic:* If `deadline < 24h`, show task regardless of energy. | 1. Task due tomorrow is visible even in "Low Energy" mode.<br>

<br>2. Task has visual "URGENT" badge. | **1.5h** |
| **4.3** | **Job Card Actions** | Interactive UI Elements. <br>

<br>*Actions:* Mark Done (Fade out), Mark Failed (Increment counter). | 1. "Done" updates DB status to `COMPLETED`.<br>

<br>2. "Failed" updates DB `failure_count`. | **1.5h** |

---

### **Milestone 5: The Recalibrator (Self-Healing)**

**Goal:** Repair broken plans (Module E).

| Feature ID | Feature Name | Description | Acceptance Criteria | Est. Effort |
| --- | --- | --- | --- | --- |
| **5.1** | **Stall Check (L3)** | **(Module E)** Supabase Edge Function (Cron). Checks for 14-day inactivity. | 1. Stalled Milestone status updates to `QUARANTINE`.<br>

<br>2. Function runs automatically at 4 AM. | **2.0h** |
| **5.2** | **Task Exploder (L2)** | **(Module E)** Logic triggered when a task fails 3 times. | 1. `failure_count >= 3` triggers AI decomposition modal.<br>

<br>2. Task is replaced by 3 smaller sub-tasks. | **3.0h** |
| **5.3** | **PWA Finalization** | Final polish for mobile installation. | 1. App installs on Android/iOS home screen.<br>

<br>2. Icons and Splash screens render correctly. | **1.0h** |

---

### **How to Trigger Milestone 1 in Cursor**

Since we are done thinking, copy this exact prompt to start coding:

> "I am starting **Milestone 1** of Volition OS.
> 1. Initialize a **Next.js 14 (App Router)** project with **TypeScript** and **Tailwind**.
> 2. Install the core dependencies: `ai`, `zod`, `@supabase/supabase-js`, `lucide-react`, and `next-pwa`.
> 3. Create the file `types/volition.ts` and define the strict TypeScript interfaces for `Goal`, `Scope`, `Complexity`, `Phase`, `Milestone`, and `Job` as defined in our Spec.
> 4. Generate a **Supabase SQL Migration file** that creates the matching tables (`goals`, `milestones`, `jobs`) with correct Foreign Keys and RLS policies."
> 
>