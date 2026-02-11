interface PrivateChannel {
  id: string;
  initiator: string;
  counterparty: string;
  sharedSecret: string;
  encryptionAlgo: 'aes-256-gcm' | 'chacha20-poly1305';
  established: boolean;
  messageCount: number;
  createdAt: number;
}

interface EncryptedMessage {
  channelId: string;
  ciphertext: string;
  nonce: string;
  sequence: number;
  timestamp: number;
}

export class PrivateChannelEncryptor {
  private channels: Map<string, PrivateChannel> = new Map();
  private messages: Map<string, EncryptedMessage[]> = new Map();

  establish(initiator: string, counterparty: string, algo: PrivateChannel['encryptionAlgo'] = 'aes-256-gcm'): string {
    const id = crypto.randomUUID();
    const sharedSecret = this.deriveSharedSecret(initiator, counterparty);
    this.channels.set(id, {
      id, initiator, counterparty, sharedSecret,
      encryptionAlgo: algo, established: true, messageCount: 0, createdAt: Date.now(),
    });
    this.messages.set(id, []);
    return id;
  }

  encrypt(channelId: string, plaintext: string): EncryptedMessage | null {
    const channel = this.channels.get(channelId);
    if (!channel || !channel.established) return null;
    const nonce = this.generateNonce();
    const ciphertext = this.symmetricEncrypt(plaintext, channel.sharedSecret, nonce);
    channel.messageCount++;
    const msg: EncryptedMessage = {
      channelId, ciphertext, nonce, sequence: channel.messageCount, timestamp: Date.now(),
    };
    this.messages.get(channelId)?.push(msg);
    return msg;
  }

  decrypt(channelId: string, message: EncryptedMessage): string | null {
    const channel = this.channels.get(channelId);
    if (!channel) return null;
    return this.symmetricDecrypt(message.ciphertext, channel.sharedSecret, message.nonce);
  }

  private deriveSharedSecret(a: string, b: string): string {
    const combined = a < b ? a + b : b + a;
    let hash = 0x9e3779b9;
    for (let i = 0; i < combined.length; i++) {
      hash = Math.imul(hash ^ combined.charCodeAt(i), 0x5bd1e995);
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }

  private symmetricEncrypt(plaintext: string, key: string, nonce: string): string {
    let encrypted = '';
    for (let i = 0; i < plaintext.length; i++) {
      const keyByte = key.charCodeAt(i % key.length) ^ nonce.charCodeAt(i % nonce.length);
      encrypted += String.fromCharCode(plaintext.charCodeAt(i) ^ (keyByte & 0xff));
    }
    return Buffer.from(encrypted, 'binary').toString('base64');
  }

  private symmetricDecrypt(ciphertext: string, key: string, nonce: string): string {
    const decoded = Buffer.from(ciphertext, 'base64').toString('binary');
    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
      const keyByte = key.charCodeAt(i % key.length) ^ nonce.charCodeAt(i % nonce.length);
      decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ (keyByte & 0xff));
    }
    return decrypted;
  }

  private generateNonce(): string {
    let nonce = '';
    for (let i = 0; i < 24; i++) nonce += Math.floor(Math.random() * 16).toString(16);
    return nonce;
  }

  getChannelStats(channelId: string): { messages: number; established: boolean } | null {
    const channel = this.channels.get(channelId);
    if (!channel) return null;
    return { messages: channel.messageCount, established: channel.established };
  }

  closeChannel(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;
    channel.established = false;
    return true;
  }
}