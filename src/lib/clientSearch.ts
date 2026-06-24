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
): boolean => {
  const query = (rawQuery ?? '').trim();
  if (!query) return true;

  const queryDigits = digitsOnly(query);
  const clientDigits = digitsOnly(client.phone);
  const phoneMatch =
    queryDigits.length > 0 &&
    clientDigits.length > 0 &&
    (clientDigits.includes(queryDigits) ||
      queryDigits.includes(clientDigits) ||
      phoneKey(client.phone) === phoneKey(query));

  const haystack = normalizeText(
    `${client.name ?? ''} ${client.email ?? ''} ${(client.tags ?? []).join(' ')}`,
  );
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  const textMatch = terms.length > 0 && terms.every((term) => haystack.includes(term));

  return textMatch || phoneMatch;
};
