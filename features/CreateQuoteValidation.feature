@api @create-quote @validation @negative @regression
Feature: Create a quote - input validation
	As a sales representative
	I want invalid quote requests to be refused with a clear reason
	So that no quote is ever created with missing, impossible or malformed data

	Acceptance criteria AC-09 to AC-15, AC-17, AC-18 and AC-29 (docs/acceptance-criteria.md).
	Scenarios tagged @known-bug state a criterion the API does not meet: they fail today and
	run in the "known-bugs" project, outside the blocking run.

	Special values used in the tables:
	  [omitted] = the field is not sent at all
	  [null]    = the field is sent as JSON null
	  [empty]   = the field is sent as an empty string
	  [blank]   = the field is sent with whitespace only

Background:
	Given the Quote API is available

@AC-09
Scenario Outline: Reject a quote request without a valid customer - <case>
	Given a quote request for customer "<customer>"
	And the request contains the following items:
		| Item | Quantity | UnitPrice | Discount |
		| Milk | 2        | 0.80      | 0        |
	When I submit the quote request
	Then the response status code should be 400
	And the response should be a validation problem mentioning "customer"

	Examples:
		| case                | customer  |
		| customer is missing | [omitted] |
		| customer is null    | [null]    |
		| customer is empty   | [empty]   |
		| customer is blank   | [blank]   |

@AC-10
Scenario: Reject a quote request with an empty item list
	Given a quote request for customer "ACME Labs"
	And the request contains no items
	When I submit the quote request
	Then the response status code should be 400
	And the response should be a validation problem mentioning "items"

@AC-10
Scenario: Reject a quote request without the items field
	Given a quote request for customer "ACME Labs"
	And the request does not include the items field
	When I submit the quote request
	Then the response status code should be 400
	And the response should be a validation problem mentioning "items"

@AC-10
Scenario: Reject a quote request where the items field is null
	Given a quote request for customer "ACME Labs"
	And the request items field is null
	When I submit the quote request
	Then the response status code should be 400
	And the response should be a validation problem mentioning "items"

@AC-11
Scenario Outline: Reject a quote request with an item without a name - <case>
	Given a quote request for customer "ACME Labs"
	And the request contains the following items:
		| Item   | Quantity | UnitPrice | Discount |
		| Milk   | 2        | 0.80      | 0        |
		| <item> | 1        | 1.00      | 0        |
	When I submit the quote request
	Then the response status code should be 400
	And the response should be a validation problem mentioning "items[1].item"

	Examples:
		| case              | item      |
		| item name missing | [omitted] |
		| item name null    | [null]    |
		| item name empty   | [empty]   |
		| item name blank   | [blank]   |

@AC-13
Scenario: Reject an empty request body
	When I submit an empty body with content type "application/json"
	Then the response status code should be 400
	And the response should be a validation problem

@AC-13
Scenario: Reject a malformed JSON request body
	When I submit the following raw body with content type "application/json":
		"""
		{ "customer": "ACME Labs", "items": [ { "item": "Milk", "quantity": 2
		"""
	Then the response status code should be 400
	And the response should be a validation problem

@AC-13
Scenario Outline: Reject a request body that is valid JSON but not a quote request - <case>
	When I submit the following raw body with content type "application/json":
		"""
		<body>
		"""
	Then the response status code should be 400
	And the response should be a validation problem

	Examples:
		| case        | body        |
		| JSON null   | null        |
		| JSON array  | []          |
		| JSON string | "ACME Labs" |
		| JSON number | 42          |

# Field types come from the contract (api/openapi.json): customer and item are strings, items is an
# array, quantity, unitPrice and discount are numbers.
@AC-14
Scenario Outline: Reject a quote request with a field of the wrong type - <case>
	When I submit the following raw body with content type "application/json":
		"""
		<body>
		"""
	Then the response status code should be 400
	And the response should be a validation problem mentioning "<field>"

	Examples:
		| case                  | field     | body                                                                                                |
		| customer is a number  | customer  | {"customer": 123, "items": [{"item": "Milk", "quantity": 2, "unitPrice": 0.80}]}                    |
		| customer is an object | customer  | {"customer": {"name": "ACME Labs"}, "items": [{"item": "Milk", "quantity": 2, "unitPrice": 0.80}]}  |
		| items is an object    | items     | {"customer": "ACME Labs", "items": {"item": "Milk", "quantity": 2, "unitPrice": 0.80}}              |
		| items is a string     | items     | {"customer": "ACME Labs", "items": "Milk"}                                                          |
		| item name is a number | item      | {"customer": "ACME Labs", "items": [{"item": 7, "quantity": 2, "unitPrice": 0.80}]}                 |
		| quantity is text      | quantity  | {"customer": "ACME Labs", "items": [{"item": "Milk", "quantity": "two", "unitPrice": 0.80}]}        |
		| quantity is null      | quantity  | {"customer": "ACME Labs", "items": [{"item": "Milk", "quantity": null, "unitPrice": 0.80}]}         |
		| quantity is a boolean | quantity  | {"customer": "ACME Labs", "items": [{"item": "Milk", "quantity": true, "unitPrice": 0.80}]}         |
		| unit price is text    | unitPrice | {"customer": "ACME Labs", "items": [{"item": "Milk", "quantity": 2, "unitPrice": "cheap"}]}         |
		| unit price is null    | unitPrice | {"customer": "ACME Labs", "items": [{"item": "Milk", "quantity": 2, "unitPrice": null}]}            |
		| unit price is a list  | unitPrice | {"customer": "ACME Labs", "items": [{"item": "Milk", "quantity": 2, "unitPrice": [0.80]}]}          |
		| discount is text      | discount  | {"customer": "ACME Labs", "items": [{"item": "Milk", "quantity": 2, "unitPrice": 0.80, "discount": "10%"}]} |

# The contract accepts only application/json and application/*+json.
@AC-15
Scenario Outline: Reject a request body sent with an unsupported content type - <case>
	When I submit the following raw body with content type "<content type>":
		"""
		<body>
		"""
	Then the response status code should be 415
	And the response content type should be "application/problem+json"
	And the response should match the "problem details" contract

	Examples:
		| case           | content type                      | body                                          |
		| plain text     | text/plain                        | customer=ACME Labs;item=Milk;quantity=2       |
		| XML            | application/xml                   | <quote><customer>ACME Labs</customer></quote> |
		| form           | application/x-www-form-urlencoded | customer=ACME+Labs&item=Milk&quantity=2       |
		| JSON as binary | application/octet-stream          | {"customer": "ACME Labs", "items": []}        |

@AC-18
Scenario: A rejected request does not prevent the next valid request from being accepted
	Given a quote request for customer "[empty]"
	And the request contains the following items:
		| Item | Quantity | UnitPrice | Discount |
		| Milk | 2        | 0.80      | 0        |
	When I submit the quote request
	Then the response status code should be 400
	Given a quote request for customer "ACME Labs"
	When I submit the quote request
	Then the response status code should be 201
	And the quote should belong to customer "ACME Labs"
	And the quote total should be 1.60

# AC-12. A quote must describe something that can be sold: a positive quantity, a price that is not
# negative and a discount between 0% and 100%. The contract declares these ranges; the API does not
# check them, and creates quotes with negative, zero or inflated totals.
@AC-12 @known-bug
Scenario Outline: Reject a quote request with <case>
	Given a quote request for customer "ACME Labs"
	And the request contains the following items:
		| Item    | Quantity   | UnitPrice    | Discount   |
		| Reagent | <quantity> | <unit price> | <discount> |
	When I submit the quote request
	Then the response status code should be 400

	Examples: Values that are impossible
		| case                  | quantity | unit price | discount |
		| a negative quantity   | -2       | 0.80       | 0        |
		| a negative unit price | 2        | -0.80      | 0        |
		| a negative discount   | 2        | 10.00      | -0.5     |
		| a discount above 100% | 2        | 10.00      | 1.5      |

	Examples: Boundary values that are not valid
		| case                       | quantity | unit price | discount |
		| a zero quantity            | 0        | 10.00      | 0        |
		| a quantity just below zero | -0.01    | 10.00      | 0        |
		| a price just below zero    | 1        | -0.01      | 0        |
		| a discount just below 0%   | 1        | 10.00      | -0.01    |
		| a discount just above 100% | 1        | 10.00      | 1.01     |

# AC-12. Quantity and unit price are required by the contract. Today a missing quantity is read as 1
# and a missing unit price as 0, and the quote is created.
@AC-12 @known-bug
Scenario Outline: Reject a quote request with an item without <field>
	When I submit the following raw body with content type "application/json":
		"""
		<body>
		"""
	Then the response status code should be 400

	Examples:
		| field        | body                                                                      |
		| a quantity   | {"customer": "ACME Labs", "items": [{"item": "Milk", "unitPrice": 0.80}]} |
		| a unit price | {"customer": "ACME Labs", "items": [{"item": "Milk", "quantity": 2}]}     |

# AC-14. Today: HTTP 500, because the entry is used without being checked.
@AC-14 @known-bug
Scenario: Reject a quote request with a null entry in the item list
	When I submit the following raw body with content type "application/json":
		"""
		{"customer": "ACME Labs", "items": [null]}
		"""
	Then the response status code should be 400

# AC-14. A number too large to be represented is read as infinity. Today the quote is created with
# amounts that cannot be written in JSON, so they come back as null.
@AC-14 @known-bug
Scenario Outline: Reject a quote request with <case>
	When I submit the following raw body with content type "application/json":
		"""
		{"customer": "ACME Labs", "items": [{"item": "Milk", "quantity": <quantity>, "unitPrice": 0.80, "discount": <discount>}]}
		"""
	Then the response status code should be 400

	Examples:
		| case                    | quantity | discount |
		| a quantity out of range | 1e999    | 0        |
		| a discount out of range | 2        | 1e999    |

# AC-14. The contract declares these fields as numbers. Today a number sent as text is accepted.
@AC-14 @known-bug
Scenario: Reject a quote request with numbers sent as text
	When I submit the following raw body with content type "application/json":
		"""
		{"customer": "ACME Labs", "items": [{"item": "Milk", "quantity": "2", "unitPrice": "0.80"}]}
		"""
	Then the response status code should be 400

# AC-17. The contract declares "additionalProperties": false. Today unknown fields are ignored, so a
# misspelled field (for example "discont" for "discount") silently loses its value.
@AC-17 @known-bug
Scenario Outline: Reject a quote request with a field that is not in the contract - <case>
	When I submit the following raw body with content type "application/json":
		"""
		<body>
		"""
	Then the response status code should be 400

	Examples:
		| case                       | body                                                                                                          |
		| unknown field in the quote | {"customer": "ACME Labs", "priority": "high", "items": [{"item": "Milk", "quantity": 2, "unitPrice": 0.80}]}   |
		| unknown field in an item   | {"customer": "ACME Labs", "items": [{"item": "Milk", "quantity": 2, "unitPrice": 0.80, "sku": "M-1"}]}        |
		| misspelled discount field  | {"customer": "ACME Labs", "items": [{"item": "Milk", "quantity": 2, "unitPrice": 0.80, "discont": 0.5}]}      |

# AC-29. JSON numbers use a dot. A comma is common in many countries (32,44) and must never be
# guessed: it is refused, whether it is written as a number or as text.
@AC-29
Scenario Outline: Reject a decimal comma - <case>
	When I submit the following raw body with content type "application/json":
		"""
		<body>
		"""
	Then the response status code should be 400
	And the response should be a validation problem

	Examples:
		| case              | body                                                                                                      |
		| price as a number | {"customer": "ACME Labs", "items": [{"item": "Milk", "quantity": 1, "unitPrice": 32,44}]}                 |
		| price as text     | {"customer": "ACME Labs", "items": [{"item": "Milk", "quantity": 1, "unitPrice": "32,44"}]}               |
		| quantity as text  | {"customer": "ACME Labs", "items": [{"item": "Milk", "quantity": "1,5", "unitPrice": 33.54}]}             |
		| discount as text  | {"customer": "ACME Labs", "items": [{"item": "Milk", "quantity": 1, "unitPrice": 55.12, "discount": "0,5"}]} |
