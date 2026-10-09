@api @negative @regression @protocol @AC-16
Feature: Quote API - HTTP protocol
	As a consumer of the Quote API
	I want requests to operations that do not exist to be refused in the standard HTTP way
	So that a wrong integration is noticed immediately

	The API has two operations (api/openapi.json): GET /api/health and POST /api/quotes.
	A 405 response lists the supported methods in the Allow header (RFC 9110, section 15.5.6).

Scenario Outline: Refuse the <method> method on the quotes operation
	When I send a <method> request to "/api/quotes"
	Then the response status code should be 405
	And the response should allow only the POST method

	Examples:
		| method |
		| GET    |
		| PUT    |
		| PATCH  |
		| DELETE |

Scenario Outline: Refuse the <method> method on the health check
	When I send a <method> request to "/api/health"
	Then the response status code should be 405
	And the response should allow only the GET method

	Examples:
		| method |
		| POST   |
		| PUT    |
		| DELETE |

Scenario Outline: Answer not found for <method> <path>
	When I send a <method> request to "<path>"
	Then the response status code should be 404
	And the response should have no body

	Examples:
		| method | path                                             |
		| GET    | /                                                |
		| GET    | /api                                             |
		| POST   | /api/quote                                       |
		| GET    | /api/quotes/unknown                              |
		| GET    | /api/quotes/00000000-0000-0000-0000-000000000000 |
