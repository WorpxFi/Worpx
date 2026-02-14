interface AgentMessage {
  id: string;
  from: string;
  to: string;
  encryptedPayload: string;
  nonce: string;
  messageType: 'request' | 'response' | 'notification' | 'negotiation';
  sentAt: number;
  readAt: number | null;
}

export class AgentMessaging {
  private inboxes: Map<string, AgentMessage[]> = new Map();

  send(from: string, to: string, payload: string, messageType: AgentMessage['messageType']): string {
    const id = crypto.randomUUID();
    const nonce = Math.random().toString(36).slice(2, 14);
    const encryptedPayload = Buffer.from(payload).toString('base64') + ':' + nonce;
    const msg: AgentMessage = { id, from, to, encryptedPayload, nonce, messageType, sentAt: Date.now(), readAt: null };
    const inbox = this.inboxes.get(to) ?? [];
    inbox.push(msg);
    this.inboxes.set(to, inbox);
    return id;
  }

  receive(agentId: string, limit: number = 20): AgentMessage[] {
    return (this.inboxes.get(agentId) ?? []).filter(m => !m.readAt).slice(0, limit);
  }

  markRead(agentId: string, messageId: string): boolean {
    const inbox = this.inboxes.get(agentId);
    const msg = inbox?.find(m => m.id === messageId);
    if (!msg) return false;
    msg.readAt = Date.now(); return true;
  }

  decrypt(message: AgentMessage): string {
    const [encoded] = message.encryptedPayload.split(':');
    return Buffer.from(encoded, 'base64').toString('utf-8');
  }

  getConversation(agentA: string, agentB: string): AgentMessage[] {
    const all = [...(this.inboxes.get(agentA) ?? []), ...(this.inboxes.get(agentB) ?? [])];
    return all.filter(m => (m.from === agentA && m.to === agentB) || (m.from === agentB && m.to === agentA)).sort((a, b) => a.sentAt - b.sentAt);
  }

  getUnreadCount(agentId: string): number { return (this.inboxes.get(agentId) ?? []).filter(m => !m.readAt).length; }
}