interface MetricPoint {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

interface AggregatedMetric {
  name: string;
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

interface MetricWindow {
  points: MetricPoint[];
  windowMs: number;
}

export class MetricsCollector {
  private windows: Map<string, MetricWindow> = new Map();
  private counters: Map<string, number> = new Map();
  private defaultWindowMs: number;

  constructor(defaultWindowMs: number = 300000) {
    this.defaultWindowMs = defaultWindowMs;
  }

  record(name: string, value: number, labels: Record<string, string> = {}): void {
    const point: MetricPoint = { name, value, labels, timestamp: Date.now() };
    const window = this.windows.get(name);
    if (window) {
      window.points.push(point);
    } else {
      this.windows.set(name, { points: [point], windowMs: this.defaultWindowMs });
    }
    this.prune(name);
  }

  increment(name: string, amount: number = 1): number {
    const current = (this.counters.get(name) ?? 0) + amount;
    this.counters.set(name, current);
    return current;
  }

  getCounter(name: string): number {
    return this.counters.get(name) ?? 0;
  }

  private prune(name: string): void {
    const window = this.windows.get(name);
    if (!window) return;
    const cutoff = Date.now() - window.windowMs;
    window.points = window.points.filter(p => p.timestamp > cutoff);
  }

  aggregate(name: string): AggregatedMetric | null {
    this.prune(name);
    const window = this.windows.get(name);
    if (!window || window.points.length === 0) return null;

    const values = window.points.map(p => p.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      name, count, sum,
      avg: parseFloat((sum / count).toFixed(4)),
      min: values[0],
      max: values[count - 1],
      p50: values[Math.floor(count * 0.5)],
      p95: values[Math.floor(count * 0.95)],
      p99: values[Math.floor(count * 0.99)],
    };
  }

  aggregateByLabel(name: string, labelKey: string): Map<string, AggregatedMetric> {
    this.prune(name);
    const window = this.windows.get(name);
    if (!window) return new Map();

    const groups = new Map<string, number[]>();
    for (const point of window.points) {
      const labelValue = point.labels[labelKey] ?? 'unknown';
      if (!groups.has(labelValue)) groups.set(labelValue, []);
      groups.get(labelValue)!.push(point.value);
    }

    const result = new Map<string, AggregatedMetric>();
    for (const [label, values] of groups) {
      values.sort((a, b) => a - b);
      const count = values.length;
      const sum = values.reduce((a, b) => a + b, 0);
      result.set(label, {
        name: `${name}[${labelKey}=${label}]`, count, sum,
        avg: parseFloat((sum / count).toFixed(4)),
        min: values[0], max: values[count - 1],
        p50: values[Math.floor(count * 0.5)],
        p95: values[Math.floor(count * 0.95)],
        p99: values[Math.floor(count * 0.99)],
      });
    }
    return result;
  }

  getAllMetricNames(): string[] {
    return Array.from(this.windows.keys());
  }

  reset(name: string): void {
    this.windows.delete(name);
    this.counters.delete(name);
  }
}