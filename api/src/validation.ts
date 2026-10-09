import type { QuoteItem, QuoteRequest } from './quotes';

/** Messages by field path, for example { "items[0].quantity": ["Quantity must be a number."] }. */
export type FieldErrors = Record<string, string[]>;

export type ParseResult = { request: QuoteRequest } | { errors: FieldErrors };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads a number.
 *
 * KNOWN DEFECT (AC-14): text that looks like a number ("2") is accepted, although the contract
 * declares the field as a number.
 */
function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }

  return undefined;
}

/**
 * Turns a request body into a quote request, or lists what is wrong with it.
 *
 * KNOWN DEFECTS, kept on purpose (this is a study API, see the README):
 *   - AC-12: quantities, prices and discounts are not checked against the ranges of the contract.
 *   - AC-12: a missing quantity is read as 1 and a missing unit price as 0.
 *   - AC-14: a null entry in the item list is not handled.
 *   - AC-17: fields that are not in the contract are ignored.
 */
export function parseQuoteRequest(body: unknown): ParseResult {
  if (!isObject(body)) {
    return { errors: { $: ['The body must be a JSON object.'] } };
  }

  const errors: FieldErrors = {};
  const add = (field: string, message: string) => (errors[field] ??= []).push(message);

  const { customer, items } = body;

  if (customer === undefined || customer === null) {
    add('customer', 'Customer is required.');
  } else if (typeof customer !== 'string') {
    add('customer', 'Customer must be text.');
  } else if (customer.trim() === '') {
    add('customer', 'Customer is required.');
  }

  const parsedItems: QuoteItem[] = [];

  if (items === undefined || items === null) {
    add('items', 'At least one item is required.');
  } else if (!Array.isArray(items)) {
    add('items', 'Items must be a list.');
  } else if (items.length === 0) {
    add('items', 'At least one item is required.');
  } else {
    items.forEach((entry, index) => {
      const at = `items[${index}]`;
      const { item, quantity = 1, unitPrice = 0, discount = 0 } = entry;

      if (item === undefined || item === null) {
        add(`${at}.item`, 'Item name is required.');
      } else if (typeof item !== 'string') {
        add(`${at}.item`, 'Item name must be text.');
      } else if (item.trim() === '') {
        add(`${at}.item`, 'Item name is required.');
      }

      const numbers = {
        quantity: toNumber(quantity),
        unitPrice: toNumber(unitPrice),
        discount: toNumber(discount),
      };

      if (numbers.quantity === undefined) add(`${at}.quantity`, 'Quantity must be a number.');
      if (numbers.unitPrice === undefined) add(`${at}.unitPrice`, 'Unit price must be a number.');
      if (numbers.discount === undefined) add(`${at}.discount`, 'Discount must be a number.');

      parsedItems.push({
        item: item as string,
        quantity: numbers.quantity ?? 0,
        unitPrice: numbers.unitPrice ?? 0,
        discount: numbers.discount ?? 0,
      });
    });
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return { request: { customer: customer as string, items: parsedItems } };
}
