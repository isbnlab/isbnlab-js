/* tslint:disable */
/* eslint-disable */
/**
 * Reads the headers the API adds when a response leaves out fields that need a
 * higher plan. A book lookup on a Free or Standard plan, for example, returns
 * otherEditions, previousEdition and nextEdition as null and names them here.
 *
 * Pass the response from a ...Raw() call, a fetch Response, or its Headers:
 *
 *     const response = await books.getBookByIsbnRaw({ isbn: '9780765302304' });
 *     const book = await response.value();
 *
 *     restrictedFields(response); // ['otherEditions', 'previousEdition', 'nextEdition']
 *     upgradeUrl(response);       // 'https://www.isbnlab.com/pricing'
 */

export const PLAN_RESTRICTED_FIELDS_HEADER = 'X-Plan-Restricted-Fields';
export const PLAN_UPGRADE_HEADER = 'X-Plan-Upgrade';

/** Anything that carries response headers: an ApiResponse from a ...Raw() call, a Response, or Headers. */
export type PlanHeadersSource =
    | { raw: { headers: { get(name: string): string | null } } }
    | { headers: { get(name: string): string | null } }
    | { get(name: string): string | null };

function header(source: PlanHeadersSource, name: string): string | null {
    let headers: { get(name: string): string | null };
    if ('raw' in source) {
        headers = source.raw.headers;
    } else if ('headers' in source) {
        headers = source.headers;
    } else {
        headers = source;
    }
    const value = headers.get(name)?.trim();
    return value ? value : null;
}

/** The fields your plan left empty in this response, by their API names, or [] when nothing was left out. */
export function restrictedFields(source: PlanHeadersSource): string[] {
    const value = header(source, PLAN_RESTRICTED_FIELDS_HEADER);
    if (value === null) {
        return [];
    }
    return value.split(',').map((field) => field.trim()).filter((field) => field !== '');
}

/** The page that lists the plans which include the left-out fields, or null when nothing was left out. */
export function upgradeUrl(source: PlanHeadersSource): string | null {
    return header(source, PLAN_UPGRADE_HEADER);
}
