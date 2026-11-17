// The CommonJS build loads with require() and exposes the client.
const assert = require('node:assert');
const isbnlab = require('isbnlab');

assert.strictEqual(typeof isbnlab.BooksApi, 'function');
assert.deepStrictEqual(isbnlab.restrictedFields(new Headers({ 'X-Plan-Restricted-Fields': 'otherEditions' })), ['otherEditions']);
assert.strictEqual(new isbnlab.Configuration().basePath, 'https://www.isbnlab.com');
console.log('CommonJS build OK');
