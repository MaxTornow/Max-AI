import React from 'react';
import { FiAlignLeft, FiAlignCenter, FiAlignRight } from 'react-icons/fi';
import type { TextAlignment } from '@services/tyler/types';

interface AlignmentSelectorProps {
    selectedAlignment: TextAlignment;
    onChange: (alignment: TextAlignment) => void;
    disabled?: boolean;
}

const ALIGNMENTS: { value: TextAlignment; label: string; icon: React.ElementType }[] = [
    { value: 'left', label: 'Left', icon: FiAlignLeft },
    { value: 'center', label: 'Center', icon: FiAlignCenter },
    { value: 'right', label: 'Right', icon: FiAlignRight },
];

const AlignmentSelector: React.FC<AlignmentSelectorProps> = ({
    selectedAlignment,
    onChange,
    disabled = false,
}) => {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Alignment
            </label>

            <div className="flex gap-2">
                {ALIGNMENTS.map(({ value, label, icon: Icon }) => (
                    <button
                        key={value}
                        onClick={() => onChange(value)}
                        disabled={disabled}
                        title={label}
                        className={`
                            flex-1 px-4 py-2 rounded-lg flex items-center justify-center transition-colors
                            ${
                                selectedAlignment === value
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                    >
                        <Icon className="w-5 h-5" />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default AlignmentSelector;
