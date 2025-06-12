/**
 * Advanced Memory Leak Detection for React Native
 * Specifically designed to identify memory leaks in chat applications
 */

interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  heapLimit: number;
  messagesCount: number;
  toolResultsCount: number;
  streamingTextLength: number;
  isStreaming: boolean;
  conversationId: string | null;
}

interface LeakPattern {
  type: 'gradual_increase' | 'sudden_spike' | 'unbounded_growth' | 'memory_not_released';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
}

class MemoryLeakDetector {
  private static instance: MemoryLeakDetector;
  private snapshots: MemorySnapshot[] = [];
  private maxSnapshots = 50; // Keep last 50 snapshots
  private isEnabled = __DEV__;
  private alertThreshold = 200; // MB
  private criticalThreshold = 500; // MB

  static getInstance(): MemoryLeakDetector {
    if (!MemoryLeakDetector.instance) {
      MemoryLeakDetector.instance = new MemoryLeakDetector();
    }
    return MemoryLeakDetector.instance;
  }

  /**
   * Take a memory snapshot with context
   */
  takeSnapshot(context: {
    messagesCount: number;
    toolResultsCount: number;
    streamingTextLength: number;
    isStreaming: boolean;
    conversationId: string | null;
  }): MemorySnapshot | null {
    if (!this.isEnabled || typeof performance === 'undefined' || !(performance as any).memory) {
      console.log('📊 MEMORY SNAPSHOT: Skipped - memory monitoring not available');
      return null;
    }

    const memory = (performance as any).memory;
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: memory.usedJSHeapSize / (1024 * 1024), // MB
      heapTotal: memory.totalJSHeapSize / (1024 * 1024), // MB
      heapLimit: memory.jsHeapSizeLimit / (1024 * 1024), // MB
      ...context
    };

    this.snapshots.push(snapshot);

    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    // Log every snapshot taken
    const time = new Date(snapshot.timestamp).toLocaleTimeString();
    console.log(`📊 MEMORY SNAPSHOT [${time}]: ${snapshot.heapUsed.toFixed(1)}MB used / ${snapshot.heapTotal.toFixed(1)}MB total`);
    console.log(`   📋 Context: ${snapshot.messagesCount} messages, ${snapshot.toolResultsCount} tools, ${snapshot.streamingTextLength} chars streaming`);
    console.log(`   🔄 Streaming: ${snapshot.isStreaming ? 'Active' : 'Inactive'}, Conversation: ${snapshot.conversationId || 'None'}`);
    console.log(`   📈 Utilization: ${((snapshot.heapUsed / snapshot.heapLimit) * 100).toFixed(1)}% of heap limit`);

    // Check for immediate issues
    this.checkForImmediateLeaks(snapshot);

    return snapshot;
  }

  /**
   * Check for immediate memory issues
   */
  private checkForImmediateLeaks(snapshot: MemorySnapshot) {
    if (snapshot.heapUsed > this.criticalThreshold) {
      console.error(`🚨 CRITICAL MEMORY LEAK: ${snapshot.heapUsed.toFixed(1)}MB heap usage!`);
      console.error(`🚨 Context: Messages: ${snapshot.messagesCount}, Tools: ${snapshot.toolResultsCount}, Streaming: ${snapshot.streamingTextLength} chars`);
      this.logDetailedState();
    } else if (snapshot.heapUsed > this.alertThreshold) {
      console.warn(`⚠️ HIGH MEMORY USAGE: ${snapshot.heapUsed.toFixed(1)}MB heap usage`);
      console.warn(`⚠️ Context: Messages: ${snapshot.messagesCount}, Tools: ${snapshot.toolResultsCount}, Streaming: ${snapshot.streamingTextLength} chars`);
    }
  }

  /**
   * Analyze memory patterns for leaks
   */
  analyzeLeakPatterns(): LeakPattern[] {
    if (this.snapshots.length < 5) {
      return [];
    }

    const patterns: LeakPattern[] = [];
    const recent = this.snapshots.slice(-10); // Last 10 snapshots

    // Check for gradual increase
    const memoryTrend = this.calculateMemoryTrend(recent);
    if (memoryTrend > 5) { // More than 5MB increase per snapshot
      patterns.push({
        type: 'gradual_increase',
        severity: memoryTrend > 20 ? 'critical' : memoryTrend > 10 ? 'high' : 'medium',
        description: `Memory increasing by ${memoryTrend.toFixed(1)}MB per measurement`,
        recommendation: 'Check for unbounded arrays, event listeners, or refs not being cleaned up'
      });
    }

    // Check for sudden spikes
    const spikes = this.detectMemorySpikes(recent);
    if (spikes.length > 0) {
      patterns.push({
        type: 'sudden_spike',
        severity: 'high',
        description: `${spikes.length} sudden memory spikes detected`,
        recommendation: 'Check for large object allocations during streaming or tool execution'
      });
    }

    // Check for unbounded growth
    const growthRate = this.calculateGrowthRate();
    if (growthRate > 0.1) { // 10% growth rate
      patterns.push({
        type: 'unbounded_growth',
        severity: 'critical',
        description: `Exponential memory growth detected (${(growthRate * 100).toFixed(1)}% per measurement)`,
        recommendation: 'Immediate investigation required - likely infinite loop or unbounded accumulation'
      });
    }

    return patterns;
  }

  /**
   * Calculate memory trend (MB per snapshot)
   */
  private calculateMemoryTrend(snapshots: MemorySnapshot[]): number {
    if (snapshots.length < 2) return 0;

    const first = snapshots[0].heapUsed;
    const last = snapshots[snapshots.length - 1].heapUsed;
    return (last - first) / (snapshots.length - 1);
  }

  /**
   * Detect sudden memory spikes
   */
  private detectMemorySpikes(snapshots: MemorySnapshot[]): MemorySnapshot[] {
    const spikes: MemorySnapshot[] = [];
    
    for (let i = 1; i < snapshots.length; i++) {
      const increase = snapshots[i].heapUsed - snapshots[i - 1].heapUsed;
      if (increase > 50) { // 50MB sudden increase
        spikes.push(snapshots[i]);
      }
    }

    return spikes;
  }

  /**
   * Calculate exponential growth rate
   */
  private calculateGrowthRate(): number {
    if (this.snapshots.length < 3) return 0;

    const recent = this.snapshots.slice(-5);
    let totalGrowthRate = 0;
    let validMeasurements = 0;

    for (let i = 1; i < recent.length; i++) {
      const prev = recent[i - 1].heapUsed;
      const curr = recent[i].heapUsed;
      
      if (prev > 0 && curr > prev) {
        totalGrowthRate += (curr - prev) / prev;
        validMeasurements++;
      }
    }

    return validMeasurements > 0 ? totalGrowthRate / validMeasurements : 0;
  }

  /**
   * Log detailed memory state for debugging
   */
  logDetailedState() {
    if (this.snapshots.length === 0) return;

    const latest = this.snapshots[this.snapshots.length - 1];
    const patterns = this.analyzeLeakPatterns();

    console.log('🔍 MEMORY LEAK ANALYSIS:');
    console.log(`📊 Current State: ${latest.heapUsed.toFixed(1)}MB used / ${latest.heapTotal.toFixed(1)}MB total`);
    console.log(`📊 Data Structures: ${latest.messagesCount} messages, ${latest.toolResultsCount} tool results`);
    console.log(`📊 Streaming: ${latest.isStreaming ? 'Active' : 'Inactive'}, ${latest.streamingTextLength} chars`);

    if (patterns.length > 0) {
      console.log('🚨 LEAK PATTERNS DETECTED:');
      patterns.forEach((pattern, i) => {
        console.log(`  ${i + 1}. [${pattern.severity.toUpperCase()}] ${pattern.type}: ${pattern.description}`);
        console.log(`     💡 ${pattern.recommendation}`);
      });
    }

    // Log memory history
    if (this.snapshots.length >= 5) {
      console.log('📈 MEMORY HISTORY (last 5 measurements):');
      this.snapshots.slice(-5).forEach((snapshot, i) => {
        const time = new Date(snapshot.timestamp).toLocaleTimeString();
        console.log(`  ${time}: ${snapshot.heapUsed.toFixed(1)}MB (${snapshot.messagesCount} msgs, ${snapshot.toolResultsCount} tools)`);
      });
    }
  }

  /**
   * Force garbage collection and measure impact
   */
  forceGCAndMeasure(): { before: number; after: number; freed: number } | null {
    if (!this.isEnabled || typeof performance === 'undefined' || !(performance as any).memory) {
      return null;
    }

    const beforeMemory = (performance as any).memory;
    const before = beforeMemory.usedJSHeapSize / (1024 * 1024);

    if (global.gc) {
      global.gc();
    }

    // Wait a bit for GC to complete
    setTimeout(() => {
      const afterMemory = (performance as any).memory;
      const after = afterMemory.usedJSHeapSize / (1024 * 1024);
      const freed = before - after;

      console.log(`🗑️ GC IMPACT: ${before.toFixed(1)}MB → ${after.toFixed(1)}MB (freed ${freed.toFixed(1)}MB)`);

      if (freed < 10 && before > 200) {
        console.warn(`⚠️ GC INEFFECTIVE: Only freed ${freed.toFixed(1)}MB from ${before.toFixed(1)}MB - possible memory leak`);
      }

      return { before, after, freed };
    }, 100);

    return null;
  }

  /**
   * Get memory usage summary
   */
  getSummary() {
    if (this.snapshots.length === 0) return null;

    const latest = this.snapshots[this.snapshots.length - 1];
    const patterns = this.analyzeLeakPatterns();
    const trend = this.snapshots.length >= 5 ? this.calculateMemoryTrend(this.snapshots.slice(-5)) : 0;

    return {
      currentUsage: latest.heapUsed,
      totalHeap: latest.heapTotal,
      heapLimit: latest.heapLimit,
      utilizationPercent: (latest.heapUsed / latest.heapLimit) * 100,
      trend: trend,
      leakPatterns: patterns,
      dataStructures: {
        messages: latest.messagesCount,
        toolResults: latest.toolResultsCount,
        streamingText: latest.streamingTextLength
      },
      isStreaming: latest.isStreaming,
      snapshotCount: this.snapshots.length
    };
  }

  /**
   * Clear all snapshots
   */
  clear() {
    this.snapshots = [];
  }

  /**
   * Enable/disable detector
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }
}

// Export singleton instance
export const memoryLeakDetector = MemoryLeakDetector.getInstance();

// React hook for easy integration
export function useMemoryLeakDetection(context: {
  messagesCount: number;
  toolResultsCount: number;
  streamingTextLength: number;
  isStreaming: boolean;
  conversationId: string | null;
}) {
  const takeSnapshot = () => memoryLeakDetector.takeSnapshot(context);
  const analyzeLeaks = () => memoryLeakDetector.analyzeLeakPatterns();
  const logState = () => memoryLeakDetector.logDetailedState();
  const forceGC = () => memoryLeakDetector.forceGCAndMeasure();

  return {
    takeSnapshot,
    analyzeLeaks,
    logState,
    forceGC,
    getSummary: () => memoryLeakDetector.getSummary()
  };
}
