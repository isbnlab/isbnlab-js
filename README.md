# ISBNLab JavaScript and TypeScript client

The official JavaScript and TypeScript client for the [ISBNLab book metadata API](https://www.isbnlab.com/api-information). Look up a book by ISBN and get its title, authors, publishers, series, BISAC genres, formats, page count, description and every other edition, from a catalog of more than 100 million editions. It also validates and converts ISBN-10, ISBN-13, EAN and Amazon ASIN.

Typed, with no runtime dependencies: it uses the built-in `fetch` of Node.js 18+, Deno, Bun and browsers. Works with `import` and `require`.

## Install

```bash
npm install isbnlab
```

## Get an API token

[Create a free ISBNLab account](https://www.isbnlab.com/register) and copy your API token from your profile. The Free plan includes 1,000 calls a day; see [pricing](https://www.isbnlab.com/pricing) for more.

## Quick start

```ts
import { BooksApi, Configuration } from 'isbnlab';

const config = new Configuration({ accessToken: process.env.ISBNLAB_API_TOKEN });
const books = new BooksApi(config);

const book = await books.getBookByIsbn('9780765302304');

console.log(book.title);                       // The Gathering Storm
console.log(book.authors?.[0]?.name);          // Robert Jordan
console.log(book.publishDate?.getUTCFullYear());

for (const edition of book.otherEditions ?? []) {
  console.log(edition.isbn13, edition.title);
}
```

Many fields are empty for some books, so every field is optional and may be `null`.

Linked records carry ids you can look up directly (author, publisher, subject and genre lookups need a Standard or Pro plan):

```ts
import { AuthorsApi } from 'isbnlab';

const authorId = book.authors?.[0]?.id;
if (authorId != null) {
  const author = await new AuthorsApi(config).getAuthor(String(authorId));
  console.log(author.bio);
}
```

## Errors

Any response other than 2xx rejects with `ResponseError`. Its `response` is the fetch `Response`, and the body's `detail` explains the reason:

```ts
import { ResponseError } from 'isbnlab';

try {
  await books.getBookByIsbn('9780000000000');
} catch (e) {
  if (!(e instanceof ResponseError)) throw e;

  const { detail } = await e.response.json();
  switch (e.response.status) {
    case 404: console.log('Not in the catalog'); break;
    case 429: console.log('Daily limit reached:', detail); break;
    case 403: console.log('Your plan does not include this endpoint:', detail); break;
    default: throw e;
  }
}
```

A network failure rejects with `FetchError` instead.

## Keep your token out of browser code

Anyone can read a token that is shipped to the browser, so call the API from your server where you can. For tools that can't send headers, the API also accepts a URL key (it starts with `ilq_` and is created on your profile) as a query parameter: `new Configuration({ apiKey: 'ilq_...' })`. It works only for GET requests and anyone who sees the URL can use it, so treat it as visible too.

## What you can call

| Class | Method | Plan |
|---|---|---|
| `BooksApi` | `getBookByIsbn(isbn)`, `getBookByAsin(asin)`, `getBookById(id)` | Free |
| `IsbnApi` | `parseIsbn`, `isbn10ToIsbn13`, `isbn13ToIsbn10`, `isbnToEan`, `eanToIsbn`, `isbnToAsin`, `asinToIsbn` | Free |
| `BooksApi` | `getBookCoverByIsbn(isbn)`, `getBookCoverByAsin(asin)` | Standard |
| `AuthorsApi` | `getAuthor(id)`, `findAuthor(name)` | Standard |
| `PublishersApi` | `getPublisher(id)`, `findPublisher(name)`, `getPublishersByPrefix(prefix)` | Standard |
| `SubjectsApi` | `getSubject(id)`, `findSubject(name)` | Standard |
| `GenresApi` | `getGenre(id)`, `findGenre(nameOrBisacCode)` | Standard |
| `BooksApi` | `searchBooks(query, limit, page, maxResults)` | Pro |
| `BooksApi` | `getEditionsByIsbn(isbn)`, `getEditionsByAsin(asin)` | Pro |

Every method also has a `...Raw()` version that returns the full response, for example to read the rate-limit headers:

```ts
const response = await books.getBookByIsbnRaw({ isbn: '9780765302304' });
console.log(response.raw.headers.get('X-RateLimit-Remaining'));
const book = await response.value();
```

Field-by-field documentation: [API documentation](https://www.isbnlab.com/api-information).

## Development

`src/` is generated from the API's [OpenAPI document](https://www.isbnlab.com/api/docs.jsonopenapi) with [OpenAPI Generator](https://openapi-generator.tech/), so changes to it are made in the generator and arrive with the next release; please open an issue rather than a pull request for that folder. `README.md`, `package.json`, the build configuration and `test/` are maintained by hand.

```bash
npm install
npm run typecheck
npm test
npm run build && npm run test:dist
```

## License

MIT. Maintained by [ISBNLab](https://www.isbnlab.com/), the book metadata API.
