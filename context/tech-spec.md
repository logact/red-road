# Tech Stack & Implementation Rules: Volition OS (MVP)

## 1. Core Stack (The "Unified" TypeScript Path)
* **Framework:** Next.js 14+ (App Router).
* **Language:** TypeScript (Strict Mode).
* **Styling:** Tailwind CSS + Shadcn/UI (for rapid, accessible components).
* **State Management:** React Context (for local state) + TanStack Query (for server state).
* **PWA:** `next-pwa` or strictly configured `manifest.json`.

## 2. Backend & Data (Supabase)
* **Database:** PostgreSQL (via Supabase).
* **Auth:** Supabase Auth (Email/Magic Link).
* **ORM:** Drizzle ORM (Best-in-class TypeScript inference) OR Supabase JS Client (simpler for MVP). *Decision: Use Supabase JS Client for speed.*
* **Server Logic:** Supabase Edge Functions (Deno).
    * *Usage:* This is CRITICAL for "The Recalibrator." Since iOS PWAs cannot run background tasks, we will use **Supabase Scheduled Functions (Cron)** to run the "Recalibrator" logic every night at 4 AM server time.

## 3. AI & Logic Layer (The "Brain")
* **Orchestration:** Vercel AI SDK (`ai` package).
    * *Why:* It handles the "Streaming UI" for the Adaptive Architect beautifully.
* **Validation:** Zod.
    * *Rule:* EVERY output from the LLM must be validated against a Zod schema before hitting the database. No exceptions.
* **Model Provider:** OpenAI (gpt-4o) or Anthropic (claude-3-5-sonnet).

## 4. Folder Structure (template) under `project` director
/app
  /api
    /architect          # AI Streaming Route (Long-running generation)
      /route.ts
  /auth                 # Supabase Auth Pages
    /login
    /callback
  /dashboard            # The Main "Volition" Interface
    /page.tsx           # Server Component (Fetches initial Goal)
    /layout.tsx         # Dashboard Shell (Sidebar, UserContext)
  /globals.css          # Tailwind Directives
  /layout.tsx           # Root Layout (Providers)
  /manifest.json        # PWA Configuration

/components
  /ui                   # Shadcn/UI primitives (Button, Card, Input)
  /volition             # Domain-Specific Components
    /architect          # "Planning Mode" Components
      /ArchitectStream.tsx
      /ComplexityGauge.tsx
    /engine             # "Execution Mode" Components
      /ActionFeed.tsx   # The main list of jobs
      /EnergyFilter.tsx # The "Low/High" toggle
      /JobCard.tsx
    /gatekeeper         # "New Goal" Components
      /IntentInput.tsx

/lib
  /actions              # Server Actions (Mutations & DB Writes)
    /gatekeeper.ts      # "Validate Intent" Logic
    /goals.ts           # CRUD for Goals
    /jobs.ts            # Mark job complete
  /ai                   # AI Configuration
    /prompts.ts         # System Prompts for Architect/Classifier
    /schemas.ts         # Zod Schemas (THE MOST IMPORTANT FILE)
  /hooks                # Client-Side Logic
    /useActionEngine.ts # The "Filter" Logic (No API calls)
    /useVolition.ts     # Global User State
  /supabase             # Database Clients
    /client.ts          # Browser Client
    /server.ts          # Server Client (Cookies)
  /utils.ts             # CN helper for Tailwind

/supabase
  /functions            # Edge Functions (Deno)
    /recalibrate        # Cron Job: Fixes stalled tasks at 4 AM
      /index.ts
  /migrations           # SQL Files

## 5. Cursor Rules (Strict Instructions for the AI)
1.  **Miller's Law Compliance:** When generating lists in the UI, verify no list exceeds 7 items. If it does, suggest breaking it into a sub-cluster.
2.  **Type Safety:** Never use `any`. Always define interfaces in `types/volition.ts` first.
3.  **Mobile First:** All UI components must be touch-friendly (min-height 44px for buttons).
4.  **Offline Awareness:** Use `navigator.onLine` checks before submitting complex Architect requests.
5. When refer to items related to the version,please check if it's compitiable with current context.