import React from 'react';
import { FiEdit2, FiTrash2, FiCopy } from 'react-icons/fi';
import type { Style } from '../../services/styles';

interface StyleCardProps {
  style: Style;
  onEdit: (style: Style) => void;
  onDelete: (styleId: string) => void;
  onSelect: (style: Style) => void;
}

/**
 * Component for displaying a single style card with actions
 * @param {StyleCardProps} props - Component props
 * @returns {JSX.Element} StyleCard component
 */
const StyleCard: React.FC<StyleCardProps> = ({ style, onEdit, onDelete, onSelect }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow" data-component-name="StyleCard">
      <div className="p-5" data-component-name="StyleCard">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{style.name}</h3>
          {/* Platform badge removed as requested */}
        </div>
        
        {style.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
            {style.description}
          </p>
        )}
        
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded p-3 mb-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
            {style.content}
          </p>
        </div>
        
        <div className="flex justify-between items-center pt-2">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(style.updated_at).toLocaleDateString()}
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={() => onSelect(style)}
              className="p-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              aria-label="Use style"
            >
              <FiCopy size={16} />
            </button>
            <button 
              onClick={() => onEdit(style)}
              className="p-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              aria-label="Edit style"
            >
              <FiEdit2 size={16} />
            </button>
            <button 
              onClick={() => onDelete(style.id)}
              className="p-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              aria-label="Delete style"
            >
              <FiTrash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StyleCard;
