type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

interface TrackedError {
  id: string;
  code: string;
  message: string;
  severity: ErrorSeverity;
  source: string;
  stackFingerprint: string;
  occurrences: number;
  firstSeen: number;
  lastSeen: number;
  resolved: boolean;
}

export class AppErrorTracker {
  private errors: Map<string, TrackedError> = new Map();

  track(code: string, message: string, severity: ErrorSeverity, source: string): string {
    const fingerprint = this.fingerprint(code + source + message.slice(0, 50));
    const existing = this.errors.get(fingerprint);
    if (existing) {
      existing.occurrences++;
      existing.lastSeen = Date.now();
      if (!existing.resolved) return existing.id;
      existing.resolved = false;
      return existing.id;
    }
    const id = crypto.randomUUID();
    this.errors.set(fingerprint, { id, code, message, severity, source, stackFingerprint: fingerprint, occurrences: 1, firstSeen: Date.now(), lastSeen: Date.now(), resolved: false });
    return id;
  }

  private fingerprint(input: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) h = Math.imul(h ^ input.charCodeAt(i), 0x01000193);
    return Math.abs(h).toString(16).padStart(8, '0');
  }

  resolve(errorId: string): boolean {
    for (const e of this.errors.values()) {
      if (e.id === errorId) { e.resolved = true; return true; }
    }
    return false;
  }

  getUnresolved(): TrackedError[] {
    return Array.from(this.errors.values()).filter(e => !e.resolved).sort((a, b) => {
      const sevOrder: Record<ErrorSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return sevOrder[a.severity] - sevOrder[b.severity] || b.occurrences - a.occurrences;
    });
  }

  getBySeverity(severity: ErrorSeverity): TrackedError[] {
    return Array.from(this.errors.values()).filter(e => e.severity === severity && !e.resolved);
  }

  getTopErrors(limit: number = 10): TrackedError[] {
    return Array.from(this.errors.values()).sort((a, b) => b.occurrences - a.occurrences).slice(0, limit);
  }

  getStats(): { total: number; unresolved: number; critical: number } {
    const all = Array.from(this.errors.values());
    return { total: all.length, unresolved: all.filter(e => !e.resolved).length, critical: all.filter(e => e.severity === 'critical' && !e.resolved).length };
  }
}