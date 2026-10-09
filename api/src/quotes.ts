import { randomUUID } from 'node:crypto';

import Decimal from 'decimal.js';

export interface QuoteItem {
  item: string;
  quantity: number;
  unitPrice: number;
  /** Fraction of the gross amount: 0.10 means 10%. */
  discount: number;
}

export interface QuoteRequest {
  customer: string;
  items: QuoteItem[];
}

export interface QuoteLine extends QuoteItem {
  discountAmount: number;
  lineTotal: number;
}

export interface Quote {
  id: string;
  customer: string;
  revision: number;
  status: 'active' | 'inactive';
  lines: QuoteLine[];
  total: number;
}

/**
 * Prices a quote. Amounts are calculated as decimals, never as binary floating point numbers:
 *   discount amount = quantity x unit price x discount
 *   line total      = (quantity x unit price) - discount amount
 *   total           = sum of the line totals
 */
export function createQuote(request: QuoteRequest): Quote {
  let total = new Decimal(0);

  const lines = request.items.map((entry): QuoteLine => {
    const gross = new Decimal(entry.quantity).times(entry.unitPrice);
    const discountAmount = gross.times(entry.discount);
    const lineTotal = gross.minus(discountAmount);
    total = total.plus(lineTotal);

    return { ...entry, discountAmount: discountAmount.toNumber(), lineTotal: lineTotal.toNumber() };
  });

  return {
    id: randomUUID(),
    customer: request.customer,
    revision: 1,
    status: 'active',
    lines,
    total: total.toNumber(),
  };
}
