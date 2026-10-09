// Writes the contract defined in the code to the versioned copy, api/openapi.json.
// A deliberate step: changing the contract is a decision, and consumers must be told.
//
// Usage: npm run contract:update

import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { openApiDocument } from '../api/src/openapi';

const file = path.resolve(__dirname, '..', 'api', 'openapi.json');
writeFileSync(file, `${JSON.stringify(openApiDocument, null, 2)}\n`);
console.log(`Contract written to ${file}`);
