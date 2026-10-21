import { describe, expect, it } from 'vitest';
import { formatSize } from './formatSize';

describe('formatSize', () => {
  it.each([
    [0, '0 B'],
    [1, '1 B'],
    [300, '300 B'],
    [512, '512 B'],
    [1023, '1023 B'],
  ])('renders %i bytes as %s', (bytes, expected) => {
    expect(formatSize(bytes)).toBe(expected);
  });

  it('switches to the next unit at 1024 and drops a trailing .0', () => {
    expect(formatSize(1024)).toBe('1 KB');
    expect(formatSize(1536)).toBe('1.5 KB');
    expect(formatSize(1024 * 1024)).toBe('1 MB');
    expect(formatSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
    expect(formatSize(1024 ** 3)).toBe('1 GB');
    expect(formatSize(1024 ** 4)).toBe('1 TB');
  });

  it('keeps one decimal place', () => {
    expect(formatSize(1234)).toBe('1.2 KB');
    expect(formatSize(1_234_567)).toBe('1.2 MB');
  });

  it('stays on the largest unit instead of inventing a new one', () => {
    expect(formatSize(1024 ** 5)).toBe('1024 TB');
  });

  it('treats missing or nonsensical values as zero', () => {
    expect(formatSize(-1)).toBe('0 B');
    expect(formatSize(Number.NaN)).toBe('0 B');
    expect(formatSize(Number.POSITIVE_INFINITY)).toBe('0 B');
  });
});
