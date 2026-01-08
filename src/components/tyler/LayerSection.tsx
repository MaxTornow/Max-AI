import React from 'react';
import { FiChevronDown } from 'react-icons/fi';

interface LayerSectionProps {
    title: string;
    enabled: boolean;
    onEnabledChange: (enabled: boolean) => void;
    isExpanded: boolean;
    onExpandedChange: (expanded: boolean) => void;
    disabled?: boolean;
    children: React.ReactNode;
}

/**
 * LayerSection - Collapsible section component with toggle switch
 * Used for headline and body text layer controls in TextEditor
 */
const LayerSection: React.FC<LayerSectionProps> = ({
    title,
    enabled,
    onEnabledChange,
    isExpanded,
    onExpandedChange,
    disabled = false,
    children,
}) => {
    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                    {/* Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => onEnabledChange(e.target.checked)}
                            disabled={disabled}
                            className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-300 peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-500 peer-checked:bg-primary-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                    </label>
                    <span className={`font-medium ${enabled ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                        {title}
                    </span>
                </div>

                {/* Expand/Collapse Button */}
                <button
                    onClick={() => onExpandedChange(!isExpanded)}
                    disabled={disabled || !enabled}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-expanded={isExpanded}
                >
                    <FiChevronDown
                        className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                </button>
            </div>

            {/* Collapsible Content with CSS Grid Animation */}
            <div
                className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                style={{ gridTemplateRows: isExpanded && enabled ? '1fr' : '0fr' }}
            >
                <div className="min-h-0 overflow-hidden">
                    <div className="p-4 space-y-4 border-t border-gray-200 dark:border-gray-700">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LayerSection;
