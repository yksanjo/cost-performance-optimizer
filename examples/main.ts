/**
 * Example: Using all Cost & Performance Optimization Tools together
 */

import {
  AgentCostOptimizer,
  TokenBudgetManager,
  AgentPerformanceProfiler,
  ContextCompressionMiddleware,
  ExecutionMode,
  ComplexityLevel
} from '../src';

// ============================================
// 1. Agent Cost Optimizer Example
// ============================================
console.log('='.repeat(60));
console.log('1. AGENT COST OPTIMIZER');
console.log('='.repeat(60));

const costOptimizer = new AgentCostOptimizer();

// Analyze different task complexities
const simpleTask = "What is the weather today?";
const mediumTask = "Write a function to calculate fibonacci numbers and explain how it works";
const complexTask = "Build a multi-agent system that can: 1) analyze user requirements, 2) design a database schema, 3) generate API endpoints, 4) write unit tests, and 5) deploy to production with CI/CD pipeline";

const simpleAnalysis = costOptimizer.analyzeTask(simpleTask);
const mediumAnalysis = costOptimizer.analyzeTask(mediumTask);
const complexAnalysis = costOptimizer.analyzeTask(complexTask);

console.log('\n📝 Simple Task Analysis:');
console.log(`   Complexity: ${simpleAnalysis.complexity}`);
console.log(`   Estimated Tokens: ${simpleAnalysis.estimatedTokens}`);
console.log(`   Recommended Mode: ${costOptimizer.getModeLabel(simpleAnalysis.recommendedMode)}`);
console.log(`   Reasoning: ${simpleAnalysis.reasoning}`);

console.log('\n📝 Medium Task Analysis:');
console.log(`   Complexity: ${mediumAnalysis.complexity}`);
console.log(`   Estimated Tokens: ${mediumAnalysis.estimatedTokens}`);
console.log(`   Recommended Mode: ${costOptimizer.getModeLabel(mediumAnalysis.recommendedMode)}`);
console.log(`   Reasoning: ${mediumAnalysis.reasoning}`);

console.log('\n📝 Complex Task Analysis:');
console.log(`   Complexity: ${complexAnalysis.complexity}`);
console.log(`   Estimated Tokens: ${complexAnalysis.estimatedTokens}`);
console.log(`   Recommended Mode: ${costOptimizer.getModeLabel(complexAnalysis.recommendedMode)}`);
console.log(`   Reasoning: ${complexAnalysis.reasoning}`);

// Compare costs
console.log('\n💰 Cost Comparison (1000 tokens):');
const costs = costOptimizer.compareCosts(1000);
console.log(`   Chat: ${costs[ExecutionMode.CHAT]} tokens`);
console.log(`   Single Agent: ${costs[ExecutionMode.SINGLE_AGENT]} tokens`);
console.log(`   Multi-Agent: ${costs[ExecutionMode.MULTI_AGENT]} tokens`);

// ============================================
// 2. Token Budget Manager Example
// ============================================
console.log('\n' + '='.repeat(60));
console.log('2. TOKEN BUDGET MANAGER');
console.log('='.repeat(60));

const budgetManager = new TokenBudgetManager({
  defaultBudget: 10000,
  warningThreshold: 0.7,
  criticalThreshold: 0.9,
  enableAutoFallback: true
});

// Register alert callback
budgetManager.onAlert((alert) => {
  console.log(`\n🔔 ALERT: ${alert.message}`);
});

// Pre-execution check
console.log('\n✅ Checking if task can execute...');
const checkResult = budgetManager.canExecute(5000, ExecutionMode.MULTI_AGENT);
console.log(`   Requested: 5000 tokens in Multi-Agent mode`);
console.log(`   Allowed: ${checkResult.allowed}`);
console.log(`   Estimated Cost: ${checkResult.estimatedCost}`);
if (checkResult.fallback) {
  console.log(`   Fallback Suggestion: ${checkResult.fallback} mode`);
}
console.log(`   Reason: ${checkResult.reason || 'N/A'}`);

// Reserve tokens
const reservation = budgetManager.reserve(1000, ExecutionMode.SINGLE_AGENT);
console.log(`\n💳 Reserved 1000 tokens (Single Agent)`);
console.log(`   Reservation ID: ${reservation}`);
console.log(`   Budget Status:`, budgetManager.getStatus());

// Consume actual tokens
budgetManager.consume(800, ExecutionMode.SINGLE_AGENT);
console.log(`\n💳 Consumed 800 tokens (actual)`);
console.log(`   Budget Status:`, budgetManager.getStatus());

// ============================================
// 3. Agent Performance Profiler Example
// ============================================
console.log('\n' + '='.repeat(60));
console.log('3. AGENT PERFORMANCE PROFILER');
console.log('='.repeat(60));

const profiler = new AgentPerformanceProfiler({
  workflowId: 'example-workflow-001',
  trackContextUtilization: true,
  alertOnBottleneck: true
});

// Register bottleneck callback
profiler.onBottleneck((bottleneck) => {
  console.log(`\n⚠️ BOTTLENECK DETECTED: ${bottleneck}`);
});

// Simulate agent executions
console.log('\n🤖 Simulating agent executions...');

// Agent 1: Research Agent
profiler.recordStart('agent-1', 'Research Agent');
setTimeout(() => {
  profiler.recordEnd('agent-1', 1500);
  profiler.recordContext('agent-1', 8000, 10000);
}, 100);

// Agent 2: Analysis Agent  
profiler.recordStart('agent-2', 'Analysis Agent');
setTimeout(() => {
  profiler.recordEnd('agent-2', 2000);
  profiler.recordContext('agent-2', 6000, 10000);
}, 200);

// Agent 3: Code Generator (will be a bottleneck)
profiler.recordStart('agent-3', 'Code Generator');
setTimeout(() => {
  profiler.recordEnd('agent-3', 5000);
  profiler.recordError('agent-3', 'Timeout error');
  profiler.recordContext('agent-3', 9000, 10000);
}, 600);

// Wait for all agents to complete
setTimeout(() => {
  console.log('\n📊 Performance Profile:');
  console.log(profiler.getSummary());
  
  console.log('\n🔝 Top Consumers:', profiler.getTopConsumers());
  console.log('⏱️ Slowest Agents:', profiler.getTopSlowest());
  console.log('⚠️ Bottlenecks:', profiler.getBottlenecks());
}, 700);

// ============================================
// 4. Context Compression Middleware Example
// ============================================
console.log('\n' + '='.repeat(60));
console.log('4. CONTEXT COMPRESSION MIDDLEWARE');
console.log('='.repeat(60));

const contextManager = new ContextCompressionMiddleware({
  maxSize: 500, // 500 tokens max
  preserveInstructionsAtStart: true,
  instructionsContent: 'You are a helpful AI assistant. Always provide accurate and concise responses.',
  archiveThreshold: 0.3
});

// Add context items with different priorities
console.log('\n📝 Adding context items...');

contextManager.addItem('User asked about weather in Tokyo', 0.3);
contextManager.addItem('User prefers concise responses', 0.8);
contextManager.addItem('Previous conversation about Python programming', 0.4);
contextManager.addItem('User is a developer working on web apps', 0.7);
contextManager.addItem('Session started at 10:00 AM', 0.2);
contextManager.addItem('User mentioned they like TypeScript', 0.6);

console.log('   Added 6 context items');

const stats = contextManager.getStats();
console.log('\n📊 Context Stats:');
console.log(`   Current Size: ${stats.currentSize} tokens`);
console.log(`   Max Size: ${stats.maxSize} tokens`);
console.log(`   Item Count: ${stats.itemCount}`);
console.log(`   Archived Count: ${stats.archivedCount}`);
console.log(`   Utilization: ${(stats.utilization * 100).toFixed(1)}%`);

// Add more items to trigger compression
console.log('\n📝 Adding more items to trigger compression...');
for (let i = 0; i < 10; i++) {
  contextManager.addItem(`Additional context item number ${i + 1} with some content`, 0.3 + (i * 0.05));
}

const compressedStats = contextManager.getStats();
console.log('\n📊 After Compression:');
console.log(`   Current Size: ${compressedStats.currentSize} tokens`);
console.log(`   Item Count: ${compressedStats.itemCount}`);
console.log(`   Archived Count: ${compressedStats.archivedCount}`);

// Get formatted context
console.log('\n📄 Formatted Context:');
console.log(contextManager.getFormattedContext());

// ============================================
// Summary
// ============================================
console.log('\n' + '='.repeat(60));
console.log('✅ ALL TOOLS DEMONSTRATED SUCCESSFULLY!');
console.log('='.repeat(60));

console.log(`
🛠️ Tools Available:
   1. AgentCostOptimizer - Intelligent routing based on task complexity
   2. TokenBudgetManager - Budget limits, alerts, and auto-fallback
   3. AgentPerformanceProfiler - APM-style monitoring and bottleneck detection
   4. ContextCompressionMiddleware - Context management and archival

📦 Import from: './src/index.ts'
`);
