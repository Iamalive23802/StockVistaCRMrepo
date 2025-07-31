export interface PaymentEntry {
  amount: string;
  date: string;
  utr: string;
  approved: boolean;
  /**
   * Indicates the payment row has been added locally and not yet saved.
   * This flag is ignored when serializing and will not be sent to the server.
   */
  isNew?: boolean;
}

export function parsePaymentHistory(str?: string): PaymentEntry[] {
  if (!str) return [];
  return str.split('|||').map(entry => {
    const parts = entry.split('__');
    return {
      amount: parts[0] || '',
      date: parts[1] || new Date().toISOString(),
      utr: parts[2] || '',
      approved: parts[3] ? parts[3] === '1' || parts[3] === 'true' : true,
    } as PaymentEntry;
  });
}

export function serializePaymentHistory(entries: PaymentEntry[]): string {
  return entries
    .map(e => `${e.amount}__${e.date}__${e.utr || ''}__${e.approved ? '1' : '0'}`)
    .join('|||');
}
