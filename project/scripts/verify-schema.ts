#!/usr/bin/env node
/**
 * Schema Verification Script
 * 
 * Verifies that all required tables exist in Supabase.
 * 
 * Usage:
 *   cd project
 *   npx tsx scripts/verify-schema.ts
 * 
 * Requires environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const REQUIRED_TABLES = [
  'goals',
  'phases',
  'milestones',
  'job_clusters',
  'jobs',
] as const;

interface VerificationResult {
  table: string;
  exists: boolean;
  accessible: boolean;
}

async function verifySchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables:');
    if (!supabaseUrl) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseKey) console.error('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.error('\nPlease ensure .env.local exists in the project directory.');
    process.exit(1);
  }

  console.log('🔍 Verifying Supabase schema...\n');
  console.log(`📡 Connecting to: ${supabaseUrl.replace(/\/$/, '')}\n`);

  const supabase = createClient(supabaseUrl, supabaseKey);
  const results: VerificationResult[] = [];

  // Check each table
  for (const table of REQUIRED_TABLES) {
    console.log(`Checking table: ${table}...`);

    try {
      // Check if table exists by attempting a simple query
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(0);

      // 42P01 = relation does not exist (PostgreSQL error code)
      // PGRST301 = relation not found (PostgREST error)
      const tableNotFound = error?.code === '42P01' || error?.code === 'PGRST301';
      const exists = !tableNotFound;

      if (!exists) {
        console.log(`  ❌ Table "${table}" does not exist`);
        results.push({
          table,
          exists: false,
          accessible: false,
        });
        continue;
      }

      // If table exists, check if it's accessible (RLS might block if not authenticated)
      // 42501 = insufficient privilege (PostgreSQL)
      // PGRST301 = relation not found (but we know it exists, so this might be RLS)
      const accessible = !error || (error.code !== '42501' && error.code !== 'PGRST301');

      if (accessible) {
        console.log(`  ✅ Table "${table}" exists and is accessible`);
      } else {
        console.log(`  ✅ Table "${table}" exists`);
        console.log(`  ⚠️  Table may be protected by RLS (this is expected if not authenticated)`);
      }

      results.push({
        table,
        exists: true,
        accessible,
      });
    } catch (error: any) {
      console.log(`  ❌ Error checking table "${table}": ${error.message}`);
      results.push({
        table,
        exists: false,
        accessible: false,
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Verification Summary');
  console.log('='.repeat(60));

  const allTablesExist = results.every((r) => r.exists);

  if (allTablesExist) {
    console.log('\n✅ All required tables exist!');
    console.log('\n💡 Next steps:');
    console.log('   1. Verify RLS policies in Supabase Dashboard:');
    console.log('      Authentication → Policies');
    console.log('   2. Expected policies per table:');
    console.log('      - SELECT, INSERT, UPDATE, DELETE policies');
    console.log('      - All policies should check user ownership via auth.uid()');
  } else {
    console.log('\n⚠️  Some tables are missing!');
    console.log('\n📝 To apply the migration:');
    console.log('   1. Open Supabase Dashboard → SQL Editor');
    console.log('   2. Copy contents of: project/supabase/migrations/001_initial_schema.sql');
    console.log('   3. Paste and run in SQL Editor');
    console.log('   4. Re-run this script to verify\n');
  }

  console.log('\n📋 Table Status:');
  results.forEach((result) => {
    const status = result.exists ? '✅' : '❌';
    console.log(`   ${status} ${result.table}`);
  });

  console.log('\n📚 Required Tables:');
  REQUIRED_TABLES.forEach((table) => {
    console.log(`   - ${table}`);
  });

  console.log('\n🔒 RLS Policies Required:');
  console.log('   Each table needs 4 policies: SELECT, INSERT, UPDATE, DELETE');
  console.log('   All policies must verify user ownership through the goal hierarchy.\n');

  process.exit(allTablesExist ? 0 : 1);
}

verifySchema().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
