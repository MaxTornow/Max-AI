import React from 'react';
import type { TextPosition } from '@services/tyler/types';

interface PositionSelectorProps {
    selectedPosition: TextPosition;
    onChange: (position: TextPosition) => void;
    disabled?: boolean;
}

const POSITIONS: { value: TextPosition; label: string }[] = [
    { value: 'top', label: 'Top' },
    { value: 'middle', label: 'Middle' },
    { value: 'bottom', label: 'Bottom' },
];

const PositionSelector: React.FC<PositionSelectorProps> = ({
    selectedPosition,
    onChange,
    disabled = false,
}) => {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Position
            </label>

            <div className="flex gap-2">
                {POSITIONS.map(({ value, label }) => (
                    <button
                        key={value}
                        onClick={() => onChange(value)}
                        disabled={disabled}
                        className={`
                            flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                            ${
                                selectedPosition === value
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default PositionSelector;
