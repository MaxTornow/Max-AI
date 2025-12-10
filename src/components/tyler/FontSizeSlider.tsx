import React from 'react';
import { MIN_FONT_SIZE, MAX_FONT_SIZE } from '@services/tyler/constants';

interface FontSizeSliderProps {
    fontSize: number;
    onChange: (size: number) => void;
    disabled?: boolean;
}

const FontSizeSlider: React.FC<FontSizeSliderProps> = ({
    fontSize,
    onChange,
    disabled = false,
}) => {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Font Size
            </label>

            <div className="flex items-center gap-4">
                <input
                    type="range"
                    min={MIN_FONT_SIZE}
                    max={MAX_FONT_SIZE}
                    value={fontSize}
                    onChange={(e) => onChange(Number(e.target.value))}
                    disabled={disabled}
                    className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed accent-primary-600"
                />

                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min={MIN_FONT_SIZE}
                        max={MAX_FONT_SIZE}
                        value={fontSize}
                        onChange={(e) => {
                            const value = Number(e.target.value);
                            if (value >= MIN_FONT_SIZE && value <= MAX_FONT_SIZE) {
                                onChange(value);
                            }
                        }}
                        disabled={disabled}
                        className="w-16 px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white text-center focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">px</span>
                </div>
            </div>

            <div className="mt-1 flex justify-between text-xs text-gray-400 dark:text-gray-500">
                <span>{MIN_FONT_SIZE}px</span>
                <span>{MAX_FONT_SIZE}px</span>
            </div>
        </div>
    );
};

export default FontSizeSlider;
