import React from 'react';

interface YPositionSliderProps {
    value: number;
    onChange: (value: number) => void;
    disabled?: boolean;
    defaultValue?: number;
}

const GUIDE_MARKS = [
    { value: 0, label: 'Top' },
    { value: 33, label: '33%' },
    { value: 50, label: 'Mid' },
    { value: 66, label: '66%' },
    { value: 100, label: 'Bottom' },
];

/**
 * YPositionSlider - Vertical position control (0-100%)
 * 0% = text top edge at video top
 * 50% = text centered vertically
 * 100% = text bottom edge at video bottom
 */
const YPositionSlider: React.FC<YPositionSliderProps> = ({
    value,
    onChange,
    disabled = false,
    defaultValue = 50,
}) => {
    const handleReset = () => {
        if (!disabled) {
            onChange(defaultValue);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = Number(e.target.value);
        // Clamp to 0-100
        const clampedValue = Math.max(0, Math.min(100, newValue));
        onChange(clampedValue);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Vertical Position
                </label>
                <button
                    onClick={handleReset}
                    disabled={disabled || value === defaultValue}
                    className="text-xs text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Reset
                </button>
            </div>

            <div className="flex items-center gap-4">
                <input
                    type="range"
                    min={0}
                    max={100}
                    value={value}
                    onChange={handleInputChange}
                    disabled={disabled}
                    className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed accent-primary-600"
                />

                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min={0}
                        max={100}
                        value={value}
                        onChange={handleInputChange}
                        disabled={disabled}
                        className="w-16 px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white text-center focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
                </div>
            </div>

            {/* Clickable guide marks */}
            <div className="mt-2 flex justify-between">
                {GUIDE_MARKS.map(({ value: markValue, label }) => (
                    <button
                        key={markValue}
                        onClick={() => !disabled && onChange(markValue)}
                        disabled={disabled}
                        className={`text-xs px-1.5 py-0.5 rounded transition-colors disabled:cursor-not-allowed ${
                            value === markValue
                                ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-medium'
                                : 'text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default YPositionSlider;
