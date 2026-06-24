import { describe, it, expect } from 'vitest';
import { clientMatchesQuery, phonesMatch, phoneKey } from './clientSearch';

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
