// The README's examples, type-checked by `npm run typecheck` (never run).
import { AuthorsApi, BooksApi, Configuration, ResponseError, restrictedFields, upgradeUrl } from '../src';

const config = new Configuration({ accessToken: process.env.ISBNLAB_API_TOKEN });
const books = new BooksApi(config);

const book = await books.getBookByIsbn('9780765302304');

console.log(book.title);
console.log(book.authors?.[0]?.name);
console.log(book.publishDate?.getUTCFullYear());

console.log(book.otherEditionsCount, 'other editions');

const authorId = book.authors?.[0]?.id;
if (authorId != null) {
  const author = await new AuthorsApi(config).getAuthor(String(authorId));
  console.log(author.bio);
}

{
  const response = await books.getBookByIsbnRaw({ isbn: '9780765302304' });
  const full = await response.value();

  if (restrictedFields(response).includes('otherEditions')) {
    console.log(full.otherEditionsCount, 'other editions; see', upgradeUrl(response));
  } else {
    for (const edition of full.otherEditions ?? []) {
      console.log(edition.isbn13, edition.title);
    }
  }

  const cover = await books.getBookCoverByIsbn('9780765302304');
  console.log(cover.sizes?.[0]?.w400);
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
