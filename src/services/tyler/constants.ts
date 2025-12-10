/**
 * TYLER - Constants and Configuration
 */

import type { FontOption, TextOverlaySettings } from './types';

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
];

/** Font size limits */
export const MIN_FONT_SIZE = 20;
export const MAX_FONT_SIZE = 120;
export const DEFAULT_FONT_SIZE = 48;

/** Default settings */
export const DEFAULT_SETTINGS: TextOverlaySettings = {
    text: '',
    fontName: 'Montserrat',
    fontSize: DEFAULT_FONT_SIZE,
    textColor: '#FFFFFF',
    position: 'bottom',
    alignment: 'center',
};

/** File limits */
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_DURATION_SECONDS = 180; // 3 minutes

/** Accepted video types for react-dropzone */
export const ACCEPTED_VIDEO_TYPES = {
    'video/mp4': ['.mp4'],
    'video/quicktime': ['.mov'],
};
