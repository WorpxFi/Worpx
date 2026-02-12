interface PaymentReceipt {
  receiptId: string;
  txId: string;
  payer: string;
  payee: string;
  amount: string;
  token: string;
  chain: string;
  receiptHash: string;
  issuedAt: number;
  verified: boolean;
}

export class PaymentReceiptStore {
  private receipts: Map<string, PaymentReceipt> = new Map();

  issue(txId: string, payer: string, payee: string, amount: string, token: string, chain: string): PaymentReceipt {
    const receiptId = crypto.randomUUID();
    const receiptHash = this.computeHash(txId + payer + payee + amount + token);
    const receipt: PaymentReceipt = { receiptId, txId, payer, payee, amount, token, chain, receiptHash, issuedAt: Date.now(), verified: false };
    this.receipts.set(receiptId, receipt);
    return receipt;
  }

  verify(receiptId: string): boolean {
    const r = this.receipts.get(receiptId);
    if (!r) return false;
    const expected = this.computeHash(r.txId + r.payer + r.payee + r.amount + r.token);
    r.verified = expected === r.receiptHash;
    return r.verified;
  }

  private computeHash(data: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < data.length; i++) h = Math.imul(h ^ data.charCodeAt(i), 0x01000193);
    return Math.abs(h).toString(16).padStart(8, '0');
  }

  getByAgent(agentId: string): PaymentReceipt[] {
    return Array.from(this.receipts.values()).filter(r => r.payer === agentId || r.payee === agentId);
  }
}