@api @create-quote @non-functional @performance
Feature: Create a quote - performance
	As a sales representative
	I want a quote to be created quickly, even a large one or while colleagues create theirs
	So that I can give the customer a price during the conversation

	Acceptance criteria AC-22 to AC-24 (docs/acceptance-criteria.md). The limits are the ones
	stated there. The time is measured by the client, from sending the request to having read the
	whole response, against an API on the same machine: it is a check of the service itself, not
	of a network. These scenarios detect a regression; they are not a load test.

Background:
	Given the Quote API is available

@AC-22
Scenario: A quote with one item is created in under one second
	Given a quote request for customer "ACME Labs"
	And the request contains the following items:
		| Item | Quantity | UnitPrice | Discount |
		| Milk | 2        | 0.80      | 0        |
	When I submit the quote request
	Then the response status code should be 201
	And the quote total should be 1.60
	And the response time should be under 1000 ms

@AC-23
Scenario: A quote with 1000 items is created in under two seconds
	Given a quote request for customer "ACME Labs"
	And the request contains 1000 items of "Reagent" with quantity 2 and unit price 0.50
	When I submit the quote request
	Then the response status code should be 201
	And the confirmation message should be "Quote created."
	And the quote should contain 1000 lines
	And the quote total should be 1000.00
	And the quote total should equal the sum of its line totals
	And the response time should be under 2000 ms

@AC-24
Scenario: 50 quotes requested at the same time are all created, each in under two seconds
	Given a quote request for customer "ACME Labs"
	And the request contains the following items:
		| Item | Quantity | UnitPrice | Discount |
		| Milk | 2        | 0.80      | 0        |
	When I submit the quote request 50 times concurrently
	Then every response status code should be 201
	And every response should match the "created quote" contract
	And every created quote should have a distinct identifier
	And every response time should be under 2000 ms
