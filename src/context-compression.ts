/**
 * Context Compression Middleware
 * Automatically summarizes and prioritizes information to combat "context rot,"
 * maintaining critical instructions at the beginning while archiving less relevant history
 */

import {
  ContextItem,
  CompressionResult,
  ContextCompressionOptions
} from './types';

export class ContextCompressionMiddleware {
  private maxSize: number;
  private preserveInstructionsAtStart: boolean;
  private instructionsContent: string;
  private archiveThreshold: number;
  private items: ContextItem[];
  private archivedItems: ContextItem[];
  private idCounter: number;

  constructor(options: ContextCompressionOptions) {
    this.maxSize = options.maxSize;
    this.preserveInstructionsAtStart = options.preserveInstructionsAtStart ?? true;
    this.instructionsContent = options.instructionsContent || '';
    this.archiveThreshold = options.archiveThreshold ?? 0.3;
    this.items = [];
    this.archivedItems = [];
    this.idCounter = 0;
  }

  /**
   * Add a context item
   */
  addItem(content: string, priority: number = 0.5): ContextItem {
    const item: ContextItem = {
      id: `ctx_${++this.idCounter}`,
      content,
      priority,
      timestamp: new Date(),
      archived: false
    };

    this.items.push(item);
    this.compress();
    
    return item;
  }

  /**
   * Add multiple context items
   */
  addItems(items: Array<{ content: string; priority?: number }>): ContextItem[] {
    return items.map(item => this.addItem(item.content, item.priority));
  }

  /**
   * Update item priority
   */
  updatePriority(itemId: string, priority: number): boolean {
    const item = this.items.find(i => i.id === itemId);
    if (item) {
      item.priority = Math.max(0, Math.min(1, priority));
      return true;
    }
    return false;
  }

  /**
   * Get current context size (approximate token count)
   */
  getCurrentSize(): number {
    return this.items.reduce((total, item) => {
      return total + Math.ceil(item.content.length / 4);
    }, 0);
  }

  /**
   * Compress context to fit within max size
   */
  compress(): CompressionResult {
    const originalSize = this.getCurrentSize();
    
    if (originalSize <= this.maxSize) {
      return {
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        items: [...this.items],
        archivedItems: [...this.archivedItems]
      };
    }

    // Sort items by priority (descending)
    const sortedItems = [...this.items].sort((a, b) => b.priority - a.priority);

    // Separate instructions from regular items
    let instructions: ContextItem[] = [];
    let regularItems: ContextItem[] = [];

    if (this.preserveInstructionsAtStart && this.instructionsContent) {
      // Items with priority > 0.9 are considered critical instructions
      instructions = sortedItems.filter(item => item.priority > 0.9);
      regularItems = sortedItems.filter(item => item.priority <= 0.9);
    } else {
      regularItems = sortedItems;
    }

    // Calculate space for instructions
    const instructionsSize = instructions.reduce((total, item) => {
      return total + Math.ceil(item.content.length / 4);
    }, 0);

    // Available space for regular items
    const availableSize = this.maxSize - instructionsSize;
    
    // Select items that fit
    const keptItems: ContextItem[] = [];
    let currentSize = 0;

    for (const item of regularItems) {
      const itemSize = Math.ceil(item.content.length / 4);
      
      if (currentSize + itemSize <= availableSize) {
        keptItems.push(item);
        currentSize += itemSize;
      } else {
        // Archive the item
        item.archived = true;
        this.archivedItems.push(item);
      }
    }

    // Combine instructions and kept items
    const finalItems = [...instructions, ...keptItems];
    
    // Sort by timestamp (most recent first) but keep instructions at the start
    finalItems.sort((a, b) => {
      // Instructions always first
      if (a.priority > 0.9 && b.priority <= 0.9) return -1;
      if (b.priority > 0.9 && a.priority <= 0.9) return 1;
      // Then by timestamp
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    this.items = finalItems;
    const compressedSize = this.getCurrentSize();

    return {
      originalSize,
      compressedSize,
      compressionRatio: compressedSize / originalSize,
      items: [...this.items],
      archivedItems: [...this.archivedItems]
    };
  }

  /**
   * Summarize older archived items
   */
  summarizeArchived(maxItems: number = 5): string {
    const archived = this.archivedItems
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxItems);

    if (archived.length === 0) {
      return 'No archived items to summarize.';
    }

    let summary = '📦 Archived Context Summary:\n';
    archived.forEach((item, i) => {
      const preview = item.content.substring(0, 50) + (item.content.length > 50 ? '...' : '');
      summary += `${i + 1}. [${item.timestamp.toISOString()}] ${preview}\n`;
    });

    return summary;
  }

  /**
   * Get all active (non-archived) items
   */
  getItems(): ContextItem[] {
    return [...this.items];
  }

  /**
   * Get all archived items
   */
  getArchivedItems(): ContextItem[] {
    return [...this.archivedItems];
  }

  /**
   * Get formatted context for AI prompt
   */
  getFormattedContext(): string {
    let context = '';

    // Add instructions at the start if configured
    if (this.preserveInstructionsAtStart && this.instructionsContent) {
      context += `📋 INSTRUCTIONS:\n${this.instructionsContent}\n\n`;
    }

    // Add sorted items
    const sortedItems = [...this.items].sort((a, b) => {
      if (a.priority > 0.9 && b.priority <= 0.9) return -1;
      if (b.priority > 0.9 && a.priority <= 0.9) return 1;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    sortedItems.forEach((item, i) => {
      const priorityLabel = item.priority > 0.9 ? '⭐' : item.priority > 0.6 ? '📌' : '📝';
      context += `${priorityLabel} [${i + 1}] ${item.content}\n\n`;
    });

    // Add archived summary if available
    if (this.archivedItems.length > 0) {
      context += `\n--- Previous context archived (${this.archivedItems.length} items) ---\n`;
    }

    return context;
  }

  /**
   * Remove an item by ID
   */
  removeItem(itemId: string): boolean {
    const index = this.items.findIndex(i => i.id === itemId);
    if (index !== -1) {
      this.items.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all context
   */
  clear(): void {
    this.items = [];
    this.archivedItems = [];
  }

  /**
   * Clear archived items only
   */
  clearArchived(): void {
    this.archivedItems = [];
  }

  /**
   * Get statistics
   */
  getStats(): {
    currentSize: number;
    maxSize: number;
    itemCount: number;
    archivedCount: number;
    utilization: number;
  } {
    const currentSize = this.getCurrentSize();
    return {
      currentSize,
      maxSize: this.maxSize,
      itemCount: this.items.length,
      archivedCount: this.archivedItems.length,
      utilization: currentSize / this.maxSize
    };
  }

  /**
   * Set instructions content
   */
  setInstructions(content: string): void {
    this.instructionsContent = content;
  }

  /**
   * Get instructions content
   */
  getInstructions(): string {
    return this.instructionsContent;
  }

  /**
   * Update max size
   */
  setMaxSize(size: number): void {
    this.maxSize = size;
    this.compress();
  }

  /**
   * Restore an archived item
   */
  restoreItem(itemId: string): boolean {
    const index = this.archivedItems.findIndex(i => i.id === itemId);
    if (index !== -1) {
      const item = this.archivedItems.splice(index, 1)[0];
      item.archived = false;
      this.items.push(item);
      this.compress();
      return true;
    }
    return false;
  }

  /**
   * Archive items below threshold
   */
  archiveLowPriority(): number {
    const toArchive = this.items.filter(item => item.priority < this.archiveThreshold);
    
    toArchive.forEach(item => {
      item.archived = true;
      this.archivedItems.push(item);
    });

    this.items = this.items.filter(item => !item.archived);
    
    return toArchive.length;
  }
}

export default ContextCompressionMiddleware;
