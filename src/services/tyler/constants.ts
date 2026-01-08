/**
 * TYLER - Constants and Configuration
 */

import type { FontOption, TextOverlaySettings, TextLayer } from './types';

/** Available fonts - must match files in public/fonts/ */
export const FONTS: FontOption[] = [
    { name: 'Montserrat', file: 'Montserrat/static/Montserrat-Bold.ttf', style: 'Modern, clean' },
    { name: 'Bebas Neue', file: 'Bebas_Neue/BebasNeue-Regular.ttf', style: 'Tall, impactful' },
    { name: 'Poppins', file: 'Poppins/Poppins-Bold.ttf', style: 'Friendly, rounded' },
    { name: 'Oswald', file: 'Oswald/static/Oswald-Bold.ttf', style: 'Condensed' },
    { name: 'Roboto', file: 'Roboto/static/Roboto-Bold.ttf', style: 'Neutral' },
    { name: 'Open Sans', file: 'Open_Sans/static/OpenSans-Bold.ttf', style: 'Readable' },
    { name: 'Lato', file: 'Lato/Lato-Bold.ttf', style: 'Professional' },
    { name: 'Anton', file: 'Anton/Anton-Regular.ttf', style: 'Strong, bold' },
    { name: 'Inter', file: 'Inter/static/Inter_28pt-Bold.ttf', style: 'Clean, versatile' },
];

/** Font size limits */
export const MIN_FONT_SIZE = 20;
export const MAX_FONT_SIZE = 240;
export const DEFAULT_FONT_SIZE = 48;

/** Default headline layer (disabled by default) */
export const DEFAULT_HEADLINE_LAYER: TextLayer = {
    id: 'headline',
    enabled: false,
    text: '',
    fontSize: 72,               // Larger for impact
    textColor: '#FFFFFF',
    yPositionPercent: 15,       // Top third
    alignment: 'center',
};

/** Default body layer (enabled by default for backward compatibility) */
export const DEFAULT_BODY_LAYER: TextLayer = {
    id: 'body',
    enabled: true,
    text: '',
    fontSize: 42,               // Smaller than headline
    textColor: '#FFFFFF',
    yPositionPercent: 75,       // Bottom third
    alignment: 'center',
};

/** Default settings - NEW STRUCTURE with layers */
export const DEFAULT_SETTINGS: TextOverlaySettings = {
    fontName: 'Montserrat',
    layers: [
        { ...DEFAULT_HEADLINE_LAYER },
        { ...DEFAULT_BODY_LAYER },
    ],
};

/** File limits */
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_DURATION_SECONDS = 180; // 3 minutes

/** Accepted video types for react-dropzone */
export const ACCEPTED_VIDEO_TYPES = {
    'video/mp4': ['.mp4'],
    'video/quicktime': ['.mov'],
};
