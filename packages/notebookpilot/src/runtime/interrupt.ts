/** One signal byte per kernel; a signal must belong to the executing message. */
export class InterruptChannel {
  readonly buffer = new Uint8Array(new SharedArrayBuffer(1));
  private active: string | null = null;
  private pending: string | null = null;

  begin(messageId: string): void {
    this.active = messageId;
    Atomics.store(this.buffer, 0, this.pending === messageId ? 2 : 0);
    this.pending = null;
  }

  interrupt(messageId: string): boolean {
    if (this.active && this.active !== messageId) return false;
    if (this.active) Atomics.store(this.buffer, 0, 2);
    else this.pending = messageId;
    return true;
  }

  end(messageId: string): void {
    if (this.active !== messageId) return;
    this.active = null;
    this.pending = null;
    Atomics.store(this.buffer, 0, 0);
  }
}

export const interruptChannels = new Map<string, InterruptChannel>();
