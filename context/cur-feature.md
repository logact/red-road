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
