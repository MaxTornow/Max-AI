import React from 'react';
import type { TextOverlaySettings, TextAlignment } from '@services/tyler/types';
import FontPicker from './FontPicker';
import FontSizeSlider from './FontSizeSlider';
import ColorPicker from './ColorPicker';
import YPositionSlider from './YPositionSlider';
import AlignmentSelector from './AlignmentSelector';

interface TextEditorProps {
    settings: TextOverlaySettings;
    onChange: (settings: TextOverlaySettings) => void;
    disabled?: boolean;
}

const TextEditor: React.FC<TextEditorProps> = ({
    settings,
    onChange,
    disabled = false,
}) => {
    const updateSettings = (updates: Partial<TextOverlaySettings>) => {
        onChange({ ...settings, ...updates });
    };

    return (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Text Content
                </label>
                <textarea
                    value={settings.text}
                    onChange={(e) => updateSettings({ text: e.target.value })}
                    disabled={disabled}
                    rows={4}
                    placeholder="Enter your text here..."
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                />
            </div>

            <FontPicker
                selectedFont={settings.fontName}
                onChange={(fontName) => updateSettings({ fontName })}
                disabled={disabled}
            />

            <FontSizeSlider
                fontSize={settings.fontSize}
                onChange={(fontSize) => updateSettings({ fontSize })}
                disabled={disabled}
            />

            <ColorPicker
                selectedColor={settings.textColor}
                onChange={(textColor) => updateSettings({ textColor })}
                disabled={disabled}
            />

            <YPositionSlider
                value={settings.yPositionPercent}
                onChange={(yPositionPercent) => updateSettings({ yPositionPercent })}
                disabled={disabled}
                defaultValue={50}
            />

            <AlignmentSelector
                selectedAlignment={settings.alignment}
                onChange={(alignment: TextAlignment) => updateSettings({ alignment })}
                disabled={disabled}
            />
        </div>
    );
};

export default TextEditor;
