/**
 * VINCE Template Definitions
 *
 * All 8 template names confirmed against Submagic API
 * Source: https://docs.submagic.co/api-reference/templates
 *
 * Full list of 30 available Submagic templates (for future expansion):
 * Sara, Daniel, Dan 2, Hormozi 4, Dan, Devin, Tayo, Ella, Tracy, Luke,
 * Hormozi 1, Hormozi 2, Hormozi 3, Hormozi 5, Leila, Jason, William,
 * Leon, Ali, Beast, Maya, Karl, Iman, Umi, David, Noah, Gstaad, Malta, Nema, seth
 *
 * Note: Template names are case-sensitive. Default is "Sara" if none specified.
 */

import type { VinceTemplate } from './types';

export const VINCE_TEMPLATES: VinceTemplate[] = [
  {
    key: 'bold-energetic',
    name: 'Bold & Energetic',
    submagicTemplateName: 'Hormozi 4',
    description: 'High-energy style with bold captions and dynamic zooms',
    previewColor: '#FF5722',
    defaults: { magicZooms: true, magicBrolls: true, magicBrollsPercentage: 40 },
  },
  {
    key: 'clean-professional',
    name: 'Clean Professional',
    submagicTemplateName: 'Sara',
    description: 'Minimal, professional look without distractions',
    previewColor: '#2196F3',
    defaults: { magicZooms: false, magicBrolls: false, magicBrollsPercentage: 0 },
  },
  {
    key: 'influencer-style',
    name: 'Influencer Style',
    submagicTemplateName: 'Iman',
    description: 'Trendy influencer aesthetic with subtle enhancements',
    previewColor: '#9C27B0',
    defaults: { magicZooms: true, magicBrolls: true, magicBrollsPercentage: 30 },
  },
  {
    key: 'mrbeast-vibes',
    name: 'MrBeast Vibes',
    submagicTemplateName: 'Beast',
    description: 'Maximum engagement style with heavy B-roll usage',
    previewColor: '#4CAF50',
    defaults: { magicZooms: true, magicBrolls: true, magicBrollsPercentage: 50 },
  },
  {
    key: 'minimal-modern',
    name: 'Minimal Modern',
    submagicTemplateName: 'Daniel',
    description: 'Clean, modern aesthetic with subtle captions',
    previewColor: '#607D8B',
    defaults: { magicZooms: false, magicBrolls: false, magicBrollsPercentage: 0 },
  },
  {
    key: 'storyteller',
    name: 'Storyteller',
    submagicTemplateName: 'Ella',
    description: 'Narrative-focused with subtle zooms and B-roll',
    previewColor: '#795548',
    defaults: { magicZooms: true, magicBrolls: true, magicBrollsPercentage: 25 },
  },
  {
    key: 'dark-mode',
    name: 'Dark Mode',
    submagicTemplateName: 'Leon',
    description: 'Dark, moody aesthetic with zooms for emphasis',
    previewColor: '#212121',
    defaults: { magicZooms: true, magicBrolls: false, magicBrollsPercentage: 0 },
  },
  {
    key: 'coaching-style',
    name: 'Coaching Style',
    submagicTemplateName: 'Jason',
    description: 'Educational style with supportive B-roll',
    previewColor: '#3F51B5',
    defaults: { magicZooms: false, magicBrolls: true, magicBrollsPercentage: 20 },
  },
];

/**
 * Get a template by its key
 */
export const getTemplateByKey = (key: string): VinceTemplate | undefined =>
  VINCE_TEMPLATES.find(t => t.key === key);

/**
 * Get a template by its Submagic name
 */
export const getTemplateBySubmagicName = (name: string): VinceTemplate | undefined =>
  VINCE_TEMPLATES.find(t => t.submagicTemplateName === name);

/**
 * Get the default template
 */
export const getDefaultTemplate = (): VinceTemplate => VINCE_TEMPLATES[0];
