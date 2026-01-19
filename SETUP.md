# Setup Guide: Volition OS

Follow these steps before building and starting the project.

## Prerequisites

- **Node.js 18+** (required for Next.js 14)
- **npm** or **yarn** package manager
- **Supabase account** and project

## Step 1: Install Dependencies

Navigate to the project directory and install all dependencies:

```bash
cd project
npm install
```

## Step 2: Set Up Environment Variables

Create a `.env.local` file in the `project/` directory:

```bash
cd project
touch .env.local
```

Add the following environment variables to `.env.local`:

```env
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Configuration (Optional - only needed for AI features)
# OPENAI_API_KEY=your_openai_api_key
# Or
# ANTHROPIC_API_KEY=your_anthropic_api_key
```

### How to Get Supabase Credentials:

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project (or create a new one)
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 3: Set Up Supabase Database

1. In your Supabase Dashboard, go to **SQL Editor**
2. Open the migration file: `project/supabase/migrations/001_initial_schema.sql`
3. Copy the entire SQL content
4. Paste it into the SQL Editor and click **Run**

This will create:
- All required tables (`goals`, `phases`, `milestones`, `job_clusters`, `jobs`)
- Row Level Security (RLS) policies
- Indexes for performance
- Triggers for automatic timestamp updates

## Step 4: Verify Setup

Check that your environment variables are set:

```bash
cd project
cat .env.local
```

Make sure both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present.

## Step 5: Build and Start

You're now ready to build and start the project:

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

The app will be available at `http://localhost:3000`

## Troubleshooting

### Missing Environment Variables
If you see errors about `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`:
- Verify `.env.local` exists in the `project/` directory
- Restart your development server after creating/modifying `.env.local`

### Database Connection Issues
- Verify your Supabase project is active
- Check that the migration was run successfully in Supabase Dashboard
- Ensure RLS policies are enabled (they should be created by the migration)

### TypeScript Errors
- Run `npm install` to ensure all type definitions are installed
- Check that you're using Node.js 18+

## Next Steps

After setup:
1. Test authentication by visiting `/auth/login`
2. Verify the dashboard loads at `/dashboard` (requires authentication)
3. Check PWA installation in Chrome DevTools (Application → Manifest)
