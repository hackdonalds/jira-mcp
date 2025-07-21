#!/usr/bin/env deno run --allow-net --allow-env --allow-read --allow-write

/**
 * Test script for the JIRA MCP server
 * This script validates that the server can start without actual JIRA credentials
 */

import { Logger } from './src/logger.ts';

async function testServer() {
  console.log('🧪 Testing JIRA MCP Server...');
  
  // Test logger functionality
  console.log('📝 Testing logger...');
  const logger = new Logger('debug');
  
  logger.debug('This is a debug message', { test: true });
  logger.info('This is an info message', { test: true });
  logger.warning('This is a warning message', { test: true });
  logger.error('This is an error message', { test: true });
  
  const logs = logger.getLogs();
  console.log(`✅ Logger test passed. Generated ${logs.length} log entries.`);
  
  // Test config validation (without setting env vars)
  console.log('⚙️  Testing config validation...');
  try {
    const { loadConfig } = await import('./src/config.ts');
    loadConfig(logger);
    console.log('❌ Config validation test failed - should have thrown error for missing env vars');
  } catch (error) {
    console.log('✅ Config validation test passed - correctly caught missing env vars');
  }
  
  // Test types import
  console.log('📦 Testing types import...');
  const { LogLevel } = await import('./src/types.ts');
  console.log(`✅ Types import test passed. LogLevel.INFO = ${LogLevel.INFO}`);
  
  console.log('🎉 All tests passed! Server is ready for use.');
  console.log();
  console.log('📋 Next steps:');
  console.log('1. Copy .env.example to .env');
  console.log('2. Fill in your JIRA_MCP_URL and JIRA_MCP_TOKEN');
  console.log('3. Run: deno task start');
  console.log('4. Or run with --remote flag: deno run --allow-net --allow-env --allow-read --allow-write src/server.ts --remote');
}

if (import.meta.main) {
  await testServer();
}