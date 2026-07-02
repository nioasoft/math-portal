import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersistentToggle } from '../useWorksheetPrefs';

const STORAGE_KEY = 'tirgul.worksheet.showAnswers';

describe('usePersistentToggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns the default when nothing is stored', () => {
    const { result } = renderHook(() => usePersistentToggle('showAnswers'));
    expect(result.current[0]).toBe(false);
  });

  it('writes to localStorage on change', () => {
    const { result } = renderHook(() => usePersistentToggle('showAnswers'));
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1');
  });

  it('hydrates a stored value after mount', () => {
    localStorage.setItem(STORAGE_KEY, '1');
    const { result } = renderHook(() => usePersistentToggle('showAnswers'));
    // Effect runs during render/act → value hydrated from storage.
    expect(result.current[0]).toBe(true);
  });
});
