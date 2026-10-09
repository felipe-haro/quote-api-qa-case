# Create a Quote – Acceptance Criteria

User story: *As a sales representative, I want to create a quote for a customer, so that I can give
them prices and product details quickly.*

The service under test is the Quote API of this repository (`api/`), a small study API that has known
defects on purpose. Its contract is `api/openapi.json`.

This document lists the acceptance criteria of the story: positive, boundary, negative, contract and
non-functional (performance and security). Every criterion is automated, and the tag in its
"Automated by" line (`@AC-01` … `@AC-30`) marks its scenarios in the feature files.

## Summary

| | Criteria | Met by the API | Not met |
|---|---|---|---|
| Positive and boundary | AC-01 to AC-08, AC-30 | 9 | 0 |
| Negative | AC-09 to AC-18, AC-29 | 8 | 3 (AC-12, AC-14, AC-17) |
| Contract | AC-19 to AC-21 | 3 | 0 |
| Performance | AC-22 to AC-24 | 3 | 0 |
| Security | AC-25 to AC-28 | 1 | 3 (AC-25, AC-27, AC-28) |
| **Total** | **30** | **24** | **6** |

A criterion is "not met" when at least one of its scenarios fails. AC-14 and AC-25 are met for most
inputs and fail for specific ones, listed under each criterion.

## Rules and decisions

1. **The discount is a fraction between 0 and 1.** 10% is sent as `0.10`.
2. **A quote must describe something that can be sold.** Quantity above zero, price of zero or more
   (a free item is possible, and must still be recorded), discount from 0% to 100%.
3. **An invalid request is refused with HTTP 400**, as a problem details document (RFC 9457) that
   names the fields, and no quote is created.
4. **Amounts are exact decimals and are not rounded.** `1.5 × 2.33` is `3.495`. Rounding is an open
   question (question 3).
5. **A unit price may have more than two decimals**, for example `1.999`.
6. **The performance limits** are 1 second for an ordinary quote and 2 seconds for a large one or
   under concurrent use.
7. **The body limit is 1 MB.** There is no universal value: web servers default to anything from
   100 KB to 30 MB. A quote with 1000 items takes about 70 KB.

---

## Positive and boundary

### AC-01 – Create a quote with one item

- **Given** a customer and one item
- **When** I create a quote with that item, quantity `Q` and unit price `P`
- **Then** the quote is returned with the line total `P × Q`
- **And** the confirmation message is "Quote created."

Example: Milk, 2 × 0.80 → line total 1.60, total 1.60.
Status: met. Automated by: `@AC-01` in `CreateQuote.feature`.

### AC-02 – Create a quote with a discounted item

- **Given** a customer and one item
- **When** I create a quote with quantity `Q`, unit price `P` and discount `D`
- **Then** the discount amount is `A = P × Q × D` and the line total is `(P × Q) − A`
- **And** the confirmation message is "Quote created."

Examples: 3 × 10.00 at 10% → discount 3.00, line 27.00. 4 × 1.99 at 75% → discount 5.97, line 1.99.
With more decimals: 3 × 1.999 → 5.997. 3 × 10.00 at 33.3% → discount 9.99, line 20.01.
Status: met. Automated by: `@AC-02` in `CreateQuote.feature`.

### AC-03 – Create a quote with two items

- **Given** a customer and two items A and B
- **When** I create a quote with A (quantity `Q1`, price `P1`) and B (quantity `Q2`, price `P2`)
- **Then** the quote has two lines and the total is `(P1 × Q1) + (P2 × Q2)`
- **And** the confirmation message is "Quote created."

Example: Milk 2 × 0.80 and Cheese 3 × 2.50 → lines 1.60 and 7.50, total 9.10.
Status: met. Automated by: `@AC-03` in `CreateQuote.feature`.

### AC-04 – A new quote is identified and starts active

- **Given** a valid quote request
- **When** the quote is created
- **Then** it has an identifier that is a GUID and is different for every quote
- **And** it is at revision 1, with status `active`, for the customer that was sent

Status: met. Automated by: `@AC-04` in `CreateQuote.feature`.

### AC-05 – An item without a discount is not discounted

- **Given** an item sent without the discount field
- **When** the quote is created
- **Then** the discount and the discount amount are 0 and the line total is `P × Q`

Status: met. Automated by: `@AC-05` in `CreateQuote.feature`.

### AC-06 – The total is the sum of the lines, whatever their content

- **Given** several items, with and without discount, with whole and fractional quantities
- **When** the quote is created
- **Then** the lines are returned in the order sent, each with its own discount and total
- **And** the quote total is the sum of the line totals, discounts included

Example: 2 × 0.80, 1.5 × 2.33 and 4 × 1.99 at 75% → 1.60 + 3.495 + 1.99 = 7.085.
Status: met. Automated by: `@AC-06` in `CreateQuote.feature`.

### AC-07 – The customer name is kept exactly as sent

- **Given** a customer name with an apostrophe, accented letters, non-Latin characters or an emoji
- **When** the quote is created
- **Then** the quote has exactly the same name

Status: met. Automated by: `@AC-07` in `CreateQuote.feature`.

### AC-08 – Values at the limits of the valid ranges are accepted

- **Given** an item at a limit: discount 0%, discount 100%, price 0, price 0.01, a small fractional
  quantity, or a large quantity and price
- **When** the quote is created
- **Then** it succeeds and the amounts follow AC-01 and AC-02

Examples: 2 × 5.00 at 100% → 0.00. 2 × 0.00 → 0.00. 0.25 × 4.00 → 1.00. 100000 × 9999.99 → 999999000.
Status: met. Automated by: `@AC-08` in `CreateQuote.feature`.

### AC-30 – A value with many decimals is kept exactly as sent

- **Given** a quantity or a discount with many decimals
- **When** the quote is created
- **Then** the quote has exactly the value that was sent, and the amounts are calculated from it
  without rounding errors

Examples: quantity 1.123456789 × 100.00 → 112.3456789. Discount 0.123456789 on 100.00 → discount
12.3456789, line 87.6543211.
Status: met. Automated by: `@AC-30` in `CreateQuote.feature`.

---

## Negative

### AC-09 – A quote needs a customer

- **Given** a request where the customer is missing, null, empty or only spaces
- **When** I create the quote
- **Then** it is refused with HTTP 400, naming `customer`

Status: met. Automated by: `@AC-09` in `CreateQuoteValidation.feature`.

### AC-10 – A quote needs at least one item

- **Given** a request where the item list is empty, missing or null
- **When** I create the quote
- **Then** it is refused with HTTP 400, naming `items`

Status: met. Automated by: `@AC-10` in `CreateQuoteValidation.feature`.

### AC-11 – Every item needs a name

- **Given** a request where one item has a name that is missing, null, empty or only spaces
- **When** I create the quote
- **Then** it is refused with HTTP 400, naming the item by its position (`items[1].item`)

Status: met. Automated by: `@AC-11` in `CreateQuoteValidation.feature`.

### AC-12 – Impossible quantities, prices and discounts are refused

- **Given** an item with a quantity of zero or less, a negative price, a discount below 0% or above
  100%, or without a quantity or a price
- **When** I create the quote
- **Then** it is refused with HTTP 400 and no quote is created

| Field | Valid | Refused (boundaries tested) |
|---|---|---|
| Quantity | above 0 | 0, −0.01, −2, missing |
| Unit price | 0 or more | −0.01, −0.80, missing |
| Discount | 0 to 1 | −0.01, −0.5, 1.01, 1.5 |

Status: **not met**. The contract declares these ranges, but the API does not check them. All 11
cases create a quote: −2 × 0.80 gives a total of −1.60; a 150% discount gives −10.00; a −50%
discount raises 20.00 to 30.00; a missing quantity is read as 1 and a missing price as 0.
Automated by: `@AC-12` in `CreateQuoteValidation.feature`.

### AC-13 – A body that is not a quote request is refused

- **Given** a body that is empty, is malformed JSON, or is JSON but not an object (null, array,
  text, number)
- **When** I send it
- **Then** it is refused with HTTP 400 and a problem details body

Status: met. Automated by: `@AC-13` in `CreateQuoteValidation.feature`.

### AC-14 – A field of the wrong type or out of range is refused, naming the field

- **Given** a request where a field does not have the type of the contract, or a number too large to
  be represented, or a null entry in the item list
- **When** I send it
- **Then** it is refused with HTTP 400 and the answer names the field

Status: **not met**. 12 wrong-type cases are refused correctly. Four are not:

| Input | Today |
|---|---|
| `"items": [null]` | HTTP 500 |
| `quantity` of `1e999` | Quote created, with amounts returned as `null` |
| `discount` of `1e999` | Quote created, with amounts returned as `null` |
| `"quantity": "2"` (number sent as text) | Accepted |

Automated by: `@AC-14` in `CreateQuoteValidation.feature`.

### AC-15 – Only JSON is accepted

- **Given** a body sent as `text/plain`, XML, a form or binary
- **When** I send it
- **Then** it is refused with HTTP 415
- **And** `application/json` (with or without a charset) and `application/*+json` are accepted

Status: met. Automated by: `@AC-15` in `CreateQuoteValidation.feature` and `CreateQuoteContract.feature`.

### AC-16 – Operations that do not exist are refused

- **Given** the two operations of the service, GET `/api/health` and POST `/api/quotes`
- **When** I use another method on them, or another path
- **Then** the method is refused with HTTP 405 and an `Allow` header naming the right one
- **And** the path is answered with HTTP 404

Status: met. Automated by: `@AC-16` in `HttpProtocol.feature`.

### AC-17 – Fields that are not in the contract are refused

- **Given** a request with a field the contract does not define (`additionalProperties: false`)
- **When** I send it
- **Then** it is refused with HTTP 400

Why it matters: a misspelled field is ignored without notice. `"discont": 0.5` instead of
`"discount"` creates the quote at full price.
Status: **not met**. Unknown fields are ignored.
Automated by: `@AC-17` in `CreateQuoteValidation.feature`.

### AC-18 – A refused request does not affect the next one

- **Given** a request that was refused
- **When** I send a valid request afterwards
- **Then** the quote is created normally

Status: met. Automated by: `@AC-18` in `CreateQuoteValidation.feature`.

### AC-29 – A decimal comma is refused

- **Given** a quantity, price or discount written with a comma (`32,44`), as a number or as text
- **When** I send the request
- **Then** it is refused with HTTP 400, and the value is never guessed

Why it matters: a comma is the decimal separator in many countries. Reading `1,5` as 15 or as 1
would create a wrong quote without notice.
Status: met. Automated by: `@AC-29` in `CreateQuoteValidation.feature`.

---

## Contract

### AC-19 – Every response keeps its agreed shape

- **Given** any request to the quotes operation
- **When** it is answered
- **Then** the body has exactly the fields, types, formats and enum values of the contract:
  a created quote, a validation problem or a problem details document

Status: met. Automated by: `@AC-19` in `CreateQuoteContract.feature`.

### AC-20 – The published contract is the versioned one

- **Given** the OpenAPI document published by the running service
- **When** I compare it with the versioned `api/openapi.json`
- **Then** they are equal, so any change to the contract is a visible, reviewed change

Status: met. Automated by: `@AC-20` in `OpenApiContract.feature`.

### AC-21 – The health check reports that the service is up

- **Given** the service is running
- **When** I call the health check
- **Then** it answers HTTP 200 with the status `up` and the current date and time in ISO 8601

Status: met. Automated by: `@AC-21` in `Health.feature`.

---

## Non-functional: performance

Measured by the client, against a service on the same machine. These detect a regression; they are
not a load test.

### AC-22 – An ordinary quote is created in under 1 second

- **Given** a quote request with one item
- **When** I create the quote
- **Then** the complete answer arrives in under 1000 ms

Status: met. Automated by: `@AC-22` in `Performance.feature`.

### AC-23 – A large quote is created in under 2 seconds

- **Given** a quote request with 1000 items
- **When** I create the quote
- **Then** it has 1000 lines and the correct total
- **And** the complete answer arrives in under 2000 ms

Status: met. Automated by: `@AC-23` in `Performance.feature`.

### AC-24 – Simultaneous requests are all served

- **Given** 50 quote requests sent at the same time
- **When** they are answered
- **Then** all 50 quotes are created, each with its own identifier
- **And** each answer arrives in under 2000 ms

Status: met. Automated by: `@AC-24` in `Performance.feature`.

---

## Non-functional: security

### AC-25 – An error reveals nothing about the implementation

- **Given** a request that is refused or that makes the service fail
- **When** it is answered
- **Then** the body has no stack trace, error class name, source file path or runtime internals

Status: **not met**. Refusals for a missing customer, malformed JSON, a wrong type and a wrong
content type are clean. A null entry in the items makes the service fail, and it answers HTTP 500
with the full stack trace and the source file paths.
Automated by: `@AC-25` in `Security.feature`.

### AC-26 – Text that looks like code is handled as plain data

- **Given** a customer and item name containing HTML, SQL, a file path or a template expression
- **When** the quote is created
- **Then** the text is returned unchanged, in a JSON response, and nothing is executed

Status: met. Automated by: `@AC-26` in `Security.feature`.

### AC-27 – A request body larger than 1 MB is refused

- **Given** a quote request of more than 1 MB
- **When** I send it
- **Then** it is refused with HTTP 413

Status: **not met**. The contract lists the 413 answer, but the service reads a body of any size.
Automated by: `@AC-27` in `Security.feature`.

### AC-28 – A response does not name the software that produced it

- **Given** any request
- **When** it is answered
- **Then** there is no `X-Powered-By` or `Server` header

Severity: low. The header is not a weakness by itself; it tells an attacker which software, and
which version, to look for weaknesses in.
Status: **not met**. Every response carries `X-Powered-By` with the name and version of the runtime.
Automated by: `@AC-28` in `Security.feature`.

---

## Open questions

1. Are the valid ranges of AC-12 right? In particular, is a price of zero (a free item) allowed?
2. Should a number sent as text be refused (AC-14) or accepted on purpose, for lenient clients?
3. Should amounts be rounded to two decimals, and how? Nothing is rounded: `1.5 × 2.33` is returned
   as `3.495`, and 55.12 with a 12.34% discount as `48.318192`. Proposal: keep the unit price as
   sent, and round the discount amount, the line total and the quote total to two decimals, half up.
4. Are the performance limits of AC-22 to AC-24 the right ones?
5. What is the largest quote that must be supported: how many items, and how long a customer name?
6. The service has no authentication. Who is allowed to create a quote?
7. Quotes are not stored and cannot be read back. When they are, a criterion must check that a created
   quote can be retrieved.

## Traceability

| Criterion | Feature file | Scenarios | Result |
|---|---|---|---|
| AC-01 | `CreateQuote.feature` | 1 | pass |
| AC-02 | `CreateQuote.feature` | 14 | pass |
| AC-03 | `CreateQuote.feature` | 1 | pass |
| AC-04 | `CreateQuote.feature` | 2 | pass |
| AC-05 | `CreateQuote.feature` | 1 | pass |
| AC-06 | `CreateQuote.feature` | 1 | pass |
| AC-07 | `CreateQuote.feature` | 4 | pass |
| AC-08 | `CreateQuote.feature` | 13 (shared with AC-02) | pass |
| AC-09 | `CreateQuoteValidation.feature` | 4 | pass |
| AC-10 | `CreateQuoteValidation.feature` | 3 | pass |
| AC-11 | `CreateQuoteValidation.feature` | 4 | pass |
| AC-12 | `CreateQuoteValidation.feature` | 11 | **11 fail** |
| AC-13 | `CreateQuoteValidation.feature` | 6 | pass |
| AC-14 | `CreateQuoteValidation.feature` | 16 | 12 pass, **4 fail** |
| AC-15 | `CreateQuoteValidation.feature`, `contract/CreateQuoteContract.feature` | 7 | pass |
| AC-16 | `HttpProtocol.feature` | 12 | pass |
| AC-17 | `CreateQuoteValidation.feature` | 3 | **3 fail** |
| AC-18 | `CreateQuoteValidation.feature` | 1 | pass |
| AC-19 | `contract/CreateQuoteContract.feature` | 9 | pass |
| AC-20 | `contract/OpenApiContract.feature` | 1 | pass |
| AC-21 | `Health.feature` | 2 | pass |
| AC-22 | `non-functional/Performance.feature` | 1 | pass |
| AC-23 | `non-functional/Performance.feature` | 1 | pass |
| AC-24 | `non-functional/Performance.feature` | 1 | pass |
| AC-25 | `non-functional/Security.feature` | 5 | 4 pass, **1 fails** |
| AC-26 | `non-functional/Security.feature` | 6 | pass |
| AC-27 | `non-functional/Security.feature` | 1 | **1 fails** |
| AC-28 | `non-functional/Security.feature` | 1 | **1 fails** |
| AC-29 | `CreateQuoteValidation.feature` | 4 | pass |
| AC-30 | `CreateQuote.feature` | 2 | pass |

121 scenarios: 100 pass and 21 fail. The failing ones are tagged `@known-bug` and run apart from the
others, so the 100 stay a reliable regression suite. `npm run test:all` runs all 121 in one report.
