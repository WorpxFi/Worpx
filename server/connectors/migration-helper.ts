interface MigrationPlan {
  id: string;
  agentId: string;
  sourcePlatform: string;
  targetPlatform: string;
  resources: MigrationResource[];
  status: 'planned' | 'in_progress' | 'completed' | 'rolled_back';
  startedAt: number | null;
  completedAt: number | null;
}

interface MigrationResource {
  type: string;
  sourceId: string;
  targetId: string | null;
  migrated: boolean;
}

export class MigrationHelper {
  private plans: Map<string, MigrationPlan> = new Map();

  plan(agentId: string, source: string, target: string, resources: { type: string; sourceId: string }[]): string {
    const id = crypto.randomUUID();
    this.plans.set(id, {
      id, agentId, sourcePlatform: source, targetPlatform: target,
      resources: resources.map(r => ({ ...r, targetId: null, migrated: false })),
      status: 'planned', startedAt: null, completedAt: null,
    });
    return id;
  }

  start(planId: string): boolean {
    const p = this.plans.get(planId);
    if (!p || p.status !== 'planned') return false;
    p.status = 'in_progress'; p.startedAt = Date.now(); return true;
  }

  markResourceMigrated(planId: string, sourceId: string, targetId: string): boolean {
    const p = this.plans.get(planId);
    if (!p) return false;
    const r = p.resources.find(x => x.sourceId === sourceId);
    if (!r) return false;
    r.targetId = targetId; r.migrated = true;
    if (p.resources.every(x => x.migrated)) { p.status = 'completed'; p.completedAt = Date.now(); }
    return true;
  }

  rollback(planId: string): boolean {
    const p = this.plans.get(planId);
    if (!p || p.status !== 'in_progress') return false;
    p.status = 'rolled_back'; return true;
  }

  getProgress(planId: string): { total: number; migrated: number; percent: number } | null {
    const p = this.plans.get(planId);
    if (!p) return null;
    const migrated = p.resources.filter(r => r.migrated).length;
    return { total: p.resources.length, migrated, percent: Math.round((migrated / p.resources.length) * 100) };
  }
}