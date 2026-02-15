/**
 * Agent Performance Profiler
 * APM-style tool showing which subagents consume the most tokens,
 * execution time bottlenecks, and context window utilization
 */

import {
  AgentMetrics,
  PerformanceProfile,
  ProfilerOptions
} from './types';

export interface ProfilerEvent {
  type: 'start' | 'end' | 'error' | 'context';
  agentId: string;
  agentName: string;
  timestamp: Date;
  tokens?: number;
  contextSize?: number;
  contextLimit?: number;
  error?: string;
}

export class AgentPerformanceProfiler {
  private workflowId: string;
  private trackContextUtilization: boolean;
  private alertOnBottleneck: boolean;
  private agents: Map<string, AgentMetrics>;
  private events: ProfilerEvent[];
  private startTime: number;
  private bottlenecks: string[];
  private alertCallbacks: ((bottleneck: string) => void)[];

  constructor(options: ProfilerOptions) {
    this.workflowId = options.workflowId;
    this.trackContextUtilization = options.trackContextUtilization ?? true;
    this.alertOnBottleneck = options.alertOnBottleneck ?? false;
    this.agents = new Map();
    this.events = [];
    this.startTime = Date.now();
    this.bottlenecks = [];
    this.alertCallbacks = [];
  }

  /**
   * Start tracking an agent
   */
  trackAgent(agentId: string, agentName: string): void {
    if (!this.agents.has(agentId)) {
      this.agents.set(agentId, {
        agentId,
        agentName,
        tokensUsed: 0,
        executionTimeMs: 0,
        contextUtilization: 0,
        calls: 0,
        errors: 0
      });
    }
  }

  /**
   * Record agent start
   */
  recordStart(agentId: string, agentName: string): void {
    this.trackAgent(agentId, agentName);
    
    this.events.push({
      type: 'start',
      agentId,
      agentName,
      timestamp: new Date()
    });
  }

  /**
   * Record agent completion
   */
  recordEnd(agentId: string, tokensUsed: number): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    const now = Date.now();
    const startEvent = this.events
      .filter(e => e.type === 'start' && e.agentId === agentId)
      .pop();

    const executionTime = startEvent 
      ? now - startEvent.timestamp.getTime()
      : 0;

    agent.tokensUsed += tokensUsed;
    agent.executionTimeMs += executionTime;
    agent.calls += 1;

    this.events.push({
      type: 'end',
      agentId,
      agentName: agent.agentName,
      timestamp: new Date(),
      tokens: tokensUsed
    });

    // Check for bottlenecks
    this.checkBottleneck(agent);
  }

  /**
   * Record error
   */
  recordError(agentId: string, error: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.errors += 1;
    }

    this.events.push({
      type: 'error',
      agentId,
      agentName: agent?.agentName || 'unknown',
      timestamp: new Date(),
      error
    });
  }

  /**
   * Record context utilization
   */
  recordContext(agentId: string, contextSize: number, contextLimit: number): void {
    const agent = this.agents.get(agentId);
    if (!agent || !this.trackContextUtilization) return;

    agent.contextUtilization = contextSize / contextLimit;

    this.events.push({
      type: 'context',
      agentId,
      agentName: agent.agentName,
      timestamp: new Date(),
      contextSize,
      contextLimit
    });
  }

  /**
   * Check if an agent is a bottleneck
   */
  private checkBottleneck(agent: AgentMetrics): void {
    const avgTime = this.getAverageExecutionTime();
    const threshold = avgTime * 2; // 2x average is a bottleneck

    if (agent.executionTimeMs > threshold && agent.calls > 0) {
      const bottleneckMsg = `Agent "${agent.agentName}" exceeded average execution time (${agent.executionTimeMs}ms vs ${avgTime.toFixed(0)}ms avg)`;
      
      if (!this.bottlenecks.includes(bottleneckMsg)) {
        this.bottlenecks.push(bottleneckMsg);
        
        if (this.alertOnBottleneck) {
          this.alertCallbacks.forEach(cb => cb(bottleneckMsg));
        }
      }
    }
  }

  /**
   * Get average execution time across all agents
   */
  getAverageExecutionTime(): number {
    let totalTime = 0;
    let totalCalls = 0;

    this.agents.forEach(agent => {
      totalTime += agent.executionTimeMs;
      totalCalls += agent.calls;
    });

    return totalCalls > 0 ? totalTime / totalCalls : 0;
  }

  /**
   * Get total tokens used
   */
  getTotalTokens(): number {
    let total = 0;
    this.agents.forEach(agent => {
      total += agent.tokensUsed;
    });
    return total;
  }

  /**
   * Get total execution time
   */
  getTotalTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get agent metrics sorted by tokens (descending)
   */
  getTopConsumers(limit: number = 5): AgentMetrics[] {
    return Array.from(this.agents.values())
      .sort((a, b) => b.tokensUsed - a.tokensUsed)
      .slice(0, limit);
  }

  /**
   * Get agent metrics sorted by execution time (descending)
   */
  getTopSlowest(limit: number = 5): AgentMetrics[] {
    return Array.from(this.agents.values())
      .sort((a, b) => b.executionTimeMs - a.executionTimeMs)
      .slice(0, limit);
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentMetrics | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  getAllAgents(): AgentMetrics[] {
    return Array.from(this.agents.values());
  }

  /**
   * Calculate context window utilization
   */
  getContextWindowUtilization(): number {
    let totalUtilization = 0;
    let count = 0;

    this.agents.forEach(agent => {
      if (agent.contextUtilization > 0) {
        totalUtilization += agent.contextUtilization;
        count++;
      }
    });

    return count > 0 ? totalUtilization / count : 0;
  }

  /**
   * Get bottlenecks
   */
  getBottlenecks(): string[] {
    return [...this.bottlenecks];
  }

  /**
   * Register bottleneck alert callback
   */
  onBottleneck(callback: (bottleneck: string) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Generate performance profile
   */
  getProfile(): PerformanceProfile {
    return {
      workflowId: this.workflowId,
      totalTokens: this.getTotalTokens(),
      totalTimeMs: this.getTotalTime(),
      agents: this.getAllAgents(),
      bottlenecks: this.getBottlenecks(),
      contextWindowUtilization: this.getContextWindowUtilization(),
      timestamp: new Date()
    };
  }

  /**
   * Generate summary report
   */
  getSummary(): string {
    const profile = this.getProfile();
    const topConsumers = this.getTopConsumers(3);
    const topSlowest = this.getTopSlowest(3);

    let report = `📊 Performance Profile: ${this.workflowId}\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `Total Tokens: ${profile.totalTokens.toLocaleString()}\n`;
    report += `Total Time: ${profile.totalTimeMs}ms\n`;
    report += `Context Utilization: ${(profile.contextWindowUtilization * 100).toFixed(1)}%\n`;
    report += `\n🔝 Top Token Consumers:\n`;
    topConsumers.forEach((agent, i) => {
      report += `  ${i + 1}. ${agent.agentName}: ${agent.tokensUsed.toLocaleString()} tokens\n`;
    });

    report += `\n⏱️ Slowest Agents:\n`;
    topSlowest.forEach((agent, i) => {
      report += `  ${i + 1}. ${agent.agentName}: ${agent.executionTimeMs}ms\n`;
    });

    if (profile.bottlenecks.length > 0) {
      report += `\n⚠️ Bottlenecks:\n`;
      profile.bottlenecks.forEach(b => {
        report += `  • ${b}\n`;
      });
    }

    return report;
  }

  /**
   * Reset profiler
   */
  reset(): void {
    this.agents.clear();
    this.events = [];
    this.startTime = Date.now();
    this.bottlenecks = [];
  }

  /**
   * Get events
   */
  getEvents(): ProfilerEvent[] {
    return [...this.events];
  }

  /**
   * Get workflow ID
   */
  getWorkflowId(): string {
    return this.workflowId;
  }
}

export default AgentPerformanceProfiler;
