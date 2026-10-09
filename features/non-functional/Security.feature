@api @create-quote @non-functional @security
Feature: Create a quote - security
	As the owner of the Quote API
	I want the service to treat every request as untrusted and to reveal nothing about itself
	So that it cannot be abused, and an error never helps an attacker

	Acceptance criteria AC-25 to AC-28 (docs/acceptance-criteria.md).
	Scenarios tagged @known-bug state a criterion the API does not meet: they fail today and
	run in the "known-bugs" project, outside the blocking run.

Background:
	Given the Quote API is available

@AC-25
Scenario Outline: A refused request reveals nothing about the implementation - <case>
	When I submit the following raw body with content type "<content type>":
		"""
		<body>
		"""
	Then the response status code should be <status>
	And the response body should not expose implementation details

	Examples:
		| case                     | content type     | status | body                                                                                         |
		| missing customer         | application/json | 400    | {"items": []}                                                                                |
		| malformed JSON           | application/json | 400    | {"customer": "ACME Labs", "items": [                                                         |
		| quantity sent as text    | application/json | 400    | {"customer": "ACME Labs", "items": [{"item": "Milk", "quantity": "two", "unitPrice": 0.80}]} |
		| unsupported content type | text/plain       | 415    | customer=ACME Labs;item=Milk;quantity=2                                                      |

# Today the answer is HTTP 500 with the full stack trace and the source file paths.
@AC-25 @known-bug
Scenario: A request that makes the service fail reveals nothing about the implementation
	When I submit the following raw body with content type "application/json":
		"""
		{"customer": "ACME Labs", "items": [null]}
		"""
	Then the response body should not expose implementation details

# Text that looks like markup or a command is data: it is returned unchanged, as JSON, never run.
@AC-26
Scenario Outline: Text that looks like code is handled as plain data - <case>
	Given a quote request for customer "<text>"
	And the request contains the following items:
		| Item   | Quantity | UnitPrice | Discount |
		| <text> | 2        | 0.80      | 0        |
	When I submit the quote request
	Then the response status code should be 201
	And the response content type should be "application/json"
	And the quote should belong to customer "<text>"
	And the quote should contain the following lines:
		| Item   | Quantity | UnitPrice | Discount | DiscountAmount | LineTotal |
		| <text> | 2        | 0.80      | 0        | 0.00           | 1.60      |

	Examples:
		| case             | text                         |
		| HTML script      | <script>alert(1)</script>    |
		| HTML image error | <img src=x onerror=alert(1)> |
		| SQL injection    | '; DROP TABLE Quotes;--      |
		| SQL always true  | ' OR '1'='1                  |
		| path traversal   | ../../../etc/passwd          |
		| template         | ${7*7} {{7*7}}               |

# The contract limits the body to 1 MB (response 413). Today the service reads a body of any size.
@AC-27 @known-bug
Scenario: Refuse a request body larger than 1 MB
	Given a quote request for a customer with a name of 1100000 characters
	And the request contains the following items:
		| Item | Quantity | UnitPrice | Discount |
		| Milk | 2        | 0.80      | 0        |
	When I submit the quote request
	Then the response status code should be 413

# Today every response carries "X-Powered-By" with the name and version of the software.
@AC-28 @known-bug
Scenario: A response does not name the software that produced it
	When I check the health of the service
	Then the response status code should be 200
	And the response should not have a "X-Powered-By" header
	And the response should not have a "Server" header
