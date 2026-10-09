@api @create-quote @regression
Feature: Create a quote
	As a sales representative
	I want to create a quote for a customer with one or more items
	So that the customer receives an accurate price, including discounts

	Business rules under test (acceptance criteria AC-01 to AC-08 and AC-30, docs/acceptance-criteria.md):
	  - Discount amount = quantity x unit price x discount
	    (the discount is a fraction: 0.10 means 10%)
	  - Line total = (quantity x unit price) - discount amount
	  - Quote total = sum of the line totals
	  - A new quote starts at revision 1, with status active, and has a unique identifier
	Expected values in the tables below were calculated by hand from these rules.

Background:
	Given the Quote API is available

@smoke @AC-01 @AC-04
Scenario: Create a quote for a customer with a single item
	Given a quote request for customer "ACME Labs"
	And the request contains the following items:
		| Item | Quantity | UnitPrice | Discount |
		| Milk | 2        | 0.80      | 0        |
	When I submit the quote request
	Then the response status code should be 201
	And the confirmation message should be "Quote created."
	And the quote should belong to customer "ACME Labs"
	And the quote should have a unique identifier
	And the quote should be at revision 1 with status "active"
	And the quote should contain the following lines:
		| Item | Quantity | UnitPrice | Discount | DiscountAmount | LineTotal |
		| Milk | 2        | 0.80      | 0        | 0.00           | 1.60      |
	And the quote total should be 1.60

@AC-02
Scenario: Apply a percentage discount to an item
	Given a quote request for customer "ACME Labs"
	And the request contains the following items:
		| Item  | Quantity | UnitPrice | Discount |
		| Bread | 4        | 1.99      | 0.75     |
	When I submit the quote request
	Then the response status code should be 201
	And the confirmation message should be "Quote created."
	And the quote should belong to customer "ACME Labs"
	And the quote should contain the following lines:
		| Item  | Quantity | UnitPrice | Discount | DiscountAmount | LineTotal |
		| Bread | 4        | 1.99      | 0.75     | 5.97           | 1.99      |
	And the quote total should be 1.99

@AC-03
Scenario: Create a quote with two items
	Given a quote request for customer "ACME Labs"
	And the request contains the following items:
		| Item   | Quantity | UnitPrice |
		| Milk   | 2        | 0.80      |
		| Cheese | 3        | 2.50      |
	When I submit the quote request
	Then the response status code should be 201
	And the confirmation message should be "Quote created."
	And the quote should belong to customer "ACME Labs"
	And the quote should contain the following lines:
		| Item   | Quantity | UnitPrice | Discount | DiscountAmount | LineTotal |
		| Milk   | 2        | 0.80      | 0        | 0.00           | 1.60      |
		| Cheese | 3        | 2.50      | 0        | 0.00           | 7.50      |
	And the quote total should be 9.10

@AC-06
Scenario: Create a quote with several items, discounts and fractional quantities
	Given a quote request for customer "ACME Labs"
	And the request contains the following items:
		| Item   | Quantity | UnitPrice | Discount |
		| Milk   | 2        | 0.80      | 0        |
		| Cheese | 1.5      | 2.33      | 0        |
		| Bread  | 4        | 1.99      | 0.75     |
	When I submit the quote request
	Then the response status code should be 201
	And the confirmation message should be "Quote created."
	And the quote should contain the following lines:
		| Item   | Quantity | UnitPrice | Discount | DiscountAmount | LineTotal |
		| Milk   | 2        | 0.80      | 0        | 0.00           | 1.60      |
		| Cheese | 1.5      | 2.33      | 0        | 0.00           | 3.495     |
		| Bread  | 4        | 1.99      | 0.75     | 5.97           | 1.99      |
	And the quote total should be 7.085
	And the quote total should equal the sum of its line totals

@AC-05
Scenario: An item sent without a discount is priced without discount
	Given a quote request for customer "ACME Labs"
	And the request contains the following items:
		| Item | Quantity | UnitPrice |
		| Milk | 3        | 0.80      |
	When I submit the quote request
	Then the response status code should be 201
	And the confirmation message should be "Quote created."
	And the quote should contain the following lines:
		| Item | Quantity | UnitPrice | Discount | DiscountAmount | LineTotal |
		| Milk | 3        | 0.80      | 0        | 0.00           | 2.40      |
	And the quote total should be 2.40

@calculation @AC-02 @AC-08
Scenario Outline: Calculate the line price from quantity, unit price and discount - <case>
	Given a quote request for customer "ACME Labs"
	And the request contains the following items:
		| Item    | Quantity   | UnitPrice    | Discount   |
		| Reagent | <quantity> | <unit price> | <discount> |
	When I submit the quote request
	Then the response status code should be 201
	And the confirmation message should be "Quote created."
	And the quote should contain the following lines:
		| Item    | Quantity   | UnitPrice    | Discount   | DiscountAmount    | LineTotal    |
		| Reagent | <quantity> | <unit price> | <discount> | <discount amount> | <line total> |
	And the quote total should be <line total>

	Examples: Typical values
		| case                     | quantity | unit price | discount | discount amount | line total |
		| no discount              | 1        | 10.00      | 0        | 0.00            | 10.00      |
		| 10% discount             | 3        | 10.00      | 0.10     | 3.00            | 27.00      |
		| 25% discount, fractional | 0.5      | 3.20       | 0.25     | 0.40            | 1.20       |
		| 75% discount             | 4        | 1.99       | 0.75     | 5.97            | 1.99       |
		| fractional quantity      | 1.5      | 2.33       | 0        | 0.00            | 3.495      |
		| price with 3 decimals    | 3        | 1.999      | 0        | 0.00            | 5.997      |
		| discount with 3 decimals | 3        | 10.00      | 0.333    | 9.99            | 20.01      |

	# The limits of the valid ranges of AC-12: they are valid and must be accepted.
	Examples: Boundary values that are valid
		| case                      | quantity | unit price | discount | discount amount | line total |
		| smallest discount, 0%     | 2        | 5.00       | 0        | 0.00            | 10.00      |
		| largest discount, 100%    | 2        | 5.00       | 1        | 10.00           | 0.00       |
		| free item, price zero     | 2        | 0.00       | 0        | 0.00            | 0.00       |
		| smallest price, one cent  | 1        | 0.01       | 0        | 0.00            | 0.01       |
		| small fractional quantity | 0.25     | 4.00       | 0        | 0.00            | 1.00       |
		| large quantity and price  | 100000   | 9999.99    | 0        | 0.00            | 999999000  |

# AC-30. A value with many decimals is a classic source of rounding errors: it must come back
# unchanged, and the amounts must be calculated from it exactly.
@AC-30
Scenario Outline: Keep a <field> with many decimals exactly as sent
	Given a quote request for customer "ACME Labs"
	And the request contains the following items:
		| Item    | Quantity   | UnitPrice | Discount   |
		| Reagent | <quantity> | 100.00    | <discount> |
	When I submit the quote request
	Then the response status code should be 201
	And the quote should contain the following lines:
		| Item    | Quantity   | UnitPrice | Discount   | DiscountAmount    | LineTotal    |
		| Reagent | <quantity> | 100.00    | <discount> | <discount amount> | <line total> |
	And the quote total should be <line total>

	Examples:
		| field    | quantity    | discount    | discount amount | line total  |
		| quantity | 1.123456789 | 0           | 0               | 112.3456789 |
		| discount | 1           | 0.123456789 | 12.3456789      | 87.6543211  |

@AC-04
Scenario: Every created quote receives its own identifier
	Given a quote request for customer "ACME Labs"
	And the request contains the following items:
		| Item | Quantity | UnitPrice | Discount |
		| Milk | 2        | 0.80      | 0        |
	When I submit the quote request 2 times
	Then every response status code should be 201
	And every created quote should have a distinct identifier
	And every response should match the "created quote" contract

@AC-07
Scenario Outline: Keep the customer name exactly as sent - <case>
	Given a quote request for customer "<customer>"
	And the request contains the following items:
		| Item | Quantity | UnitPrice | Discount |
		| Milk | 2        | 0.80      | 0        |
	When I submit the quote request
	Then the response status code should be 201
	And the quote should belong to customer "<customer>"

	Examples:
		| case                 | customer                    |
		| apostrophe           | O'Brien & Sons Ltd.         |
		| accented letters     | Açaí Análises Clínicas Ltda |
		| non latin characters | 株式会社ユーロフィン                  |
		| emoji                | Lab 🧪 Partners              |
