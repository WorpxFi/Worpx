interface PayoutSchedule {
  id: string;
  agentId: string;
  destinationAddress: string;
  chain: string;
  token: string;
  minThreshold: number;
  accumulatedAmount: number;
  lastPayout: number | null;
  payoutCount: number;
}

export class AutoPayoutManager {
  private schedules: Map<string, PayoutSchedule> = new Map();
  private payoutLog: { scheduleId: string; amount: number; timestamp: number }[] = [];

  register(agentId: string, destination: string, chain: string, token: string, minThreshold: number): string {
    const id = crypto.randomUUID();
    this.schedules.set(id, { id, agentId, destinationAddress: destination, chain, token, minThreshold, accumulatedAmount: 0, lastPayout: null, payoutCount: 0 });
    return id;
  }

  accumulate(scheduleId: string, amount: number): boolean {
    const s = this.schedules.get(scheduleId);
    if (!s) return false;
    s.accumulatedAmount += amount;
    return true;
  }

  checkAndPayout(): PayoutSchedule[] {
    const triggered: PayoutSchedule[] = [];
    for (const s of this.schedules.values()) {
      if (s.accumulatedAmount >= s.minThreshold) {
        this.payoutLog.push({ scheduleId: s.id, amount: s.accumulatedAmount, timestamp: Date.now() });
        s.payoutCount++;
        s.lastPayout = Date.now();
        triggered.push({ ...s });
        s.accumulatedAmount = 0;
      }
    }
    return triggered;
  }

  getSchedulesByAgent(agentId: string): PayoutSchedule[] {
    return Array.from(this.schedules.values()).filter(s => s.agentId === agentId);
  }

  getPayoutHistory(scheduleId: string): { amount: number; timestamp: number }[] {
    return this.payoutLog.filter(l => l.scheduleId === scheduleId);
  }
}