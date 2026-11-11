import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AuthorsApi,
  BooksApi,
  Configuration,
  GenresApi,
  IsbnApi,
  PublishersApi,
  ResponseError,
  SubjectsApi,
} from '../src';

/**
 * Each client method against a mocked fetch: the request it sends and the typed
 * result it returns. Fixtures are the API documentation's example responses, in
 * plain JSON (the same files as the PHP client's tests).
 */

type Call = { url: URL; init: RequestInit };

function fixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', name), 'utf8');
}

function mock(body: string, status = 200, contentType = 'application/json') {
  const calls: Call[] = [];
  const config = new Configuration({
    accessToken: 'test-token',
    fetchApi: async (input, init) => {
      calls.push({ url: new URL(String(input)), init: init ?? {} });
      return new Response(body, { status, headers: { 'Content-Type': contentType } });
    },
  });

  return { config, calls };
}

function expectRequest(call: Call | undefined, path: string, query?: string): void {
  expect(call).toBeDefined();
  const { url, init } = call!;
  const headers = init.headers as Record<string, string>;
  expect(init.method).toBe('GET');
  expect(url.origin).toBe('https://www.isbnlab.com');
  expect(url.pathname).toBe(path);
  if (query !== undefined) {
    expect(url.search).toBe(query);
  }
  expect(headers.Authorization).toBe('Bearer test-token');
  expect(headers.Accept).toBe('application/json');
}

async function rejection(promise: Promise<unknown>): Promise<ResponseError> {
  try {
    await promise;
  } catch (e) {
    expect(e).toBeInstanceOf(ResponseError);
    return e as ResponseError;
  }
  throw new Error('Expected a ResponseError.');
}

describe('BooksApi', () => {
  it('gets a book by ISBN', async () => {
    const { config, calls } = mock(fixture('book.json'));
    const book = await new BooksApi(config).getBookByIsbn('9780765302304');

    expectRequest(calls[0], '/api/book/isbn/9780765302304');
    expect(book.title).toBe('The Gathering Storm');
    expect(book.id).toBe(15596406);
    expect(book.isbn13).toBe('9780765302304');
    expect(book.authors?.[0]?.name).toBe('Robert Jordan');
    expect(book.publishDate).toBeInstanceOf(Date);
    expect(book.publishDate?.getUTCFullYear()).toBe(2009);
    expect(book.series?.name).toBe('Wheel of time');
    expect(book.series?.number).toBe(12);
    expect(book.series?.nextBook?.isbn13).toBe('9780356503950');
    expect(book.otherEditions?.length).toBeGreaterThan(0);
    expect(book.otherEditions?.[0]?.isbn13).toMatch(/^97[89]\d{10}$/);
    expect(book.isbnModel?.isbn13).toBe('9780765302304');
  });

  it('loads a book with most fields empty', async () => {
    const { config } = mock(fixture('book-sparse.json'));
    const book = await new BooksApi(config).getBookByIsbn('9780000000002');

    expect(book.title).toBe('A Sparse Book');
    expect(book.ratings ?? null).toBeNull();
    expect(book.contributors ?? null).toBeNull();
    expect(book.publishDate ?? null).toBeNull();
    expect(book.authors).toEqual([]);
  });

  it('sends the search paging parameters', async () => {
    const { config, calls } = mock(fixture('book-search.json'));
    const books = await new BooksApi(config).searchBooks('gathering storm', 5, 2);

    expectRequest(calls[0], '/api/search/book/gathering%20storm', '?limit=5&page=2');
    expect(books.length).toBeGreaterThan(0);
    expect(typeof books[0]?.title).toBe('string');
  });

  it('gets covers and other editions', async () => {
    const covers = mock(fixture('book-cover.json'));
    const cover = await new BooksApi(covers.config).getBookCoverByIsbn('9780765302304');
    expectRequest(covers.calls[0], '/api/book/cover/isbn/9780765302304');
    expect(cover.covers?.[0]).toMatch(/^https:\/\//);

    const editions = mock(fixture('book-editions.json'));
    const result = await new BooksApi(editions.config).getEditionsByIsbn('9780765302304');
    expectRequest(editions.calls[0], '/api/editions/isbn/9780765302304');
    expect(result.otherEditions?.length).toBeGreaterThan(0);
  });
});

describe('authors, publishers, subjects and genres', () => {
  it('finds an author, with photos as objects', async () => {
    const { config, calls } = mock(fixture('author.json'));
    const author = await new AuthorsApi(config).findAuthor('Robert Jordan');

    expectRequest(calls[0], '/api/author/search/Robert%20Jordan');
    expect(author.name).toBe('Robert Jordan');
    expect(author.photos?.[0]?.width).toBe(330);
    expect(author.photos?.[0]?.url).toMatch(/^https:\/\//);
  });

  it('gets an author by id', async () => {
    const { config, calls } = mock(fixture('author.json'));
    await new AuthorsApi(config).getAuthor('12');

    expectRequest(calls[0], '/api/author/12');
  });

  it('gets publishers by prefix, a subject and a genre', async () => {
    const publishers = mock(fixture('publishers-by-prefix.json'));
    const list = await new PublishersApi(publishers.config).getPublishersByPrefix('978-0-7653');
    expectRequest(publishers.calls[0], '/api/publisher/prefix/978-0-7653');
    expect(list.length).toBeGreaterThan(0);
    expect(typeof list[0]?.name).toBe('string');

    const subjects = mock(fixture('subject.json'));
    const subject = await new SubjectsApi(subjects.config).getSubject('1');
    expectRequest(subjects.calls[0], '/api/subject/1');
    expect(subject.name).toBeTruthy();

    const genres = mock(fixture('genre.json'));
    const genre = await new GenresApi(genres.config).findGenre('FIC009000');
    expectRequest(genres.calls[0], '/api/genre/search/FIC009000');
    expect(genre.bisacCode).toBeTruthy();
  });
});

describe('IsbnApi', () => {
  it('converts an ISBN-10 to ISBN-13', async () => {
    const { config, calls } = mock(fixture('isbn-details.json'));
    const details = await new IsbnApi(config).isbn10ToIsbn13('0765302306');

    expectRequest(calls[0], '/api/isbn/isbn10-to-isbn13/0765302306');
    expect(details.isbn13).toBe('9780765302304');
  });
});

describe('errors', () => {
  it.each([
    [404, 'Not Found'],
    [403, 'This endpoint needs a Standard or Pro plan.'],
    [429, 'Daily limit reached.'],
  ])('a %i response throws ResponseError with its status and detail', async (status, detail) => {
    const { config } = mock(JSON.stringify({ title: 'An error occurred', detail, status }), status, 'application/problem+json');

    const error = await rejection(new BooksApi(config).getBookByIsbn('9780000000000'));
    expect(error.response.status).toBe(status);
    expect((await error.response.json()).detail).toBe(detail);
  });

  it('sends a URL key as the access_token query parameter when given one', async () => {
    const calls: Call[] = [];
    const config = new Configuration({
      apiKey: 'ilq_example',
      fetchApi: async (input, init) => {
        calls.push({ url: new URL(String(input)), init: init ?? {} });
        return new Response(fixture('book.json'), { headers: { 'Content-Type': 'application/json' } });
      },
    });

    await new BooksApi(config).getBookByIsbn('9780765302304');
    expect(calls[0]?.url.searchParams.get('access_token')).toBe('ilq_example');
    expect((calls[0]?.init.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});
