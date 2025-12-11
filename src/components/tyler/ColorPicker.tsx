import React from 'react';

interface ColorPickerProps {
    selectedColor: string;
    onChange: (color: string) => void;
    disabled?: boolean;
}

/**
 * ColorPicker - Simple color input with hex text field
 * Simplified version without preset color squares
 */
const ColorPicker: React.FC<ColorPickerProps> = ({
    selectedColor,
    onChange,
    disabled = false,
}) => {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Text Color
            </label>

            <div className="flex items-center gap-3">
                <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />

                <input
                    type="text"
                    value={selectedColor}
                    onChange={(e) => {
                        const value = e.target.value;
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                            onChange(value);
                        }
                    }}
                    disabled={disabled}
                    maxLength={7}
                    className="w-24 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
            </div>
        </div>
    );
};

export default ColorPicker;
