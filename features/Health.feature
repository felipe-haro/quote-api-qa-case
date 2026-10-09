@api @health @regression @AC-21
Feature: Health check
	As an operator of the Quote API
	I want to ask the service whether it is up
	So that monitoring can tell a running service from a stopped one

@smoke
Scenario: The service reports that it is up, with the current date and time
	When I check the health of the service
	Then the response status code should be 200
	And the response content type should be "application/json"
	And the service should report the status "up"
	And the service should report the current date and time

@contract
Scenario: The health check follows the contract
	When I check the health of the service
	Then the response status code should be 200
	And the response should match the "health" contract
