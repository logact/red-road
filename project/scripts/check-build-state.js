#!/usr/bin/env node
/**
 * Build State Checker
 * Checks if production build exists and is valid
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const nextDir = path.join(projectRoot, '.next');
const buildIdPath = path.join(nextDir, 'BUILD_ID');

// #region agent log
fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: 'check-build-state.js:12',
    message: 'Starting build state check',
    data: { projectRoot, nextDir, buildIdPath },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'A'
  })
}).catch(() => {});
// #endregion

const results = {
  nextDirExists: false,
  buildIdExists: false,
  buildIdContent: null,
  serverDirExists: false,
  staticDirExists: false,
  hasProductionArtifacts: false
};

// Check if .next directory exists
try {
  const stats = fs.statSync(nextDir);
  results.nextDirExists = stats.isDirectory();
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'check-build-state.js:35',
      message: '.next directory check',
      data: { exists: results.nextDirExists, isDirectory: stats.isDirectory() },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'A'
    })
  }).catch(() => {});
  // #endregion
} catch (error) {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'check-build-state.js:48',
      message: '.next directory check failed',
      data: { error: error.message },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'A'
    })
  }).catch(() => {});
  // #endregion
}

// Check if BUILD_ID exists
try {
  if (fs.existsSync(buildIdPath)) {
    results.buildIdExists = true;
    results.buildIdContent = fs.readFileSync(buildIdPath, 'utf8').trim();
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'check-build-state.js:65',
        message: 'BUILD_ID found',
        data: { buildId: results.buildIdContent },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B'
      })
    }).catch(() => {});
    // #endregion
  } else {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'check-build-state.js:78',
        message: 'BUILD_ID missing',
        data: { buildIdPath },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B'
      })
    }).catch(() => {});
    // #endregion
  }
} catch (error) {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'check-build-state.js:90',
      message: 'BUILD_ID check error',
      data: { error: error.message },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'B'
    })
  }).catch(() => {});
  // #endregion
}

// Check for production artifacts
if (results.nextDirExists) {
  const serverDir = path.join(nextDir, 'server');
  const staticDir = path.join(nextDir, 'static');
  
  results.serverDirExists = fs.existsSync(serverDir);
  results.staticDirExists = fs.existsSync(staticDir);
  results.hasProductionArtifacts = results.buildIdExists && results.serverDirExists && results.staticDirExists;
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'check-build-state.js:113',
      message: 'Production artifacts check',
      data: {
        serverDirExists: results.serverDirExists,
        staticDirExists: results.staticDirExists,
        hasProductionArtifacts: results.hasProductionArtifacts
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'C'
    })
  }).catch(() => {});
  // #endregion
}

// Final summary
// #region agent log
fetch('http://127.0.0.1:7243/ingest/4772b394-fafc-421c-9530-33246feeefbc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: 'check-build-state.js:130',
    message: 'Build state summary',
    data: results,
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'ALL'
  })
}).catch(() => {});
// #endregion

console.log('\n📊 Build State Analysis:');
console.log('='.repeat(50));
console.log(`✅ .next directory exists: ${results.nextDirExists}`);
console.log(`${results.buildIdExists ? '✅' : '❌'} BUILD_ID exists: ${results.buildIdExists}`);
if (results.buildIdContent) {
  console.log(`   BUILD_ID: ${results.buildIdContent}`);
}
console.log(`${results.serverDirExists ? '✅' : '❌'} server/ directory exists: ${results.serverDirExists}`);
console.log(`${results.staticDirExists ? '✅' : '❌'} static/ directory exists: ${results.staticDirExists}`);
console.log(`\n${results.hasProductionArtifacts ? '✅' : '❌'} Production build complete: ${results.hasProductionArtifacts}`);

if (!results.hasProductionArtifacts) {
  console.log('\n💡 Solution:');
  console.log('   Run: npm run build');
  console.log('   Then: npm start');
} else {
  console.log('\n✅ Production build is ready!');
  console.log('   You can run: npm start');
}

process.exit(results.hasProductionArtifacts ? 0 : 1);
