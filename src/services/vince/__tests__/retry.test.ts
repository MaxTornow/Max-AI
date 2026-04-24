/**
 * Tests for Submagic retry helper and error message formatting.
 * @jest
 */

import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { retryableFetch, formatSubmagicErrorMessage } from '../retry';

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

const makeResponse = (status: number, body = ''): Response =>
  new Response(body, { status });

const URL = 'https://api.submagic.co/v1/projects';
const INIT: RequestInit = { method: 'POST' };

describe('retryableFetch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns response on first-attempt success', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, '{"id":"abc"}'));

    const res = await retryableFetch(URL, INIT, 'Submagic API error');

    expect(res.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('retries once on 500 then succeeds', async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(500, 'boom'))
      .mockResolvedValueOnce(makeResponse(200, '{"id":"abc"}'));

    const promise = retryableFetch(URL, INIT, 'Submagic API error');
    await jest.advanceTimersByTimeAsync(1000);
    const res = await promise;

    expect(res.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test('retries twice on 500/500 then succeeds', async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(500, 'boom'))
      .mockResolvedValueOnce(makeResponse(500, 'boom'))
      .mockResolvedValueOnce(makeResponse(200, '{"id":"abc"}'));

    const promise = retryableFetch(URL, INIT, 'Submagic API error');
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(3000);
    const res = await promise;

    expect(res.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  test('throws after exhausting 3 attempts on persistent 500', async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(500, 'boom'))
      .mockResolvedValueOnce(makeResponse(500, 'boom'))
      .mockResolvedValueOnce(makeResponse(500, 'boom'));

    const promise = retryableFetch(URL, INIT, 'Submagic API error');
    const expectation = expect(promise).rejects.toThrow('Submagic API error: 500 - boom');
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(3000);
    await expectation;

    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  test('retries on 429 (rate limit)', async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(429, 'rate limited'))
      .mockResolvedValueOnce(makeResponse(200, '{"id":"abc"}'));

    const promise = retryableFetch(URL, INIT, 'Submagic API error');
    await jest.advanceTimersByTimeAsync(1000);
    const res = await promise;

    expect(res.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test('throws immediately on 402 INSUFFICIENT_CREDITS without retry', async () => {
    const body = '{"error":"INSUFFICIENT_CREDITS","message":"Insufficient API credits"}';
    mockFetch.mockResolvedValueOnce(makeResponse(402, body));

    await expect(retryableFetch(URL, INIT, 'Submagic API error')).rejects.toThrow(
      `Submagic API error: 402 - ${body}`
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('throws immediately on 400 without retry', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(400, 'bad request'));

    await expect(retryableFetch(URL, INIT, 'Submagic API error')).rejects.toThrow(
      'Submagic API error: 400 - bad request'
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('retries on network error then succeeds', async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError('NetworkError'))
      .mockResolvedValueOnce(makeResponse(200, '{"id":"abc"}'));

    const promise = retryableFetch(URL, INIT, 'Submagic API error');
    await jest.advanceTimersByTimeAsync(1000);
    const res = await promise;

    expect(res.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test('throws original error after exhausting retries on network errors', async () => {
    mockFetch.mockRejectedValue(new TypeError('NetworkError'));

    const promise = retryableFetch(URL, INIT, 'Submagic API error');
    const expectation = expect(promise).rejects.toThrow('NetworkError');
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(3000);
    await expectation;

    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});

describe('formatSubmagicErrorMessage', () => {
  test('translates INSUFFICIENT_CREDITS to friendly contact-support copy', () => {
    const err = new Error(
      'Submagic API error: 402 - {"error":"INSUFFICIENT_CREDITS","message":"Insufficient API credits"}'
    );
    expect(formatSubmagicErrorMessage(err)).toBe(
      'Out of processing credits. Please contact support.'
    );
  });

  test('passes through other Error messages unchanged', () => {
    const err = new Error('Submagic API error: 500 - INTERNAL_SERVER_ERROR');
    expect(formatSubmagicErrorMessage(err)).toBe(
      'Submagic API error: 500 - INTERNAL_SERVER_ERROR'
    );
  });

  test('returns generic fallback for non-Error inputs', () => {
    expect(formatSubmagicErrorMessage('weird string')).toBe('An error occurred');
    expect(formatSubmagicErrorMessage(null)).toBe('An error occurred');
    expect(formatSubmagicErrorMessage(undefined)).toBe('An error occurred');
  });
});
