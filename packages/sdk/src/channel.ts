import type { WorpxClient } from "./client";
import type {
  ChannelState,
  ChannelPayment,
  ChannelSettlement,
  TransactionReceipt,
} from "./types";

export class PaymentChannel {
  private client: WorpxClient;
  private state: ChannelState;
  private payments: TransactionReceipt[] = [];

  constructor(client: WorpxClient, state: ChannelState) {
    this.client = client;
    this.state = state;
  }

  get id(): string {
    return this.state.id;
  }

  get status(): ChannelState["status"] {
    return this.state.status;
  }

  get nonce(): number {
    return this.state.nonce;
  }

  get depositAmount(): string {
    return this.state.depositAmount;
  }

  get totalPayments(): number {
    return this.payments.length;
  }

  async pay(payment: ChannelPayment): Promise<TransactionReceipt> {
    this.assertActive();
    const receipt = await this.client.channelPay(this.state.id, payment);
    this.payments.push(receipt);
    this.state.nonce++;
    return receipt;
  }

  async refresh(): Promise<ChannelState> {
    this.state = await this.client.getChannel(this.state.id);
    return this.state;
  }

  async settle(): Promise<ChannelSettlement> {
    this.assertActive();
    const settlement = await this.client.settleChannel(this.state.id);
    this.state.status = "settled";
    return settlement;
  }

  getPaymentHistory(): TransactionReceipt[] {
    return [...this.payments];
  }

  computeRunningTotal(): string {
    let total = 0;
    for (const p of this.payments) {
      total += parseFloat(String(p.txHash ?? "0"));
    }
    return total.toFixed(6);
  }

  private assertActive(): void {
    if (this.state.status !== "active" && this.state.status !== "opening") {
      throw new Error(
        `Channel ${this.state.id} is ${this.state.status}, cannot transact`
      );
    }
  }
}
