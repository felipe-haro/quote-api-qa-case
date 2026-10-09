/** Special values of the feature tables. */
export const OMITTED_TOKEN = '[omitted]';
export const NULL_TOKEN = '[null]';
export const EMPTY_TOKEN = '[empty]';
export const BLANK_TOKEN = '[blank]';

type JsonObject = Record<string, unknown>;

/** Parses a number written in a feature file (dot as decimal separator). */
export function parseNumber(value: string): number {
  const text = value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) {
    throw new Error(`"${value}" is not a number.`);
  }

  return Number(text);
}

/**
 * Builds the JSON body of POST /api/quotes. It works on a raw object (not on typed models) so
 * negative scenarios can omit fields or send null, empty and blank values.
 */
export class QuoteRequestBuilder {
  private readonly payload: JsonObject = { items: [] };

  /** Sets the customer (supports the special tokens). */
  withCustomer(customer: string): void {
    setText(this.payload, 'customer', customer);
  }

  /** Sets a customer name of the given length (size limit scenarios). */
  withCustomerOfLength(length: number): void {
    this.payload.customer = 'A'.repeat(length);
  }

  /** Sends an empty item list. */
  withNoItems(): void {
    this.payload.items = [];
  }

  /** Removes the items field from the body. */
  withoutItemsField(): void {
    delete this.payload.items;
  }

  /** Sends "items": null. */
  withNullItems(): void {
    this.payload.items = null;
  }

  /** Adds an item. The discount is a fraction; undefined omits the field. */
  addItem(item: string, quantity: string, unitPrice: string, discount?: string): void {
    if (!Array.isArray(this.payload.items)) {
      this.payload.items = [];
    }

    const json: JsonObject = {};
    setText(json, 'item', item);
    json.quantity = parseNumber(quantity);
    json.unitPrice = parseNumber(unitPrice);
    if (discount !== undefined) {
      json.discount = parseNumber(discount);
    }

    (this.payload.items as JsonObject[]).push(json);
  }

  toJson(): string {
    return JSON.stringify(this.payload);
  }
}

function setText(target: JsonObject, field: string, value: string): void {
  switch (value) {
    case OMITTED_TOKEN:
      delete target[field];
      break;
    case NULL_TOKEN:
      target[field] = null;
      break;
    case EMPTY_TOKEN:
      target[field] = '';
      break;
    case BLANK_TOKEN:
      target[field] = '   ';
      break;
    default:
      target[field] = value;
  }
}
