interface Allowance {
  id: string;
  owner: string;
  spender: string;
  token: string;
  limit: number;
  used: number;
  expiresAt: number | null;
  revoked: boolean;
}

export class AllowanceManager {
  private allowances: Map<string, Allowance> = new Map();

  private key(owner: string, spender: string, token: string): string { return owner + ':' + spender + ':' + token; }

  approve(owner: string, spender: string, token: string, limit: number, ttlMs?: number): string {
    const id = crypto.randomUUID();
    const k = this.key(owner, spender, token);
    this.allowances.set(k, { id, owner, spender, token, limit, used: 0, expiresAt: ttlMs ? Date.now() + ttlMs : null, revoked: false });
    return id;
  }

  spend(owner: string, spender: string, token: string, amount: number): boolean {
    const a = this.allowances.get(this.key(owner, spender, token));
    if (!a || a.revoked) return false;
    if (a.expiresAt && Date.now() > a.expiresAt) return false;
    if (a.used + amount > a.limit) return false;
    a.used += amount;
    return true;
  }

  revoke(owner: string, spender: string, token: string): boolean {
    const a = this.allowances.get(this.key(owner, spender, token));
    if (!a) return false;
    a.revoked = true; return true;
  }

  getRemaining(owner: string, spender: string, token: string): number {
    const a = this.allowances.get(this.key(owner, spender, token));
    if (!a || a.revoked) return 0;
    if (a.expiresAt && Date.now() > a.expiresAt) return 0;
    return a.limit - a.used;
  }

  getAllowancesForOwner(owner: string): Allowance[] {
    return Array.from(this.allowances.values()).filter(a => a.owner === owner && !a.revoked);
  }
}