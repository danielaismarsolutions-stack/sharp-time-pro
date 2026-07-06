import { describe, it, expect } from 'vitest';
import {
  clientMatchesQuery,
  clientMatchScore,
  phonesMatch,
  phoneKey,
  rankClients,
} from './clientSearch';

const client = {
  name: 'José García Pérez',
  phone: '617827908',
  email: 'jose@example.com',
  tags: ['VIP'],
};

describe('clientMatchesQuery', () => {
  it('matches everything on empty query', () => {
    expect(clientMatchesQuery(client, '')).toBe(true);
    expect(clientMatchesQuery(client, '   ')).toBe(true);
  });

  it('matches by name accent-insensitively', () => {
    expect(clientMatchesQuery(client, 'jose')).toBe(true);
    expect(clientMatchesQuery(client, 'José')).toBe(true);
    expect(clientMatchesQuery(client, 'JOSE')).toBe(true);
  });

  it('matches multi-word out-of-order name fragments', () => {
    expect(clientMatchesQuery(client, 'garcia perez')).toBe(true);
    expect(clientMatchesQuery(client, 'perez jose')).toBe(true);
  });

  it('matches by email and tag', () => {
    expect(clientMatchesQuery(client, 'example.com')).toBe(true);
    expect(clientMatchesQuery(client, 'vip')).toBe(true);
  });

  it('matches by phone regardless of formatting or country prefix', () => {
    expect(clientMatchesQuery(client, '617827908')).toBe(true);
    expect(clientMatchesQuery(client, '617 827 908')).toBe(true);
    expect(clientMatchesQuery(client, '+34 617 827 908')).toBe(true);
    expect(clientMatchesQuery(client, '34617827908')).toBe(true);
  });

  it('matches partial phone fragments', () => {
    expect(clientMatchesQuery(client, '617')).toBe(true);
    expect(clientMatchesQuery(client, '7908')).toBe(true);
  });

  it('matches a client stored WITH a prefix against a plain query', () => {
    const prefixed = { ...client, phone: '+34 617 827 908' };
    expect(clientMatchesQuery(prefixed, '617827908')).toBe(true);
  });

  it('does not match unrelated queries', () => {
    expect(clientMatchesQuery(client, 'pedro')).toBe(false);
    expect(clientMatchesQuery(client, '999999999')).toBe(false);
  });

  it('handles missing/blank fields without throwing', () => {
    const sparse = { name: 'Ana', phone: '', email: null, tags: null };
    expect(clientMatchesQuery(sparse, 'ana')).toBe(true);
    expect(clientMatchesQuery(sparse, '600')).toBe(false);
  });
});

describe('clientMatchScore', () => {
  it('scores exact phone above prefix above partial', () => {
    const exact = clientMatchScore({ phone: '617827908' }, '617827908');
    const prefixed = clientMatchScore({ phone: '+34617827908' }, '617827908');
    const startsWith = clientMatchScore({ phone: '617827908' }, '617');
    const contains = clientMatchScore({ phone: '617827908' }, '827');
    expect(exact).toBe(100);
    expect(prefixed).toBe(100);
    expect(startsWith).toBeLessThan(exact);
    expect(contains).toBeLessThan(startsWith);
  });

  it('scores exact name above starts-with above word-prefix above substring', () => {
    const exact = clientMatchScore({ name: 'José García' }, 'jose garcia');
    const startsWith = clientMatchScore({ name: 'José García' }, 'jose');
    const wordPrefix = clientMatchScore({ name: 'José García' }, 'gar');
    const substring = clientMatchScore({ name: 'José García' }, 'arci');
    expect(exact).toBeGreaterThan(startsWith);
    expect(startsWith).toBeGreaterThan(wordPrefix);
    expect(wordPrefix).toBeGreaterThan(substring);
    expect(substring).toBeGreaterThan(0);
  });

  it('scores name matches above email/tag-only matches', () => {
    const byName = clientMatchScore({ name: 'Vip Pérez' }, 'vip');
    const byTag = clientMatchScore({ name: 'Ana', tags: ['VIP'] }, 'vip');
    expect(byName).toBeGreaterThan(byTag);
    expect(byTag).toBeGreaterThan(0);
  });

  it('returns 0 for non-matches', () => {
    expect(clientMatchScore(client, 'pedro')).toBe(0);
    expect(clientMatchScore(client, '999999999')).toBe(0);
  });
});

describe('rankClients', () => {
  const ana = { name: 'Ana Torres', phone: '600111222' };
  const anabel = { name: 'Anabel Ruiz', phone: '600333444' };
  const susana = { name: 'Susana López', phone: '600555666' };

  it('returns the list unchanged for an empty query', () => {
    expect(rankClients([susana, ana], '')).toEqual([susana, ana]);
  });

  it('drops non-matches and puts best matches first', () => {
    const result = rankClients([susana, anabel, ana], 'ana');
    // "Ana Torres"/"Anabel" both start with the query (alphabetical
    // tie-break), "Susana" only matches as a substring and goes last.
    expect(result.map((c) => c.name)).toEqual([
      'Ana Torres',
      'Anabel Ruiz',
      'Susana López',
    ]);
    expect(rankClients([susana, anabel, ana], 'pedro')).toEqual([]);
  });

  it('ranks the exact phone first even without the country prefix', () => {
    const withPrefix = { name: 'Zoe', phone: '+34 600 111 222' };
    const longerNumber = { name: 'Abel', phone: '6001112223' };
    const result = rankClients([longerNumber, withPrefix], '600111222');
    expect(result).toEqual([withPrefix, longerNumber]);
  });

  it('breaks score ties alphabetically', () => {
    const beto = { name: 'Beto García', phone: '1' };
    const alba = { name: 'Alba García', phone: '2' };
    expect(rankClients([beto, alba], 'garcia').map((c) => c.name)).toEqual([
      'Alba García',
      'Beto García',
    ]);
  });
});

describe('phonesMatch / phoneKey', () => {
  it('treats prefixed and plain numbers as the same line', () => {
    expect(phonesMatch('+34617827908', '617827908')).toBe(true);
    expect(phonesMatch('617 827 908', '617827908')).toBe(true);
  });

  it('blank phones never match', () => {
    expect(phonesMatch('', '')).toBe(false);
    expect(phonesMatch(null, undefined)).toBe(false);
  });

  it('phoneKey reduces to the last 9 digits', () => {
    expect(phoneKey('+34617827908')).toBe('617827908');
    expect(phoneKey('617827908')).toBe('617827908');
  });
});
