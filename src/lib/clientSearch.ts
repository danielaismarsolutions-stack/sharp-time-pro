// Shared, robust client search/matching helpers.
//
// Used by the Clients page and the booking client selector so both behave
// identically when searching by name, email, tags or phone. Centralizing this
// avoids the two places drifting apart (the Clients page used a naive
// case-only, format-sensitive match while the booking modal was smarter).

export interface ClientSearchable {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  tags?: string[] | null;
}

// Lowercase and strip diacritics for accent-insensitive matching
// (so "jose" matches "José").
export const normalizeText = (value: string | null | undefined): string =>
  (value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Keep only digits so phone numbers match regardless of formatting
// (so "600123456" matches "+34 600 123 456").
export const digitsOnly = (value: string | null | undefined): string =>
  (value ?? '').replace(/\D/g, '');

// Normalize a phone to its last 9 digits (Spanish national number length) so a
// number stored with a country prefix ("+34617827908") still matches one saved
// without it ("617827908").
export const phoneKey = (value: string | null | undefined): string => {
  const d = digitsOnly(value);
  return d.length > 9 ? d.slice(-9) : d;
};

// True when two phone numbers refer to the same line, tolerant to formatting
// and country prefixes. Empty/blank phones never match.
export const phonesMatch = (
  a: string | null | undefined,
  b: string | null | undefined,
): boolean => {
  const ka = phoneKey(a);
  return ka.length > 0 && ka === phoneKey(b);
};

// Relevance score for a client against a query. 0 means "no match"; higher is
// a better match. The buckets (best to worst):
//   100  exact phone (prefix/format tolerant: "+34 617 827 908" == "617827908")
//    90  client's phone starts with the queried digits
//    80  queried digits appear somewhere in the phone
//    76  full name equals the query (accent-insensitive)
//    70  name starts with the query
//    64  every query term is the start of a word in the name ("jos gar" → "José García")
//    56  every query term appears somewhere in the name
//    40  terms only found via email/tags
// Phone and text are scored independently and the best bucket wins, so a
// digits-only query still ranks exact numbers above partial ones.
export const clientMatchScore = (
  client: ClientSearchable,
  rawQuery: string,
): number => {
  const query = (rawQuery ?? '').trim();
  if (!query) return 1;

  let phoneScore = 0;
  const queryDigits = digitsOnly(query);
  const clientDigits = digitsOnly(client.phone);
  if (queryDigits.length > 0 && clientDigits.length > 0) {
    const clientKey = phoneKey(client.phone);
    if (clientDigits === queryDigits || clientKey === phoneKey(query)) {
      phoneScore = 100;
    } else if (
      clientKey.startsWith(queryDigits) ||
      clientDigits.startsWith(queryDigits)
    ) {
      phoneScore = 90;
    } else if (
      clientDigits.includes(queryDigits) ||
      queryDigits.includes(clientDigits)
    ) {
      phoneScore = 80;
    }
  }

  let textScore = 0;
  const haystack = normalizeText(
    `${client.name ?? ''} ${client.email ?? ''} ${(client.tags ?? []).join(' ')}`,
  );
  const normQuery = normalizeText(query).replace(/\s+/g, ' ');
  const terms = normQuery.split(' ').filter(Boolean);
  if (terms.length > 0 && terms.every((term) => haystack.includes(term))) {
    const name = normalizeText(client.name).replace(/\s+/g, ' ').trim();
    const nameWords = name.split(' ').filter(Boolean);
    if (name === normQuery) {
      textScore = 76;
    } else if (name.startsWith(normQuery)) {
      textScore = 70;
    } else if (terms.every((term) => nameWords.some((w) => w.startsWith(term)))) {
      textScore = 64;
    } else if (terms.every((term) => name.includes(term))) {
      textScore = 56;
    } else {
      textScore = 40;
    }
  }

  return Math.max(phoneScore, textScore);
};

// Robust client search predicate. Matches when EITHER:
//  - Text: every whitespace-separated term appears (accent-insensitive) somewhere
//    in name/email/tags — so "juan perez" matches "Juan García Pérez".
//  - Phone: the query's digits are a substring of the client's phone (or vice
//    versa), or both share the same national number — so "+34 617", "617 827",
//    "617827908" and "34617827908" all find the client stored as "617827908".
// An empty query matches everything.
export const clientMatchesQuery = (
  client: ClientSearchable,
  rawQuery: string,
): boolean => clientMatchScore(client, rawQuery) > 0;

// Filter + order a client list by relevance to the query: best matches first,
// alphabetical (accent-insensitive) among equals, original order as the final
// tie-break. An empty query returns the list unchanged.
export const rankClients = <T extends ClientSearchable>(
  list: T[],
  rawQuery: string,
): T[] => {
  const query = (rawQuery ?? '').trim();
  if (!query) return [...list];
  return list
    .map((client, index) => ({ client, index, score: clientMatchScore(client, query) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        normalizeText(a.client.name).localeCompare(normalizeText(b.client.name)) ||
        a.index - b.index,
    )
    .map((entry) => entry.client);
};
