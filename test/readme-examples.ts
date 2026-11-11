// The README's examples, type-checked by `npm run typecheck` (never run).
import { AuthorsApi, BooksApi, Configuration, ResponseError } from '../src';

const config = new Configuration({ accessToken: process.env.ISBNLAB_API_TOKEN });
const books = new BooksApi(config);

const book = await books.getBookByIsbn('9780765302304');

console.log(book.title);
console.log(book.authors?.[0]?.name);
console.log(book.publishDate?.getUTCFullYear());

for (const edition of book.otherEditions ?? []) {
  console.log(edition.isbn13, edition.title);
}

const authorId = book.authors?.[0]?.id;
if (authorId != null) {
  const author = await new AuthorsApi(config).getAuthor(String(authorId));
  console.log(author.bio);
}

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

new Configuration({ apiKey: 'ilq_...' });

const response = await books.getBookByIsbnRaw({ isbn: '9780765302304' });
console.log(response.raw.headers.get('X-RateLimit-Remaining'));
await response.value();
