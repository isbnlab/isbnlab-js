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

console.log(book.otherEditionsCount, 'other editions');
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

## Several books at once

`getBooksByIsbns()` looks up several ISBN-10s or ISBN-13s in one request: up to 25 on Standard, 100 on Pro and 500 on Business. Each ISBN counts as one call toward your daily limit.

```ts
const found = await books.getBooksByIsbns({
  isbns: ['9780765302304', '0-7653-1756-7'],
});

for (const book of found) {
  console.log(book.isbn13, book.title);
}
```

The books come back in the order asked, once each, and an ISBN the catalog lacks is left out, so match results by ISBN rather than by position. One invalid ISBN, or more ISBNs than your plan allows, refuses the whole request with a 400; the Free plan gets a 403.

`otherEditions` is empty in a batch unless the request includes it (`include: ['otherEditions']`), which needs Pro or above; `otherEditionsCount` is always set. With it, a large batch of popular books can run to tens of megabytes.

## Fields that depend on your plan

A book lookup lists the other editions (`otherEditions`, `previousEdition`, `nextEdition`) on the Pro plan. On the Free and Standard plans those fields are empty, `otherEditionsCount` still gives the number of other editions, and two response headers name what was left out: `X-Plan-Restricted-Fields` lists the fields and `X-Plan-Upgrade` links to the plans. `restrictedFields()` and `upgradeUrl()` read them from a `...Raw()` call:

```ts
import { restrictedFields, upgradeUrl } from 'isbnlab';

const response = await books.getBookByIsbnRaw({ isbn: '9780765302304' });
const full = await response.value();

if (restrictedFields(response).includes('otherEditions')) {
  console.log(full.otherEditionsCount, 'other editions; see', upgradeUrl(response));
} else {
  for (const edition of full.otherEditions ?? []) {
    console.log(edition.isbn13, edition.title);
  }
}
```

`restrictedFields(response)` returns every field that was left out, for example `['otherEditions', 'previousEdition', 'nextEdition']`, or `[]` when the response is complete. It also accepts a fetch `Response` or `Headers`.

A cover lookup (Standard or Pro) gives each cover image's URL in `covers`, and in `sizes` the same image 200, 400 and 800 pixels wide (`w200`, `w400`, `w800`); a width is empty when that size is not available.

```ts
const cover = await books.getBookCoverByIsbn('9780765302304');
console.log(cover.sizes?.[0]?.w400); // https://covers.isbnlab.com/w400/9780765302304.jpg
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
| `BooksApi` | `getBooksByIsbns(request)`: up to 25 ISBNs on Standard, 100 on Pro, 500 on Business | Standard |
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
