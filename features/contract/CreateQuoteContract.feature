@api @contract @create-quote @AC-19
Feature: Create a quote - response contract
	As a consumer of the Quote API
	I want every response of the quotes operation to keep its agreed shape
	So that a change in the API never breaks my integration silently

	The contracts are the schemas in schemas/quote-api.schema.ts, written from the contract of the
	API (api/openapi.json): field names, types, formats, enum values and nullability. These
	scenarios check the shape of the responses; the values (prices, discounts, totals) are checked
	by the "Create a quote" feature.

Background:
	Given the Quote API is available

@smoke
Scenario: A created quote follows the contract
	Given a quote request for customer "ACME Labs"
	And the request contains the following items:
		| Item | Quantity | UnitPrice | Discount |
		| Milk | 2        | 0.80      | 0        |
	When I submit the quote request
	Then the response status code should be 201
	And the response content type should be "application/json"
	And the response should match the "created quote" contract

Scenario: A created quote with several lines, discounts and fractional values follows the contract
	Given a quote request for customer "ACME Labs"
	And the request contains the following items:
		| Item   | Quantity | UnitPrice | Discount |
		| Milk   | 2        | 0.80      | 0        |
		| Cheese | 1.5      | 2.33      | 0        |
		| Bread  | 4        | 1.99      | 0.75     |
		| Gift   | 1        | 5.00      | 1        |
	When I submit the quote request
	Then the response status code should be 201
	And the response content type should be "application/json"
	And the response should match the "created quote" contract

Scenario: A request refused for missing data follows the validation problem contract
	Given a quote request for customer "[omitted]"
	And the request contains no items
	When I submit the quote request
	Then the response status code should be 400
	And the response content type should be "application/problem+json"
	And the response should match the "validation problem" contract

Scenario: A request refused for a wrong type follows the validation problem contract
	When I submit the following raw body with content type "application/json":
		"""
		{"customer": "ACME Labs", "items": [{"item": "Milk", "quantity": "two", "unitPrice": 0.80}]}
		"""
	Then the response status code should be 400
	And the response content type should be "application/problem+json"
	And the response should match the "validation problem" contract

Scenario: A malformed request follows the validation problem contract
	When I submit the following raw body with content type "application/json":
		"""
		{ "customer": "ACME Labs", "items": [
		"""
	Then the response status code should be 400
	And the response content type should be "application/problem+json"
	And the response should match the "validation problem" contract

Scenario: A request with an unsupported content type follows the problem details contract
	When I submit the following raw body with content type "text/plain":
		"""
		customer=ACME Labs;item=Milk;quantity=2
		"""
	Then the response status code should be 415
	And the response content type should be "application/problem+json"
	And the response should match the "problem details" contract

# Request contract: the content types the contract accepts for the request body.
@AC-15
Scenario Outline: The quotes operation accepts the content type <content type>
	When I submit the following raw body with content type "<content type>":
		"""
		{"customer": "ACME Labs", "items": [{"item": "Milk", "quantity": 2, "unitPrice": 0.80, "discount": 0}]}
		"""
	Then the response status code should be 201
	And the response should match the "created quote" contract

	Examples:
		| content type                    |
		| application/json                |
		| application/json; charset=utf-8 |
		| application/vnd.quote+json      |
