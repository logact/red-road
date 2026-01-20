#!/usr/bin/env node
/**
 * Pre-start build check
 * Verifies production build exists before starting Next.js production server
 */

const fs = require('fs');
const path = require('path');

const buildIdPath = path.join(__dirname, '..', '.next', 'BUILD_ID');

// #region agent log
fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: 'prestart-check.js:12',
    message: 'Checking for BUILD_ID',
    data: { buildIdPath, exists: fs.existsSync(buildIdPath) },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'post-fix',
    hypothesisId: 'A'
  })
}).catch(() => {});
// #endregion

if (!fs.existsSync(buildIdPath)) {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'prestart-check.js:25',
      message: 'BUILD_ID missing - build required',
      data: { buildIdPath },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'post-fix',
      hypothesisId: 'A'
    })
  }).catch(() => {});
  // #endregion
  
  console.error('\n❌ Production build not found!');
  console.error('   The .next directory exists but BUILD_ID is missing.');
  console.error('   This usually means you ran "npm run dev" but not "npm run build".\n');
  console.error('💡 For Development (recommended):');
  console.error('   Use: npm run dev');
  console.error('   (No build required, hot reload enabled)\n');
  console.error('💡 For Production:');
  console.error('   Run: npm run build');
  console.error('   Then: npm start\n');
  process.exit(1);
}

// #region agent log
fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: 'prestart-check.js:45',
    message: 'BUILD_ID found - production build ready',
    data: { buildId: fs.readFileSync(buildIdPath, 'utf8').trim() },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'post-fix',
    hypothesisId: 'A'
  })
}).catch(() => {});
// #endregion

// Build exists, allow start to proceed
process.exit(0);
