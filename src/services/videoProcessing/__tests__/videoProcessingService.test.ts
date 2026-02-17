/**
 * Unit tests for video processing service
 * @jest
 */

import '@testing-library/jest-dom';
// Make Jest globals available
import { describe, expect, test, beforeEach, jest } from '@jest/globals';

import { processVideo } from '../videoProcessingService';
import { getInstagramVideoInfo, downloadInstagramVideo } from '../instagramService';
import { getTikTokVideoInfo, downloadTikTokVideo } from '../tiktokService';
import { 
  uploadVideoToAssemblyAI, 
  submitTranscriptionRequest, 
  pollForTranscriptionCompletion 
} from '../transcriptionService';
import { generateScripts } from '../scriptGenerationService';
import { VideoProcessingRequest, InstagramVideoInfo, TranscriptionResponse, ScriptGenerationResponse } from '../types';

// Mock all the dependencies
jest.mock('../instagramService', () => ({
  getInstagramVideoInfo: jest.fn(),
  downloadInstagramVideo: jest.fn()
}));

jest.mock('../tiktokService', () => ({
  getTikTokVideoInfo: jest.fn(),
  downloadTikTokVideo: jest.fn()
}));

jest.mock('../transcriptionService', () => ({
  uploadVideoToAssemblyAI: jest.fn(),
  submitTranscriptionRequest: jest.fn(),
  pollForTranscriptionCompletion: jest.fn()
}));

jest.mock('../scriptGenerationService', () => ({
  generateScripts: jest.fn()
}));

describe('Video Processing Service', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Sample test data
  const mockVideoData = new ArrayBuffer(8);
  const mockTranscription = { 
    id: 'test-id', 
    status: 'completed', 
    text: 'This is a test transcription'
  };
  const mockScripts = {
    original_transcription: { text: 'This is a test transcription' },
    script_1: { text: 'Script 1 content' },
    script_2: { text: 'Script 2 content' },
    script_3: { text: 'Script 3 content' }
  };
  
  // Sample requests
  const instagramRequest = {
    videoDetails: {
      url: 'https://www.instagram.com/reel/test-video',
      platform: 'instagram'
    },
    storyDetails: {
      niche: 'Test Niche',
      targetAudience: 'Test Audience',
      painPoints: 'Test Pain Points',
      communicationStyle: 'Test Style'
    }
  } as VideoProcessingRequest;

  const tiktokRequest = {
    videoDetails: {
      url: 'https://www.tiktok.com/@user/video/test-video',
      platform: 'tiktok'
    },
    storyDetails: {
      niche: 'Test Niche',
      targetAudience: 'Test Audience',
      painPoints: 'Test Pain Points',
      communicationStyle: 'Test Style'
    }
  } as VideoProcessingRequest;

  describe('Instagram Video Processing', () => {
    test('should process Instagram video successfully', async () => {
      // Setup mocks
      (getInstagramVideoInfo as jest.MockedFunction<typeof getInstagramVideoInfo>).mockResolvedValue({ download_url: 'https://example.com/video.mp4' } as InstagramVideoInfo);
      (downloadInstagramVideo as jest.MockedFunction<typeof downloadInstagramVideo>).mockResolvedValue(mockVideoData);
      (uploadVideoToAssemblyAI as jest.MockedFunction<typeof uploadVideoToAssemblyAI>).mockResolvedValue('https://example.com/upload');
      (submitTranscriptionRequest as jest.MockedFunction<typeof submitTranscriptionRequest>).mockResolvedValue('transcription-id');
      (pollForTranscriptionCompletion as jest.MockedFunction<typeof pollForTranscriptionCompletion>).mockResolvedValue(mockTranscription as TranscriptionResponse);
      (generateScripts as jest.MockedFunction<typeof generateScripts>).mockResolvedValue(mockScripts as ScriptGenerationResponse);

      // Execute
      const result = await processVideo(instagramRequest);

      // Verify
      expect(getInstagramVideoInfo).toHaveBeenCalledWith(instagramRequest.videoDetails.url);
      expect(downloadInstagramVideo).toHaveBeenCalledWith('https://example.com/video.mp4');
      expect(uploadVideoToAssemblyAI).toHaveBeenCalledWith(mockVideoData);
      expect(submitTranscriptionRequest).toHaveBeenCalledWith('https://example.com/upload', undefined);
      expect(pollForTranscriptionCompletion).toHaveBeenCalledWith('transcription-id');
      expect(generateScripts).toHaveBeenCalledWith(
        mockTranscription.text,
        instagramRequest.storyDetails,
        undefined,
        undefined,
        undefined
      );

      // Verify result structure
      expect(result).toEqual({
        transcription: mockTranscription.text,
        scripts: {
          script_1: mockScripts.script_1.text,
          script_2: mockScripts.script_2.text,
          script_3: mockScripts.script_3.text
        },
        originalVideoUrl: instagramRequest.videoDetails.url,
        platform: instagramRequest.videoDetails.platform
      });
    });

    test('should handle errors in Instagram video processing', async () => {
      // Setup mock to throw an error
      (getInstagramVideoInfo as jest.MockedFunction<typeof getInstagramVideoInfo>).mockRejectedValue(new Error('Failed to fetch video info'));

      // Execute and expect rejection
      await expect(processVideo(instagramRequest)).rejects.toThrow('Failed to fetch video info');
    });
  });

  describe('TikTok Video Processing', () => {
    test('should process TikTok video successfully', async () => {
      // Setup mocks
      (getTikTokVideoInfo as jest.MockedFunction<typeof getTikTokVideoInfo>).mockResolvedValue({ download_url: 'https://example.com/tiktok.mp4' } as InstagramVideoInfo);
      (downloadTikTokVideo as jest.MockedFunction<typeof downloadTikTokVideo>).mockResolvedValue(mockVideoData);
      (uploadVideoToAssemblyAI as jest.MockedFunction<typeof uploadVideoToAssemblyAI>).mockResolvedValue('https://example.com/upload');
      (submitTranscriptionRequest as jest.MockedFunction<typeof submitTranscriptionRequest>).mockResolvedValue('transcription-id');
      (pollForTranscriptionCompletion as jest.MockedFunction<typeof pollForTranscriptionCompletion>).mockResolvedValue(mockTranscription as TranscriptionResponse);
      (generateScripts as jest.MockedFunction<typeof generateScripts>).mockResolvedValue(mockScripts as ScriptGenerationResponse);

      // Execute
      const result = await processVideo(tiktokRequest);

      // Verify
      expect(getTikTokVideoInfo).toHaveBeenCalledWith(tiktokRequest.videoDetails.url);
      expect(submitTranscriptionRequest).toHaveBeenCalledWith('https://example.com/tiktok.mp4', undefined);
      expect(pollForTranscriptionCompletion).toHaveBeenCalledWith('transcription-id');
      expect(generateScripts).toHaveBeenCalledWith(
        mockTranscription.text,
        tiktokRequest.storyDetails,
        undefined,
        undefined,
        undefined
      );

      // Verify result structure
      expect(result).toEqual({
        transcription: mockTranscription.text,
        scripts: {
          script_1: mockScripts.script_1.text,
          script_2: mockScripts.script_2.text,
          script_3: mockScripts.script_3.text
        },
        originalVideoUrl: tiktokRequest.videoDetails.url,
        platform: tiktokRequest.videoDetails.platform
      });
    });

    test('should handle errors in TikTok video processing', async () => {
      // Setup mock to throw an error
      (getTikTokVideoInfo as jest.MockedFunction<typeof getTikTokVideoInfo>).mockRejectedValue(new Error('Failed to fetch TikTok video'));

      // Execute and expect rejection
      await expect(processVideo(tiktokRequest)).rejects.toThrow('Failed to fetch TikTok video');
    });

    test('when request.language = "de" — submitTranscriptionRequest is called with "de"', async () => {
      (getTikTokVideoInfo as jest.MockedFunction<typeof getTikTokVideoInfo>).mockResolvedValue({ download_url: 'https://example.com/tiktok.mp4' } as InstagramVideoInfo);
      (submitTranscriptionRequest as jest.MockedFunction<typeof submitTranscriptionRequest>).mockResolvedValue('transcription-id');
      (pollForTranscriptionCompletion as jest.MockedFunction<typeof pollForTranscriptionCompletion>).mockResolvedValue(mockTranscription as TranscriptionResponse);
      (generateScripts as jest.MockedFunction<typeof generateScripts>).mockResolvedValue(mockScripts as ScriptGenerationResponse);

      const requestWithLanguage = { ...tiktokRequest, language: 'de' };
      await processVideo(requestWithLanguage);

      expect(submitTranscriptionRequest).toHaveBeenCalledWith('https://example.com/tiktok.mp4', 'de');
    });

    test('when request.language is absent — submitTranscriptionRequest is called with undefined', async () => {
      (getTikTokVideoInfo as jest.MockedFunction<typeof getTikTokVideoInfo>).mockResolvedValue({ download_url: 'https://example.com/tiktok.mp4' } as InstagramVideoInfo);
      (submitTranscriptionRequest as jest.MockedFunction<typeof submitTranscriptionRequest>).mockResolvedValue('transcription-id');
      (pollForTranscriptionCompletion as jest.MockedFunction<typeof pollForTranscriptionCompletion>).mockResolvedValue(mockTranscription as TranscriptionResponse);
      (generateScripts as jest.MockedFunction<typeof generateScripts>).mockResolvedValue(mockScripts as ScriptGenerationResponse);

      await processVideo(tiktokRequest);

      expect(submitTranscriptionRequest).toHaveBeenCalledWith('https://example.com/tiktok.mp4', undefined);
    });
  });

  describe('Input Validation', () => {
    test('should reject requests with missing video details', async () => {
      const invalidRequest = {
        storyDetails: {
          niche: 'Test',
          targetAudience: 'Test',
          painPoints: 'Test',
          communicationStyle: 'Test'
        }
      } as any;

      await expect(processVideo(invalidRequest)).rejects.toThrow('Invalid request: Missing video details');
    });

    test('should reject requests with missing story details', async () => {
      const invalidRequest = {
        videoDetails: {
          url: 'https://example.com',
          platform: 'instagram'
        }
      } as any;

      await expect(processVideo(invalidRequest)).rejects.toThrow('Invalid request: Missing story details');
    });

    test('should reject requests with unsupported platforms', async () => {
      const invalidRequest: VideoProcessingRequest = {
        videoDetails: {
          url: 'https://youtube.com/watch?v=test',
          platform: 'youtube'
        },
        storyDetails: {
          niche: 'Test',
          targetAudience: 'Test',
          painPoints: 'Test',
          communicationStyle: 'Test'
        }
      };

      await expect(processVideo(invalidRequest)).rejects.toThrow('Unsupported platform: youtube');
    });
  });
});
