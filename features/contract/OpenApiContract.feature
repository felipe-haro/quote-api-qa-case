@api @contract @openapi @AC-20
Feature: OpenAPI contract
	As a consumer of the Quote API
	I want the contract published by the API to be the one that was agreed and versioned
	So that an added, removed or changed operation or field is noticed before it is released

	The versioned contract is api/openapi.json. The API publishes the contract defined in its code
	at GET /openapi.json.

Scenario: The published OpenAPI document is the versioned contract
	When I request the published OpenAPI document
	Then the published OpenAPI document should equal the versioned contract
