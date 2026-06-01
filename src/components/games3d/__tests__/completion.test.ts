import { describe, it, expect, beforeEach } from 'vitest';
import { recordBestScore } from '../completion';

describe('recordBestScore', () => {
  beforeEach(() => localStorage.clear());
  it('stores the score when none exists', () => {
    expect(recordBestScore('g1', 30)).toBe(30);
  });
  it('keeps the higher score', () => {
    recordBestScore('g1', 30);
    expect(recordBestScore('g1', 20)).toBe(30);
    expect(recordBestScore('g1', 50)).toBe(50);
  });
});
