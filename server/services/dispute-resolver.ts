interface Dispute {
  id: string;
  channelId: string;
  initiatorAgent: string;
  respondentAgent: string;
  reason: DisputeReason;
  evidence: Evidence[];
  status: 'filed' | 'evidence_phase' | 'arbitration' | 'resolved' | 'expired';
  resolution: Resolution | null;
  filedAt: number;
  deadlineAt: number;
  resolvedAt: number | null;
}

type DisputeReason = 'non_delivery' | 'incorrect_result' | 'payment_mismatch' | 'timeout' | 'unauthorized_access';

interface Evidence {
  submittedBy: string;
  description: string;
  dataHash: string;
  timestamp: number;
}

interface Resolution {
  outcome: 'initiator_wins' | 'respondent_wins' | 'split' | 'void';
  refundAmount: bigint;
  penaltyAmount: bigint;
  arbitratorNotes: string;
}

export class DisputeResolver {
  private disputes: Map<string, Dispute> = new Map();
  private evidenceDeadline: number;
  private arbitrationDeadline: number;

  constructor(evidenceDeadlineMs: number = 86400000, arbitrationDeadlineMs: number = 172800000) {
    this.evidenceDeadline = evidenceDeadlineMs;
    this.arbitrationDeadline = arbitrationDeadlineMs;
  }

  fileDispute(channelId: string, initiator: string, respondent: string, reason: DisputeReason): string {
    const id = crypto.randomUUID();
    this.disputes.set(id, {
      id, channelId, initiatorAgent: initiator, respondentAgent: respondent,
      reason, evidence: [], status: 'filed', resolution: null,
      filedAt: Date.now(), deadlineAt: Date.now() + this.evidenceDeadline, resolvedAt: null,
    });
    return id;
  }

  submitEvidence(disputeId: string, submittedBy: string, description: string, dataHash: string): boolean {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) return false;
    if (dispute.status !== 'filed' && dispute.status !== 'evidence_phase') return false;
    if (submittedBy !== dispute.initiatorAgent && submittedBy !== dispute.respondentAgent) return false;

    dispute.evidence.push({ submittedBy, description, dataHash, timestamp: Date.now() });
    dispute.status = 'evidence_phase';
    return true;
  }

  escalateToArbitration(disputeId: string): boolean {
    const dispute = this.disputes.get(disputeId);
    if (!dispute || dispute.status !== 'evidence_phase') return false;
    dispute.status = 'arbitration';
    dispute.deadlineAt = Date.now() + this.arbitrationDeadline;
    return true;
  }

  resolve(disputeId: string, resolution: Resolution): boolean {
    const dispute = this.disputes.get(disputeId);
    if (!dispute || dispute.status !== 'arbitration') return false;
    dispute.resolution = resolution;
    dispute.status = 'resolved';
    dispute.resolvedAt = Date.now();
    return true;
  }

  autoResolve(disputeId: string): boolean {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) return false;

    const initiatorEvidence = dispute.evidence.filter(e => e.submittedBy === dispute.initiatorAgent).length;
    const respondentEvidence = dispute.evidence.filter(e => e.submittedBy === dispute.respondentAgent).length;

    let outcome: Resolution['outcome'];
    if (respondentEvidence === 0) outcome = 'initiator_wins';
    else if (initiatorEvidence === 0) outcome = 'respondent_wins';
    else outcome = 'split';

    return this.resolve(disputeId, {
      outcome, refundAmount: 0n, penaltyAmount: 0n,
      arbitratorNotes: 'Automated resolution based on evidence weight',
    });
  }

  expireStale(): string[] {
    const now = Date.now();
    const expired: string[] = [];
    for (const dispute of this.disputes.values()) {
      if (dispute.status !== 'resolved' && dispute.status !== 'expired' && now > dispute.deadlineAt) {
        dispute.status = 'expired';
        expired.push(dispute.id);
      }
    }
    return expired;
  }

  getDisputesByAgent(agentId: string): Dispute[] {
    return Array.from(this.disputes.values())
      .filter(d => d.initiatorAgent === agentId || d.respondentAgent === agentId);
  }

  getActiveCount(): number {
    return Array.from(this.disputes.values())
      .filter(d => d.status !== 'resolved' && d.status !== 'expired').length;
  }
}