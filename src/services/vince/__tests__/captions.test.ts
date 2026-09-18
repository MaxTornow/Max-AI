import { sortTranscriptWords, isWordInHookWindow, hasEditableCaptionWords } from '../captions';
import type { SubmagicWord } from '../types';
import { HOOK_OVERLAY_DURATION_SECONDS } from '../types';

const word = (overrides: Partial<SubmagicWord>): SubmagicWord => ({
  id: 'id',
  text: 'text',
  type: 'word',
  startTime: 0,
  endTime: 1,
  ...overrides,
});

describe('sortTranscriptWords', () => {
  test('sorts by startTime ascending', () => {
    const words = [
      word({ id: 'c', startTime: 5 }),
      word({ id: 'a', startTime: 0 }),
      word({ id: 'b', startTime: 2 }),
    ];

    expect(sortTranscriptWords(words).map((w) => w.id)).toEqual(['a', 'b', 'c']);
  });

  test('does not mutate the input array', () => {
    const words = [word({ id: 'b', startTime: 2 }), word({ id: 'a', startTime: 0 })];
    const original = [...words];

    sortTranscriptWords(words);

    expect(words).toEqual(original);
  });

  test('reproduces the real gotcha: out-of-order silence entries get sorted correctly', () => {
    // Mirrors the real confirmed bug: a silence entry can carry a startTime
    // from a different reference point than surrounding words, landing it
    // out of order in the raw GET response.
    const words = [
      word({ id: 'w1', type: 'word', startTime: 0, endTime: 0.44 }),
      word({ id: 'silence_1', type: 'silence', text: '', startTime: 0, endTime: 2.2 }),
      word({ id: 'w2', type: 'word', startTime: 2.2, endTime: 2.6 }),
    ];

    expect(sortTranscriptWords(words).map((w) => w.id)).toEqual(['w1', 'silence_1', 'w2']);
  });
});

describe('isWordInHookWindow', () => {
  test('false when hook title is disabled, regardless of startTime', () => {
    expect(isWordInHookWindow(word({ startTime: 0 }), false)).toBe(false);
  });

  test('true when hook is enabled and word starts before the hook window ends', () => {
    expect(isWordInHookWindow(word({ startTime: 0 }), true)).toBe(true);
    expect(isWordInHookWindow(word({ startTime: HOOK_OVERLAY_DURATION_SECONDS - 0.1 }), true)).toBe(true);
  });

  test('false when hook is enabled but word starts at/after the hook window', () => {
    expect(isWordInHookWindow(word({ startTime: HOOK_OVERLAY_DURATION_SECONDS }), true)).toBe(false);
    expect(isWordInHookWindow(word({ startTime: HOOK_OVERLAY_DURATION_SECONDS + 5 }), true)).toBe(false);
  });
});

describe('hasEditableCaptionWords', () => {
  test('true when at least one word-type entry exists', () => {
    const words = [
      word({ type: 'silence', text: '' }),
      word({ type: 'word', text: 'hello' }),
    ];
    expect(hasEditableCaptionWords(words)).toBe(true);
  });

  test('false when only silence/punctuation entries exist', () => {
    const words = [
      word({ type: 'silence', text: '' }),
      word({ type: 'punctuation', text: '.' }),
    ];
    expect(hasEditableCaptionWords(words)).toBe(false);
  });

  test('false for an empty transcript', () => {
    expect(hasEditableCaptionWords([])).toBe(false);
  });
});
