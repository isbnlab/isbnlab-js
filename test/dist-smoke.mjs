// The ES module build loads with import and exposes the client.
import assert from 'node:assert';
import { BooksApi, Configuration, ResponseError } from 'isbnlab';

assert.strictEqual(typeof BooksApi, 'function');
assert.strictEqual(typeof ResponseError, 'function');
assert.strictEqual(new Configuration().basePath, 'https://www.isbnlab.com');
console.log('ES module build OK');
