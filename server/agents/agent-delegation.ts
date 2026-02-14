interface DelegationTask {
  id: string;
  delegator: string;
  delegatee: string;
  skillId: string;
  params: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'rejected';
  assignedAt: number;
  completedAt: number | null;
  result: Record<string, unknown> | null;
}

export class AgentDelegation {
  private tasks: Map<string, DelegationTask> = new Map();

  delegate(delegator: string, delegatee: string, skillId: string, params: Record<string, unknown>, priority: DelegationTask['priority'] = 'medium'): string {
    const id = crypto.randomUUID();
    this.tasks.set(id, { id, delegator, delegatee, skillId, params, priority, status: 'assigned', assignedAt: Date.now(), completedAt: null, result: null });
    return id;
  }

  accept(taskId: string): boolean {
    const t = this.tasks.get(taskId);
    if (!t || t.status !== 'assigned') return false;
    t.status = 'accepted'; return true;
  }

  startWork(taskId: string): boolean {
    const t = this.tasks.get(taskId);
    if (!t || t.status !== 'accepted') return false;
    t.status = 'in_progress'; return true;
  }

  complete(taskId: string, result: Record<string, unknown>): boolean {
    const t = this.tasks.get(taskId);
    if (!t || t.status !== 'in_progress') return false;
    t.status = 'completed'; t.completedAt = Date.now(); t.result = result; return true;
  }

  reject(taskId: string): boolean {
    const t = this.tasks.get(taskId);
    if (!t || t.status === 'completed') return false;
    t.status = 'rejected'; return true;
  }

  getAssignedTo(agentId: string): DelegationTask[] { return Array.from(this.tasks.values()).filter(t => t.delegatee === agentId && t.status !== 'completed'); }
  getDelegatedBy(agentId: string): DelegationTask[] { return Array.from(this.tasks.values()).filter(t => t.delegator === agentId); }
}