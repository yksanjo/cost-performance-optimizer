/**
 * Cost & Performance Optimization Tools - Core Types
 */

// Execution modes with cost multipliers
export enum ExecutionMode {
  CHAT = 'chat',
  SINGLE_AGENT = 'single',
  MULTI_AGENT = 'multi'
}

// Cost multipliers for each execution mode
export const COST_MULTIPLIERS: Record<ExecutionMode, number> = {
  [ExecutionMode.CHAT]: 1,
  [ExecutionMode.SINGLE_AGENT]: 4,
  [ExecutionMode.MULTI_AGENT]: 15
};

// Budget alert levels
export enum AlertLevel {
  WARNING = 'warning',   // 70% of budget
  CRITICAL = 'critical', // 90% of budget
  EXCEEDED = 'exceeded'  // 100% of budget
}

// Task complexity levels
export enum ComplexityLevel {
  SIMPLE = 'simple',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

// Task analysis result
export interface TaskAnalysis {
  complexity: ComplexityLevel;
  estimatedTokens: number;
  recommendedMode: ExecutionMode;
  confidence: number; // 0-1
  reasoning: string;
}

// Budget configuration
export interface BudgetConfig {
  maxTokens: number;
  warningThreshold: number; // 0-1 (percentage)
  criticalThreshold: number; // 0-1 (percentage)
  fallbackMode: ExecutionMode;
}

// Budget status
export interface BudgetStatus {
  used: number;
  remaining: number;
  percentage: number;
  alertLevel: AlertLevel | null;
}

// Agent performance metrics
export interface AgentMetrics {
  agentId: string;
  agentName: string;
  tokensUsed: number;
  executionTimeMs: number;
  contextUtilization: number; // 0-1
  calls: number;
  errors: number;
}

// Workflow performance profile
export interface PerformanceProfile {
  workflowId: string;
  totalTokens: number;
  totalTimeMs: number;
  agents: AgentMetrics[];
  bottlenecks: string[];
  contextWindowUtilization: number; // 0-1
  timestamp: Date;
}

// Context item priority
export interface ContextItem {
  id: string;
  content: string;
  priority: number; // 0-1 (higher = more important)
  timestamp: Date;
  archived?: boolean;
}

// Context compression result
export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  items: ContextItem[];
  archivedItems: ContextItem[];
}

// Cost optimizer options
export interface CostOptimizerOptions {
  valueThresholds?: {
    chat: number;
    singleAgent: number;
    multiAgent: number;
  };
  customMultipliers?: Partial<Record<ExecutionMode, number>>;
}

// Token budget manager options
export interface TokenBudgetOptions {
  defaultBudget: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  enableAutoFallback?: boolean;
}

// Profiler options
export interface ProfilerOptions {
  workflowId: string;
  trackContextUtilization?: boolean;
  alertOnBottleneck?: boolean;
}

// Context compression options
export interface ContextCompressionOptions {
  maxSize: number;
  preserveInstructionsAtStart?: boolean;
  instructionsContent?: string;
  archiveThreshold?: number; // priority below this gets archived
}
