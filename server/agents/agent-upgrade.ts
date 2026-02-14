interface AgentVersion {
  agentId: string;
  currentVersion: string;
  targetVersion: string | null;
  upgradeStatus: 'current' | 'pending' | 'upgrading' | 'completed' | 'rolled_back';
  startedAt: number | null;
  completedAt: number | null;
  changelog: string[];
}

export class AgentUpgradeCoordinator {
  private versions: Map<string, AgentVersion> = new Map();

  register(agentId: string, version: string): void {
    this.versions.set(agentId, { agentId, currentVersion: version, targetVersion: null, upgradeStatus: 'current', startedAt: null, completedAt: null, changelog: [] });
  }

  planUpgrade(agentId: string, targetVersion: string, changelog: string[]): boolean {
    const v = this.versions.get(agentId);
    if (!v || v.upgradeStatus === 'upgrading') return false;
    v.targetVersion = targetVersion;
    v.upgradeStatus = 'pending';
    v.changelog = changelog;
    return true;
  }

  startUpgrade(agentId: string): boolean {
    const v = this.versions.get(agentId);
    if (!v || v.upgradeStatus !== 'pending') return false;
    v.upgradeStatus = 'upgrading'; v.startedAt = Date.now();
    return true;
  }

  completeUpgrade(agentId: string): boolean {
    const v = this.versions.get(agentId);
    if (!v || v.upgradeStatus !== 'upgrading') return false;
    v.currentVersion = v.targetVersion!;
    v.targetVersion = null; v.upgradeStatus = 'completed'; v.completedAt = Date.now();
    return true;
  }

  rollback(agentId: string): boolean {
    const v = this.versions.get(agentId);
    if (!v || v.upgradeStatus !== 'upgrading') return false;
    v.targetVersion = null; v.upgradeStatus = 'rolled_back';
    return true;
  }

  getVersion(agentId: string): string | null { return this.versions.get(agentId)?.currentVersion ?? null; }
  getPending(): AgentVersion[] { return Array.from(this.versions.values()).filter(v => v.upgradeStatus === 'pending'); }
}