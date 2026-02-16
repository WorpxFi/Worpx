type TaskPriority = 0 | 1 | 2 | 3;

interface QueuedTask {
  id: string;
  submittedBy: string;
  assignedTo: string | null;
  skillId: string;
  payload: Record<string, unknown>;
  priority: TaskPriority;
  status: 'queued' | 'claimed' | 'processing' | 'completed' | 'failed' | 'timeout';
  createdAt: number;
  claimedAt: number | null;
  completedAt: number | null;
  timeoutMs: number;
  result: Record<string, unknown> | null;
}

export class AgentTaskQueue {
  private tasks: Map<string, QueuedTask> = new Map();

  enqueue(submittedBy: string, skillId: string, payload: Record<string, unknown>, priority: TaskPriority = 1, timeoutMs: number = 60000): string {
    const id = crypto.randomUUID();
    this.tasks.set(id, { id, submittedBy, assignedTo: null, skillId, payload, priority, status: 'queued', createdAt: Date.now(), claimedAt: null, completedAt: null, timeoutMs, result: null });
    return id;
  }

  claim(taskId: string, agentId: string): boolean {
    const t = this.tasks.get(taskId);
    if (!t || t.status !== 'queued') return false;
    t.assignedTo = agentId;
    t.status = 'claimed';
    t.claimedAt = Date.now();
    return true;
  }

  startProcessing(taskId: string): boolean {
    const t = this.tasks.get(taskId);
    if (!t || t.status !== 'claimed') return false;
    t.status = 'processing';
    return true;
  }

  complete(taskId: string, result: Record<string, unknown>): boolean {
    const t = this.tasks.get(taskId);
    if (!t || t.status !== 'processing') return false;
    t.status = 'completed';
    t.completedAt = Date.now();
    t.result = result;
    return true;
  }

  fail(taskId: string): boolean {
    const t = this.tasks.get(taskId);
    if (!t || (t.status !== 'processing' && t.status !== 'claimed')) return false;
    t.status = 'failed';
    return true;
  }

  getQueued(skillId?: string): QueuedTask[] {
    return Array.from(this.tasks.values())
      .filter(t => t.status === 'queued' && (!skillId || t.skillId === skillId))
      .sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
  }

  expireTimedOut(): number {
    let count = 0;
    for (const t of this.tasks.values()) {
      if (t.status === 'processing' && t.claimedAt && Date.now() - t.claimedAt > t.timeoutMs) { t.status = 'timeout'; count++; }
    }
    return count;
  }

  getByAgent(agentId: string): QueuedTask[] {
    return Array.from(this.tasks.values()).filter(t => t.assignedTo === agentId || t.submittedBy === agentId);
  }
}