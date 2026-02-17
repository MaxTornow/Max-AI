/**
 * Unit tests for transcription service
 * @jest
 */

import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { submitTranscriptionRequest } from '../transcriptionService';

// Mock the config module to avoid import.meta.env issues
jest.mock('../config', () => ({
    API_KEYS: { ASSEMBLY_AI: 'test-assemblyai-key' },
    ASSEMBLY_AI_CONFIG: { UPLOAD_TIMEOUT_MS: 60000 }
}));

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('submitTranscriptionRequest', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ id: 'test-transcript-id' }),
            text: async () => '',
            headers: { forEach: () => {} }
        } as any);
    });

    test('with no language arg — sends language_detection: true and no language_code', async () => {
        await submitTranscriptionRequest('https://example.com/audio.mp3');

        const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
        expect(body.language_detection).toBe(true);
        expect(body.language_code).toBeUndefined();
    });

    test("with language = 'auto' — sends language_detection: true and no language_code", async () => {
        await submitTranscriptionRequest('https://example.com/audio.mp3', 'auto');

        const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
        expect(body.language_detection).toBe(true);
        expect(body.language_code).toBeUndefined();
    });

    test("with language = 'de' — sends language_code: 'de' and no language_detection", async () => {
        await submitTranscriptionRequest('https://example.com/audio.mp3', 'de');

        const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
        expect(body.language_code).toBe('de');
        expect(body.language_detection).toBeUndefined();
    });

    test("with language = 'en' — sends language_code: 'en' and no language_detection", async () => {
        await submitTranscriptionRequest('https://example.com/audio.mp3', 'en');

        const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
        expect(body.language_code).toBe('en');
        expect(body.language_detection).toBeUndefined();
    });

    test('success path — returns transcription id from response', async () => {
        const id = await submitTranscriptionRequest('https://example.com/audio.mp3');
        expect(id).toBe('test-transcript-id');
    });
});
