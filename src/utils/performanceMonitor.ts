/**
 * Performance monitoring utilities for React Native
 * Helps track memory usage, render performance, and identify bottlenecks
 */

interface PerformanceMetrics {
  memoryUsage?: number;
  renderTime?: number;
  timestamp: number;
  component?: string;
  action?: string;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 100; // Keep last 100 metrics
  private isEnabled = __DEV__; // Only enable in development by default

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Enable or disable performance monitoring
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: Omit<PerformanceMetrics, 'timestamp'>) {
    if (!this.isEnabled) return;

    const fullMetric: PerformanceMetrics = {
      ...metric,
      timestamp: Date.now(),
    };

    this.metrics.push(fullMetric);

    // Keep only the last N metrics to prevent memory buildup
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log significant issues
    if (metric.memoryUsage && metric.memoryUsage > 200) {
      console.warn(`⚠️ PERF: High memory usage: ${metric.memoryUsage.toFixed(1)}MB in ${metric.component || 'unknown'}`);
    }

    if (metric.renderTime && metric.renderTime > 16) {
      console.warn(`⚠️ PERF: Slow render: ${metric.renderTime.toFixed(1)}ms in ${metric.component || 'unknown'}`);
    }
  }

  /**
   * Get current memory usage if available
   */
  getCurrentMemoryUsage(): number | null {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
    }
    return null;
  }

  /**
   * Record memory usage for a component or action
   */
  recordMemoryUsage(component?: string, action?: string) {
    const memoryUsage = this.getCurrentMemoryUsage();
    if (memoryUsage !== null) {
      this.recordMetric({ memoryUsage, component, action });
    }
  }

  /**
   * Time a function execution and record the metric
   */
  timeExecution<T>(fn: () => T, component?: string, action?: string): T {
    if (!this.isEnabled) return fn();

    const startTime = performance.now();
    const result = fn();
    const renderTime = performance.now() - startTime;

    this.recordMetric({ renderTime, component, action });
    return result;
  }

  /**
   * Time an async function execution and record the metric
   */
  async timeAsyncExecution<T>(fn: () => Promise<T>, component?: string, action?: string): Promise<T> {
    if (!this.isEnabled) return fn();

    const startTime = performance.now();
    const result = await fn();
    const renderTime = performance.now() - startTime;

    this.recordMetric({ renderTime, component, action });
    return result;
  }

  /**
   * Get performance summary
   */
  getSummary() {
    if (!this.isEnabled || this.metrics.length === 0) {
      return null;
    }

    const memoryMetrics = this.metrics.filter(m => m.memoryUsage !== undefined);
    const renderMetrics = this.metrics.filter(m => m.renderTime !== undefined);

    const avgMemory = memoryMetrics.length > 0 
      ? memoryMetrics.reduce((sum, m) => sum + (m.memoryUsage || 0), 0) / memoryMetrics.length 
      : 0;

    const maxMemory = memoryMetrics.length > 0 
      ? Math.max(...memoryMetrics.map(m => m.memoryUsage || 0)) 
      : 0;

    const avgRenderTime = renderMetrics.length > 0 
      ? renderMetrics.reduce((sum, m) => sum + (m.renderTime || 0), 0) / renderMetrics.length 
      : 0;

    const maxRenderTime = renderMetrics.length > 0 
      ? Math.max(...renderMetrics.map(m => m.renderTime || 0)) 
      : 0;

    return {
      totalMetrics: this.metrics.length,
      memory: {
        average: avgMemory,
        max: maxMemory,
        samples: memoryMetrics.length,
      },
      renderTime: {
        average: avgRenderTime,
        max: maxRenderTime,
        samples: renderMetrics.length,
      },
    };
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection() {
    if (global.gc) {
      global.gc();
      if (__DEV__) {
        console.log('🗑️ PERF: Forced garbage collection');
      }
    }
  }

  /**
   * Log performance summary to console
   */
  logSummary() {
    const summary = this.getSummary();
    if (summary) {
      console.log('📊 PERFORMANCE SUMMARY:', summary);
    }
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// React hook for component performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const recordRender = () => {
    performanceMonitor.recordMemoryUsage(componentName, 'render');
  };

  const timeAction = <T>(fn: () => T, actionName: string): T => {
    return performanceMonitor.timeExecution(fn, componentName, actionName);
  };

  const timeAsyncAction = <T>(fn: () => Promise<T>, actionName: string): Promise<T> => {
    return performanceMonitor.timeAsyncExecution(fn, componentName, actionName);
  };

  return {
    recordRender,
    timeAction,
    timeAsyncAction,
    recordMemoryUsage: () => performanceMonitor.recordMemoryUsage(componentName),
  };
}

export default performanceMonitor;
