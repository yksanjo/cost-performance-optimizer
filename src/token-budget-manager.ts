/**
 * Token Budget Manager
 * Pre-execution cost estimator with hard limits, alerting, and
 * automatic fallback to cheaper approaches when tasks exceed budgets
 */

import {
  ExecutionMode,
  AlertLevel,
  BudgetConfig,
  BudgetStatus,
  TokenBudgetOptions
} from './types';

export type BudgetAlertCallback = (alert: BudgetAlert) => void;

export interface BudgetAlert {
  level: AlertLevel;
  message: string;
  currentUsage: number;
  budget: number;
  percentage: number;
}

export class TokenBudgetManager {
  private config: BudgetConfig;
  private used: number = 0;
  private alerts: BudgetAlert[] = [];
  private alertCallbacks: BudgetAlertCallback[] = [];
  private enableAutoFallback: boolean;

  constructor(options: TokenBudgetOptions) {
    this.config = {
      maxTokens: options.defaultBudget,
      warningThreshold: options.warningThreshold || 0.7,
      criticalThreshold: options.criticalThreshold || 0.9,
      fallbackMode: ExecutionMode.CHAT
    };
    this.enableAutoFallback = options.enableAutoFallback ?? true;
  }

  /**
   * Get current budget status
   */
  getStatus(): BudgetStatus {
    const remaining = this.config.maxTokens - this.used;
    const percentage = this.used / this.config.maxTokens;

    let alertLevel: AlertLevel | null = null;
    if (percentage >= this.config.criticalThreshold) {
      alertLevel = AlertLevel.CRITICAL;
    } else if (percentage >= this.config.warningThreshold) {
      alertLevel = AlertLevel.WARNING;
    }

    return {
      used: this.used,
      remaining: Math.max(0, remaining),
      percentage: Math.min(1, percentage),
      alertLevel
    };
  }

  /**
   * Estimate cost before execution
   */
  estimateCost(tokens: number, mode: ExecutionMode): number {
    const multipliers: Record<ExecutionMode, number> = {
      [ExecutionMode.CHAT]: 1,
      [ExecutionMode.SINGLE_AGENT]: 4,
      [ExecutionMode.MULTI_AGENT]: 15
    };
    return tokens * multipliers[mode];
  }

  /**
   * Check if a task can be executed with given tokens and mode
   */
  canExecute(tokens: number, mode: ExecutionMode): {
    allowed: boolean;
    estimatedCost: number;
    fallback?: ExecutionMode;
    reason?: string;
  } {
    const estimatedCost = this.estimateCost(tokens, mode);
    const status = this.getStatus();
    const projectedUsage = status.used + estimatedCost;
    const projectedPercentage = projectedUsage / this.config.maxTokens;

    if (projectedPercentage <= 1) {
      return {
        allowed: true,
        estimatedCost
      };
    }

    // Try to find a cheaper mode
    if (this.enableAutoFallback) {
      const fallback = this.findFallbackMode(tokens);
      if (fallback) {
        const fallbackCost = this.estimateCost(tokens, fallback);
        const fallbackProjected = status.used + fallbackCost;
        
        if (fallbackProjected <= this.config.maxTokens) {
          return {
            allowed: false,
            estimatedCost,
            fallback,
            reason: `Budget exceeded. Try ${fallback} mode (${fallbackCost} tokens) instead of ${mode} mode (${estimatedCost} tokens)`
          };
        }
      }
    }

    return {
      allowed: false,
      estimatedCost,
      reason: `Estimated cost (${estimatedCost}) would exceed budget. Need ${estimatedCost - status.remaining} more tokens.`
    };
  }

  /**
   * Find a cheaper execution mode that fits the budget
   */
  private findFallbackMode(tokens: number): ExecutionMode | null {
    const status = this.getStatus();
    const remaining = status.remaining;

    // Try chat mode first (cheapest)
    const chatCost = this.estimateCost(tokens, ExecutionMode.CHAT);
    if (chatCost <= remaining) {
      return ExecutionMode.CHAT;
    }

    // Try single agent
    const singleCost = this.estimateCost(tokens, ExecutionMode.SINGLE_AGENT);
    if (singleCost <= remaining) {
      return ExecutionMode.SINGLE_AGENT;
    }

    return null;
  }

  /**
   * Reserve tokens for a planned execution
   */
  reserve(tokens: number, mode: ExecutionMode): string {
    const reservationId = `reserve_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const estimatedCost = this.estimateCost(tokens, mode);
    
    this.used += estimatedCost;
    this.checkAlerts();

    return reservationId;
  }

  /**
   * Release reserved tokens
   */
  release(reservationId: string, tokens: number, mode: ExecutionMode): void {
    const estimatedCost = this.estimateCost(tokens, mode);
    this.used = Math.max(0, this.used - estimatedCost);
    this.checkAlerts();
  }

  /**
   * Consume actual tokens after execution
   */
  consume(actualTokens: number, mode: ExecutionMode): void {
    const actualCost = this.estimateCost(actualTokens, mode);
    this.used += actualCost;
    this.checkAlerts();
  }

  /**
   * Check and trigger alerts
   */
  private checkAlerts(): void {
    const status = this.getStatus();

    if (status.alertLevel) {
      const alert: BudgetAlert = {
        level: status.alertLevel,
        message: this.getAlertMessage(status.alertLevel, status),
        currentUsage: status.used,
        budget: this.config.maxTokens,
        percentage: status.percentage
      };

      this.alerts.push(alert);

      // Trigger callbacks
      this.alertCallbacks.forEach(callback => callback(alert));
    }
  }

  /**
   * Get alert message based on level
   */
  private getAlertMessage(level: AlertLevel, status: BudgetStatus): string {
    const percentage = (status.percentage * 100).toFixed(1);
    
    switch (level) {
      case AlertLevel.WARNING:
        return `⚠️ Budget warning: ${percentage}% of tokens used (${status.used}/${this.config.maxTokens})`;
      case AlertLevel.CRITICAL:
        return `🚨 Budget critical: ${percentage}% of tokens used. Consider reducing scope.`;
      case AlertLevel.EXCEEDED:
        return `❌ Budget exceeded: ${percentage}% used. Operations may be blocked.`;
    }
  }

  /**
   * Register alert callback
   */
  onAlert(callback: BudgetAlertCallback): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Get all alerts
   */
  getAlerts(): BudgetAlert[] {
    return [...this.alerts];
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Reset budget to initial state
   */
  reset(): void {
    this.used = 0;
    this.alerts = [];
  }

  /**
   * Update budget configuration
   */
  updateConfig(config: Partial<BudgetConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): BudgetConfig {
    return { ...this.config };
  }

  /**
   * Get budget utilization percentage
   */
  getUtilization(): number {
    return this.getStatus().percentage;
  }

  /**
   * Check if auto-fallback is enabled
   */
  isAutoFallbackEnabled(): boolean {
    return this.enableAutoFallback;
  }

  /**
   * Enable/disable auto-fallback
   */
  setAutoFallback(enabled: boolean): void {
    this.enableAutoFallback = enabled;
  }
}

export default TokenBudgetManager;
