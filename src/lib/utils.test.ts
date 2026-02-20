import { cn } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('deduplicates conflicting Tailwind classes', () => {
    // tailwind-merge should resolve conflicting utilities
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('merges padding and margin without conflict', () => {
    expect(cn('px-2', 'py-4')).toBe('px-2 py-4');
  });

  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('');
  });

  it('handles undefined and null values', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('handles array input', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });
});
