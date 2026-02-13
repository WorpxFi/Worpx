interface SyncJob {
  id: string;
  platformId: string;
  resourceType: string;
  direction: 'inbound' | 'outbound' | 'bidirectional';
  intervalMs: number;
  lastRun: number | null;
  nextRun: number;
  status: 'scheduled' | 'running' | 'completed' | 'failed';
  recordsSynced: number;
}

export class SyncScheduler {
  private jobs: Map<string, SyncJob> = new Map();

  schedule(platformId: string, resourceType: string, direction: SyncJob['direction'], intervalMs: number): string {
    const id = crypto.randomUUID();
    this.jobs.set(id, { id, platformId, resourceType, direction, intervalMs, lastRun: null, nextRun: Date.now() + intervalMs, status: 'scheduled', recordsSynced: 0 });
    return id;
  }

  getDue(): SyncJob[] {
    const now = Date.now();
    return Array.from(this.jobs.values()).filter(j => j.status === 'scheduled' && now >= j.nextRun);
  }

  markRunning(jobId: string): boolean {
    const j = this.jobs.get(jobId);
    if (!j || j.status !== 'scheduled') return false;
    j.status = 'running'; return true;
  }

  complete(jobId: string, recordsSynced: number): boolean {
    const j = this.jobs.get(jobId);
    if (!j || j.status !== 'running') return false;
    j.status = 'scheduled'; j.lastRun = Date.now(); j.nextRun = Date.now() + j.intervalMs; j.recordsSynced += recordsSynced;
    return true;
  }

  fail(jobId: string): boolean {
    const j = this.jobs.get(jobId);
    if (!j) return false;
    j.status = 'failed'; return true;
  }

  getByPlatform(platformId: string): SyncJob[] { return Array.from(this.jobs.values()).filter(j => j.platformId === platformId); }
}