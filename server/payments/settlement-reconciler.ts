interface ReconciliationEntry {
  channelId: string;
  expectedAmount: string;
  actualAmount: string;
  discrepancy: string;
  status: 'matched' | 'discrepancy' | 'unresolved';
  checkedAt: number;
}

interface ReconciliationReport {
  id: string;
  entries: ReconciliationEntry[];
  totalExpected: number;
  totalActual: number;
  totalDiscrepancy: number;
  generatedAt: number;
}

export class SettlementReconciler {
  private reports: ReconciliationReport[] = [];

  reconcile(records: { channelId: string; expected: string; actual: string }[]): ReconciliationReport {
    const entries: ReconciliationEntry[] = records.map(r => {
      const exp = parseFloat(r.expected);
      const act = parseFloat(r.actual);
      const disc = Math.abs(exp - act);
      return { channelId: r.channelId, expectedAmount: r.expected, actualAmount: r.actual, discrepancy: disc.toFixed(6), status: disc < 0.000001 ? 'matched' as const : 'discrepancy' as const, checkedAt: Date.now() };
    });
    const report: ReconciliationReport = {
      id: crypto.randomUUID(), entries,
      totalExpected: entries.reduce((s, e) => s + parseFloat(e.expectedAmount), 0),
      totalActual: entries.reduce((s, e) => s + parseFloat(e.actualAmount), 0),
      totalDiscrepancy: entries.reduce((s, e) => s + parseFloat(e.discrepancy), 0),
      generatedAt: Date.now(),
    };
    this.reports.push(report);
    return report;
  }

  getDiscrepancies(): ReconciliationEntry[] {
    return this.reports.flatMap(r => r.entries).filter(e => e.status === 'discrepancy');
  }

  getReports(): ReconciliationReport[] { return this.reports; }
}