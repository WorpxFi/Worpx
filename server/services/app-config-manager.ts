interface ConfigEntry {
  key: string;
  value: string | number | boolean;
  category: 'core' | 'agents' | 'payments' | 'connectors' | 'security';
  description: string;
  updatedAt: number;
  updatedBy: string;
  previousValue: string | number | boolean | null;
}

export class AppConfigManager {
  private config: Map<string, ConfigEntry> = new Map();
  private changeLog: { key: string; oldValue: unknown; newValue: unknown; changedBy: string; timestamp: number }[] = [];

  set(key: string, value: string | number | boolean, category: ConfigEntry['category'], description: string, updatedBy: string = 'system'): void {
    const existing = this.config.get(key);
    const previousValue = existing?.value ?? null;
    this.config.set(key, { key, value, category, description, updatedAt: Date.now(), updatedBy, previousValue });
    if (existing) this.changeLog.push({ key, oldValue: previousValue, newValue: value, changedBy: updatedBy, timestamp: Date.now() });
  }

  get<T extends string | number | boolean>(key: string, fallback: T): T {
    const entry = this.config.get(key);
    return entry ? entry.value as T : fallback;
  }

  getByCategory(category: ConfigEntry['category']): ConfigEntry[] {
    return Array.from(this.config.values()).filter(c => c.category === category);
  }

  getAll(): ConfigEntry[] { return Array.from(this.config.values()); }

  getChangeLog(limit: number = 50): typeof this.changeLog {
    return this.changeLog.slice(-limit);
  }

  has(key: string): boolean { return this.config.has(key); }

  delete(key: string): boolean { return this.config.delete(key); }

  loadDefaults(): void {
    this.set('max_agents', 10000, 'core', 'Maximum registered agents', 'system');
    this.set('settlement_batch_size', 50, 'payments', 'Transactions per settlement batch', 'system');
    this.set('heartbeat_interval_ms', 30000, 'agents', 'Agent heartbeat check interval', 'system');
    this.set('api_rate_limit', 1000, 'security', 'Default API calls per minute', 'system');
    this.set('connector_timeout_ms', 15000, 'connectors', 'Platform connector request timeout', 'system');
  }
}