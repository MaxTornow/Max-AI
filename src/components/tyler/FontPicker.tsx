import React from 'react';
import { FONTS } from '@services/tyler/constants';
import { getCssFontFamily } from '@services/tyler/textUtils';

interface FontPickerProps {
    selectedFont: string;
    onChange: (fontName: string) => void;
    disabled?: boolean;
}

const FontPicker: React.FC<FontPickerProps> = ({
    selectedFont,
    onChange,
    disabled = false,
}) => {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Font
            </label>
            <select
                value={selectedFont}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {FONTS.map((font) => (
                    <option
                        key={font.name}
                        value={font.name}
                        style={{ fontFamily: getCssFontFamily(font.name) }}
                    >
                        {font.name} - {font.style}
                    </option>
                ))}
            </select>

            <div
                className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-center"
                style={{ fontFamily: getCssFontFamily(selectedFont) }}
            >
                <span className="text-lg text-gray-900 dark:text-white">
                    Preview Text
                </span>
            </div>
        </div>
    );
};

export default FontPicker;
