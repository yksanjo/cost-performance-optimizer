/**
 * Agent Cost Optimizer
 * Intelligent router that analyzes task complexity and automatically selects
 * between chat (1×), single-agent (4×), or multi-agent (15×) execution
 */

import {
  ExecutionMode,
  COST_MULTIPLIERS,
  ComplexityLevel,
  TaskAnalysis,
  CostOptimizerOptions
} from './types';

export class AgentCostOptimizer {
  private valueThresholds: CostOptimizerOptions['valueThresholds'];
  private multipliers: Record<ExecutionMode, number>;

  constructor(options: CostOptimizerOptions = {}) {
    this.valueThresholds = options.valueThresholds || {
      chat: 10,
      singleAgent: 50,
      multiAgent: 200
    };

    this.multipliers = {
      ...COST_MULTIPLIERS,
      ...options.customMultipliers
    };
  }

  /**
   * Analyze a task and determine its complexity
   */
  analyzeTask(task: string | { description: string; context?: string }): TaskAnalysis {
    const taskDescription = typeof task === 'string' ? task : task.description;
    const context = typeof task === 'string' ? '' : (task.context || '');

    const combinedText = `${taskDescription} ${context}`;
    const wordCount = combinedText.split(/\s+/).length;
    const charCount = combinedText.length;

    // Complexity indicators
    const hasMultipleParts = /,\s*and|\.\s+[A-Z]/.test(taskDescription);
    const hasConditional = /\b(if|when|unless|whether|or|and)\b/i.test(taskDescription);
    const hasIteration = /\b(each|every|loop|iterate|repeat)\b/i.test(taskDescription);
    const hasComplexReasoning = /\b(analyze|compare|evaluate|reason|explain why)\b/i.test(taskDescription);
    const hasCodeRelated = /\b(code|function|class|implement|debug|refactor)\b/i.test(taskDescription);
    const hasMultiStep = /\b(first|then|next|finally|step|process)\b/i.test(taskDescription);

    // Calculate complexity score (0-100)
    let complexityScore = 0;

    // Base complexity from length
    complexityScore += Math.min(wordCount / 2, 20);

    // Add complexity factors
    if (hasMultipleParts) complexityScore += 15;
    if (hasConditional) complexityScore += 15;
    if (hasIteration) complexityScore += 20;
    if (hasComplexReasoning) complexityScore += 20;
    if (hasCodeRelated) complexityScore += 15;
    if (hasMultiStep) complexityScore += 10;

    // Estimate tokens (rough approximation: 1 token ≈ 4 characters or 0.75 words)
    const estimatedTokens = Math.ceil(charCount / 4);

    // Determine complexity level
    let complexity: ComplexityLevel;
    if (complexityScore < 20) {
      complexity = ComplexityLevel.SIMPLE;
    } else if (complexityScore < 45) {
      complexity = ComplexityLevel.MEDIUM;
    } else if (complexityScore < 70) {
      complexity = ComplexityLevel.HIGH;
    } else {
      complexity = ComplexityLevel.VERY_HIGH;
    }

    // Determine recommended execution mode based on thresholds
    const recommendedMode = this.determineMode(estimatedTokens, complexityScore);

    // Calculate confidence based on how clear the indicators are
    const confidence = Math.min(0.95, 0.5 + (complexityScore / 100) * 0.45);

    // Generate reasoning
    const reasoning = this.generateReasoning({
      complexity,
      complexityScore,
      estimatedTokens,
      hasMultipleParts,
      hasConditional,
      hasIteration,
      hasCodeRelated,
      recommendedMode
    });

    return {
      complexity,
      estimatedTokens,
      recommendedMode,
      confidence,
      reasoning
    };
  }

  /**
   * Determine execution mode based on token count and complexity score
   */
  private determineMode(estimatedTokens: number, complexityScore: number): ExecutionMode {
    const thresholds = this.valueThresholds || { chat: 10, singleAgent: 50, multiAgent: 200 };
    // Use thresholds to determine mode
    if (estimatedTokens <= thresholds.chat && complexityScore <= 20) {
      return ExecutionMode.CHAT;
    } else if (estimatedTokens <= thresholds.singleAgent && complexityScore <= 50) {
      return ExecutionMode.SINGLE_AGENT;
    } else {
      return ExecutionMode.MULTI_AGENT;
    }
  }

  /**
   * Generate human-readable reasoning for the analysis
   */
  private generateReasoning(params: {
    complexity: ComplexityLevel;
    complexityScore: number;
    estimatedTokens: number;
    hasMultipleParts: boolean;
    hasConditional: boolean;
    hasIteration: boolean;
    hasCodeRelated: boolean;
    recommendedMode: ExecutionMode;
  }): string {
    const reasons: string[] = [];

    reasons.push(`Task complexity score: ${params.complexityScore.toFixed(1)}/100`);
    reasons.push(`Estimated tokens: ~${params.estimatedTokens}`);

    if (params.hasMultipleParts) reasons.push('Multiple subtasks detected');
    if (params.hasConditional) reasons.push('Conditional logic detected');
    if (params.hasIteration) reasons.push('Iteration/repetition detected');
    if (params.hasCodeRelated) reasons.push('Code-related task identified');

    reasons.push(`Recommended: ${this.getModeLabel(params.recommendedMode)} (${this.multipliers[params.recommendedMode]}× cost)`);

    return reasons.join('. ');
  }

  /**
   * Get human-readable mode label
   */
  getModeLabel(mode: ExecutionMode): string {
    switch (mode) {
      case ExecutionMode.CHAT:
        return 'Chat (1×)';
      case ExecutionMode.SINGLE_AGENT:
        return 'Single Agent (4×)';
      case ExecutionMode.MULTI_AGENT:
        return 'Multi-Agent (15×)';
    }
  }

  /**
   * Calculate estimated cost for a given mode and token count
   */
  calculateCost(mode: ExecutionMode, tokens: number): number {
    return tokens * this.multipliers[mode];
  }

  /**
   * Compare costs across all execution modes
   */
  compareCosts(tokens: number): Record<ExecutionMode, number> {
    return {
      [ExecutionMode.CHAT]: this.calculateCost(ExecutionMode.CHAT, tokens),
      [ExecutionMode.SINGLE_AGENT]: this.calculateCost(ExecutionMode.SINGLE_AGENT, tokens),
      [ExecutionMode.MULTI_AGENT]: this.calculateCost(ExecutionMode.MULTI_AGENT, tokens)
    };
  }

  /**
   * Get cost multiplier for a mode
   */
  getMultiplier(mode: ExecutionMode): number {
    return this.multipliers[mode];
  }

  /**
   * Update value thresholds
   */
  setThresholds(thresholds: CostOptimizerOptions['valueThresholds']): void {
    this.valueThresholds = thresholds || this.valueThresholds;
  }
}

export default AgentCostOptimizer;
