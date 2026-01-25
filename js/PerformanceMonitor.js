/**
 * Simple performance monitoring utility
 * Enable/disable with game.debug = true, then check browser console
 */
export default class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.frameCount = 0;
    this.lastReportTime = performance.now();
  }

  /**
   * Start timing a section of code
   * @param {string} label - Unique identifier for the metric
   */
  start(label) {
    if (!this.metrics[label]) {
      this.metrics[label] = { count: 0, total: 0, max: 0, min: Infinity };
    }
    this.metrics[label].startTime = performance.now();
  }

  /**
   * End timing and record the metric
   * @param {string} label - Unique identifier for the metric
   */
  end(label) {
    if (!this.metrics[label] || !this.metrics[label].startTime) return;
    
    const duration = performance.now() - this.metrics[label].startTime;
    this.metrics[label].count++;
    this.metrics[label].total += duration;
    this.metrics[label].max = Math.max(this.metrics[label].max, duration);
    this.metrics[label].min = Math.min(this.metrics[label].min, duration);
    delete this.metrics[label].startTime;
  }

  /**
   * Report metrics and reset
   */
  report() {
    const now = performance.now();
    const elapsed = now - this.lastReportTime;
    
    if (elapsed < 5000) return; // Report every 5 seconds
    
    console.group('📊 Performance Report');
    Object.entries(this.metrics).forEach(([label, data]) => {
      const avg = (data.total / data.count).toFixed(2);
      console.log(`${label}: avg=${avg}ms, max=${data.max.toFixed(2)}ms, count=${data.count}`);
    });
    console.groupEnd();
    
    this.reset();
    this.lastReportTime = now;
  }

  /**
   * Reset all metrics
   */
  reset() {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = { count: 0, total: 0, max: 0, min: Infinity };
    });
  }
}
