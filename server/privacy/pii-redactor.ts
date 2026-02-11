interface RedactionRule {
  id: string;
  pattern: RegExp;
  replacement: string;
  category: PIICategory;
  enabled: boolean;
}

type PIICategory = 'address' | 'private_key' | 'email' | 'ip' | 'phone' | 'name' | 'custom';

interface RedactionResult {
  original: string;
  redacted: string;
  detections: Detection[];
  fullyRedacted: boolean;
}

interface Detection {
  category: PIICategory;
  position: number;
  length: number;
}

export class PIIRedactor {
  private rules: Map<string, RedactionRule> = new Map();
  private redactionCount: number = 0;

  constructor() {
    this.addDefaultRules();
  }

  private addDefaultRules(): void {
    this.addRule('wallet_addr', /0x[a-fA-F0-9]{40}/g, '[WALLET_REDACTED]', 'address');
    this.addRule('private_key', /0x[a-fA-F0-9]{64}/g, '[KEY_REDACTED]', 'private_key');
    this.addRule('email', /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]', 'email');
    this.addRule('ipv4', /d{1,3}.d{1,3}.d{1,3}.d{1,3}/g, '[IP_REDACTED]', 'ip');
    this.addRule('phone', /+?d{1,3}[-s.]?(?d{3})?[-s.]?d{3}[-s.]?d{4}/g, '[PHONE_REDACTED]', 'phone');
    this.addRule('solana_addr', /[1-9A-HJ-NP-Za-km-z]{32,44}/g, '[SOL_ADDR_REDACTED]', 'address');
  }

  addRule(id: string, pattern: RegExp, replacement: string, category: PIICategory): void {
    this.rules.set(id, { id, pattern, replacement, category, enabled: true });
  }

  redact(input: string): RedactionResult {
    const detections: Detection[] = [];
    let output = input;

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      let match;
      while ((match = regex.exec(input)) !== null) {
        detections.push({ category: rule.category, position: match.index, length: match[0].length });
      }
      output = output.replace(new RegExp(rule.pattern.source, rule.pattern.flags), rule.replacement);
    }

    this.redactionCount += detections.length;
    return {
      original: input, redacted: output,
      detections, fullyRedacted: detections.length > 0,
    };
  }

  enableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) rule.enabled = true;
  }

  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) rule.enabled = false;
  }

  getTotalRedactions(): number { return this.redactionCount; }
  getRuleCount(): number { return this.rules.size; }
}