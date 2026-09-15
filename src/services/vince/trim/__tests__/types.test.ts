/**
 * Unit tests for the file-size guard in types.ts.
 * @jest
 */

import { describe, expect, test } from '@jest/globals';
import { assertFileSizeWithinTrimLimit, MAX_TRIM_FILE_SIZE_BYTES, TrimError } from '../types';

function makeFakeFile(sizeBytes: number): File {
  // Only `.size` is read by the guard — a minimal stand-in avoids needing
  // a real Blob/File with that many actual bytes in memory for the test.
  return { size: sizeBytes } as File;
}

describe('assertFileSizeWithinTrimLimit', () => {
  test('does not throw for a file well under the limit', () => {
    expect(() => assertFileSizeWithinTrimLimit(makeFakeFile(10 * 1024 * 1024))).not.toThrow();
  });

  test('does not throw for a file exactly at the limit', () => {
    expect(() => assertFileSizeWithinTrimLimit(makeFakeFile(MAX_TRIM_FILE_SIZE_BYTES))).not.toThrow();
  });

  test('throws a TrimError with reason file-too-large for a file over the limit', () => {
    const file = makeFakeFile(MAX_TRIM_FILE_SIZE_BYTES + 1);
    expect(() => assertFileSizeWithinTrimLimit(file)).toThrow(TrimError);
    try {
      assertFileSizeWithinTrimLimit(file);
      fail('expected assertFileSizeWithinTrimLimit to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(TrimError);
      expect((error as TrimError).reason).toBe('file-too-large');
    }
  });

  test('error message reports actual MB values, not raw bytes', () => {
    // 1,566,946,479 bytes — the real iPhone test file that motivated this guard.
    const file = makeFakeFile(1_566_946_479);
    try {
      assertFileSizeWithinTrimLimit(file);
      fail('expected assertFileSizeWithinTrimLimit to throw');
    } catch (error) {
      const message = (error as TrimError).message;
      expect(message).toContain('1494 MB');
      expect(message).toContain('500 MB');
      expect(message).not.toMatch(/\d{5,}/); // no raw byte counts leaking into the message
    }
  });

  test('reports a reasonable, documented limit (currently 500MB)', () => {
    expect(MAX_TRIM_FILE_SIZE_BYTES).toBe(500 * 1024 * 1024);
  });
});
