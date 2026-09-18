jest.mock('../index', () => ({
  SUBMAGIC_API_URL: 'https://api.submagic.co/v1',
  SUBMAGIC_API_KEY: 'sk-test-api-key',
  getSubmagicProjectStatus: jest.fn(),
}));

import { pollForNewRender } from '../captionCorrection';
import type { SubmagicProjectResponse } from '../types';
import { getSubmagicProjectStatus } from '../index';

const mockGetStatus = getSubmagicProjectStatus as jest.MockedFunction<typeof getSubmagicProjectStatus>;

const projectResponse = (overrides: Partial<SubmagicProjectResponse>): SubmagicProjectResponse => ({
  id: 'proj-1',
  status: 'completed',
  title: 'Test',
  language: 'en',
  templateName: 'Hormozi 4',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('pollForNewRender', () => {
  beforeEach(() => {
    mockGetStatus.mockReset();
  });

  // Reproduces the real confirmed gotcha: downloadUrl can briefly still show
  // the previous render right after export starts, before the new one lands.
  test('ignores a stale URL and resolves once the URL actually changes', async () => {
    mockGetStatus
      .mockResolvedValueOnce(projectResponse({ downloadUrl: 'https://old.mp4' }))
      .mockResolvedValueOnce(projectResponse({ downloadUrl: 'https://new.mp4' }));

    const result = await pollForNewRender('proj-1', 'https://old.mp4', { intervalMs: 5, timeoutMs: 1000 });

    expect(result.downloadUrl).toBe('https://new.mp4');
    expect(mockGetStatus).toHaveBeenCalledTimes(2);
  });

  test('throws immediately if the project status is failed', async () => {
    mockGetStatus.mockResolvedValueOnce(projectResponse({ status: 'failed', errorMessage: 'boom' }));

    await expect(
      pollForNewRender('proj-1', 'https://old.mp4', { intervalMs: 5, timeoutMs: 1000 })
    ).rejects.toThrow('boom');
  });

  test('times out if the URL never changes', async () => {
    mockGetStatus.mockResolvedValue(projectResponse({ downloadUrl: 'https://old.mp4' }));

    await expect(
      pollForNewRender('proj-1', 'https://old.mp4', { intervalMs: 5, timeoutMs: 20 })
    ).rejects.toThrow(/Timed out/);
  });
});
