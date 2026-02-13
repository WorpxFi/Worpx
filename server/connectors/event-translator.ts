interface PlatformEvent {
  platformId: string;
  nativeType: string;
  nativePayload: Record<string, unknown>;
  receivedAt: number;
}

interface UnifiedEvent {
  id: string;
  category: 'payment' | 'agent' | 'skill' | 'channel' | 'system';
  action: string;
  agentId: string | null;
  data: Record<string, unknown>;
  sourcePlatform: string;
  timestamp: number;
}

type TranslatorFn = (event: PlatformEvent) => UnifiedEvent | null;

export class EventTranslator {
  private translators: Map<string, TranslatorFn> = new Map();
  private translated: UnifiedEvent[] = [];

  registerTranslator(platformId: string, translator: TranslatorFn): void {
    this.translators.set(platformId, translator);
  }

  translate(event: PlatformEvent): UnifiedEvent | null {
    const fn = this.translators.get(event.platformId);
    if (!fn) return null;
    const unified = fn(event);
    if (unified) this.translated.push(unified);
    return unified;
  }

  getRecent(limit: number = 50): UnifiedEvent[] { return this.translated.slice(-limit); }
  getByCategory(category: UnifiedEvent['category']): UnifiedEvent[] { return this.translated.filter(e => e.category === category); }
  getTranslatedCount(): number { return this.translated.length; }
}