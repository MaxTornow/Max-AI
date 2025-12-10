import React from 'react';
import { FiCheck } from 'react-icons/fi';
import { VINCE_TEMPLATES } from '@services/vince/templates';
import type { VinceTemplate } from '@services/vince/types';

interface TemplateSelectorProps {
  selectedTemplate: VinceTemplate;
  onSelectTemplate: (template: VinceTemplate) => void;
  disabled?: boolean;
}

/**
 * Template selector grid component
 */
const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplate,
  onSelectTemplate,
  disabled = false,
}) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Choose Template Style
      </label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {VINCE_TEMPLATES.map((template) => {
          const isSelected = selectedTemplate.key === template.key;
          return (
            <button
              key={template.key}
              onClick={() => !disabled && onSelectTemplate(template)}
              disabled={disabled}
              className={`
                relative p-4 rounded-lg border-2 text-left transition-all
                ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Color indicator */}
              <div
                className="w-full h-2 rounded-full mb-3"
                style={{ backgroundColor: template.previewColor }}
              />

              {/* Template info */}
              <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                {template.name}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {template.description}
              </p>

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                  <FiCheck className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TemplateSelector;
