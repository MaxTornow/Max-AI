/**
 * Unit tests for BETTY service
 * @jest
 */

import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import {
  BETTY_TEMPLATES,
  getTemplateByKey,
  getTemplateBySubmagicName,
  getDefaultTemplate,
} from '../templates';
import {
  ACCEPTED_VIDEO_TYPES,
  MAX_FILE_SIZE,
  SUPPORTED_LANGUAGES,
} from '../types';
import type { BettyTemplate, Video, SubmagicStatus } from '../types';

// Mock Supabase client
jest.mock('../../supabase/client', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        createSignedUrl: jest.fn(),
        remove: jest.fn(),
        download: jest.fn(),
      })),
    },
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ select: jest.fn(() => ({ single: jest.fn() })) })),
      update: jest.fn(() => ({ eq: jest.fn(() => ({ select: jest.fn(() => ({ single: jest.fn() })) })) })),
      select: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(), order: jest.fn() })) })) })),
      delete: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn() })) })),
    })),
  },
}));

describe('BETTY Templates', () => {
  describe('BETTY_TEMPLATES array', () => {
    test('should have exactly 8 templates', () => {
      expect(BETTY_TEMPLATES).toHaveLength(8);
    });

    test('each template should have required properties', () => {
      BETTY_TEMPLATES.forEach((template) => {
        expect(template).toHaveProperty('key');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('submagicTemplateName');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('previewColor');
        expect(template).toHaveProperty('defaults');
        expect(template.defaults).toHaveProperty('magicZooms');
        expect(template.defaults).toHaveProperty('magicBrolls');
        expect(template.defaults).toHaveProperty('magicBrollsPercentage');
      });
    });

    test('each template key should be unique', () => {
      const keys = BETTY_TEMPLATES.map((t) => t.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    test('each submagicTemplateName should be unique', () => {
      const names = BETTY_TEMPLATES.map((t) => t.submagicTemplateName);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    test('magicBrollsPercentage should be between 0 and 100', () => {
      BETTY_TEMPLATES.forEach((template) => {
        expect(template.defaults.magicBrollsPercentage).toBeGreaterThanOrEqual(0);
        expect(template.defaults.magicBrollsPercentage).toBeLessThanOrEqual(100);
      });
    });

    test('previewColor should be valid hex color', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      BETTY_TEMPLATES.forEach((template) => {
        expect(template.previewColor).toMatch(hexColorRegex);
      });
    });
  });

  describe('getTemplateByKey', () => {
    test('should return template for valid key', () => {
      const template = getTemplateByKey('bold-energetic');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Bold & Energetic');
      expect(template?.submagicTemplateName).toBe('Hormozi 4');
    });

    test('should return undefined for invalid key', () => {
      const template = getTemplateByKey('non-existent-key');
      expect(template).toBeUndefined();
    });

    test('should return correct template for each key', () => {
      const expectedMappings = [
        { key: 'bold-energetic', submagicName: 'Hormozi 4' },
        { key: 'clean-professional', submagicName: 'Sara' },
        { key: 'influencer-style', submagicName: 'Iman' },
        { key: 'mrbeast-vibes', submagicName: 'Beast' },
        { key: 'minimal-modern', submagicName: 'Daniel' },
        { key: 'storyteller', submagicName: 'Ella' },
        { key: 'dark-mode', submagicName: 'Leon' },
        { key: 'coaching-style', submagicName: 'Jason' },
      ];

      expectedMappings.forEach(({ key, submagicName }) => {
        const template = getTemplateByKey(key);
        expect(template?.submagicTemplateName).toBe(submagicName);
      });
    });
  });

  describe('getTemplateBySubmagicName', () => {
    test('should return template for valid Submagic name', () => {
      const template = getTemplateBySubmagicName('Hormozi 4');
      expect(template).toBeDefined();
      expect(template?.key).toBe('bold-energetic');
    });

    test('should return undefined for invalid Submagic name', () => {
      const template = getTemplateBySubmagicName('Non-Existent');
      expect(template).toBeUndefined();
    });

    test('should be case-sensitive', () => {
      const template = getTemplateBySubmagicName('hormozi 4'); // lowercase
      expect(template).toBeUndefined();
    });
  });

  describe('getDefaultTemplate', () => {
    test('should return first template as default', () => {
      const defaultTemplate = getDefaultTemplate();
      expect(defaultTemplate).toBe(BETTY_TEMPLATES[0]);
    });

    test('default template should be Bold & Energetic', () => {
      const defaultTemplate = getDefaultTemplate();
      expect(defaultTemplate.key).toBe('bold-energetic');
      expect(defaultTemplate.name).toBe('Bold & Energetic');
    });
  });
});

describe('BETTY Types and Constants', () => {
  describe('ACCEPTED_VIDEO_TYPES', () => {
    test('should accept MP4 files', () => {
      expect(ACCEPTED_VIDEO_TYPES['video/mp4']).toContain('.mp4');
    });

    test('should accept MOV files', () => {
      expect(ACCEPTED_VIDEO_TYPES['video/quicktime']).toContain('.mov');
    });

    test('should accept WebM files', () => {
      expect(ACCEPTED_VIDEO_TYPES['video/webm']).toContain('.webm');
    });

    test('should have exactly 3 accepted types', () => {
      expect(Object.keys(ACCEPTED_VIDEO_TYPES)).toHaveLength(3);
    });
  });

  describe('MAX_FILE_SIZE', () => {
    test('should be 2GB in bytes', () => {
      expect(MAX_FILE_SIZE).toBe(2147483648);
      expect(MAX_FILE_SIZE).toBe(2 * 1024 * 1024 * 1024);
    });
  });

  describe('SUPPORTED_LANGUAGES', () => {
    test('should include English', () => {
      const english = SUPPORTED_LANGUAGES.find((l) => l.code === 'en');
      expect(english).toBeDefined();
      expect(english?.label).toBe('English');
    });

    test('should have at least 10 languages', () => {
      expect(SUPPORTED_LANGUAGES.length).toBeGreaterThanOrEqual(10);
    });

    test('each language should have code and label', () => {
      SUPPORTED_LANGUAGES.forEach((lang) => {
        expect(lang.code).toBeDefined();
        expect(lang.code.length).toBeGreaterThanOrEqual(2);
        expect(lang.label).toBeDefined();
        expect(lang.label.length).toBeGreaterThan(0);
      });
    });

    test('language codes should be unique', () => {
      const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });
});

describe('Video Type Structure', () => {
  test('should validate Video type structure', () => {
    const mockVideo: Video = {
      id: 'test-uuid',
      user_id: 'user-uuid',
      title: 'Test Video',
      original_filename: 'test.mp4',
      file_size_bytes: 1024000,
      duration_seconds: 60,
      original_storage_path: 'user-uuid/123-test.mp4',
      processed_storage_path: null,
      submagic_project_id: null,
      submagic_status: 'pending',
      submagic_download_url: null,
      template_name: 'Hormozi 4',
      language: 'en',
      magic_zooms: true,
      magic_brolls: false,
      magic_brolls_percentage: 0,
      error_message: null,
      retry_count: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      processing_started_at: null,
      processing_completed_at: null,
    };

    expect(mockVideo.id).toBe('test-uuid');
    expect(mockVideo.submagic_status).toBe('pending');
    expect(mockVideo.magic_zooms).toBe(true);
  });

  test('SubmagicStatus should allow valid values', () => {
    const validStatuses: SubmagicStatus[] = ['pending', 'processing', 'completed', 'failed'];

    validStatuses.forEach((status) => {
      const video: Partial<Video> = { submagic_status: status };
      expect(video.submagic_status).toBe(status);
    });
  });
});

describe('Template Defaults', () => {
  test('Bold & Energetic should have zooms and B-rolls enabled', () => {
    const template = getTemplateByKey('bold-energetic');
    expect(template?.defaults.magicZooms).toBe(true);
    expect(template?.defaults.magicBrolls).toBe(true);
    expect(template?.defaults.magicBrollsPercentage).toBe(40);
  });

  test('Clean Professional should have minimal features', () => {
    const template = getTemplateByKey('clean-professional');
    expect(template?.defaults.magicZooms).toBe(false);
    expect(template?.defaults.magicBrolls).toBe(false);
    expect(template?.defaults.magicBrollsPercentage).toBe(0);
  });

  test('MrBeast Vibes should have highest B-roll percentage', () => {
    const template = getTemplateByKey('mrbeast-vibes');
    expect(template?.defaults.magicBrollsPercentage).toBe(50);

    // Verify it's the highest
    const maxPercentage = Math.max(
      ...BETTY_TEMPLATES.map((t) => t.defaults.magicBrollsPercentage)
    );
    expect(template?.defaults.magicBrollsPercentage).toBe(maxPercentage);
  });
});
