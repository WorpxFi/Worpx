type OnboardingStage = 'submitted' | 'identity_check' | 'capability_scan' | 'security_audit' | 'approved' | 'rejected';

interface OnboardingRequest {
  id: string;
  externalAgentId: string;
  originPlatform: string;
  ownerAddress: string;
  declaredCapabilities: string[];
  stage: OnboardingStage;
  stageHistory: { stage: OnboardingStage; timestamp: number; notes: string }[];
  submittedAt: number;
  completedAt: number | null;
}

export class AgentOnboardingPipeline {
  private requests: Map<string, OnboardingRequest> = new Map();
  private stageOrder: OnboardingStage[] = ['submitted', 'identity_check', 'capability_scan', 'security_audit', 'approved'];

  submit(externalAgentId: string, originPlatform: string, ownerAddress: string, capabilities: string[]): string {
    const id = crypto.randomUUID();
    const req: OnboardingRequest = {
      id, externalAgentId, originPlatform, ownerAddress,
      declaredCapabilities: capabilities, stage: 'submitted',
      stageHistory: [{ stage: 'submitted', timestamp: Date.now(), notes: 'Application received' }],
      submittedAt: Date.now(), completedAt: null,
    };
    this.requests.set(id, req);
    return id;
  }

  advance(requestId: string, notes: string = ''): boolean {
    const req = this.requests.get(requestId);
    if (!req || req.stage === 'approved' || req.stage === 'rejected') return false;
    const currentIdx = this.stageOrder.indexOf(req.stage);
    if (currentIdx < 0 || currentIdx >= this.stageOrder.length - 1) return false;
    const nextStage = this.stageOrder[currentIdx + 1];
    req.stage = nextStage;
    req.stageHistory.push({ stage: nextStage, timestamp: Date.now(), notes });
    if (nextStage === 'approved') req.completedAt = Date.now();
    return true;
  }

  reject(requestId: string, reason: string): boolean {
    const req = this.requests.get(requestId);
    if (!req || req.stage === 'approved' || req.stage === 'rejected') return false;
    req.stage = 'rejected';
    req.stageHistory.push({ stage: 'rejected', timestamp: Date.now(), notes: reason });
    req.completedAt = Date.now();
    return true;
  }

  getByStage(stage: OnboardingStage): OnboardingRequest[] {
    return Array.from(this.requests.values()).filter(r => r.stage === stage);
  }

  getByPlatform(platform: string): OnboardingRequest[] {
    return Array.from(this.requests.values()).filter(r => r.originPlatform === platform);
  }

  getProgress(requestId: string): { current: number; total: number; stage: string } | null {
    const req = this.requests.get(requestId);
    if (!req) return null;
    return { current: this.stageOrder.indexOf(req.stage), total: this.stageOrder.length - 1, stage: req.stage };
  }

  getPending(): OnboardingRequest[] {
    return Array.from(this.requests.values()).filter(r => r.stage !== 'approved' && r.stage !== 'rejected');
  }
}