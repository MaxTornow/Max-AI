import React from 'react';
import { FiPlus } from 'react-icons/fi';
import StyleCard from './StyleCard';
import type { Style } from '../../services/styles';

interface StylesListProps {
  styles: Style[];
  isLoading: boolean;
  onCreateNew: () => void;
  onEdit: (style: Style) => void;
  onDelete: (styleId: string) => void;
  onSelect: (style: Style) => void;
}

/**
 * Component for displaying a grid of style cards
 * @param {StylesListProps} props - Component props
 * @returns {JSX.Element} StylesList component
 */
const StylesList: React.FC<StylesListProps> = ({ 
  styles, 
  isLoading, 
  onCreateNew,
  onEdit,
  onDelete,
  onSelect
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-pulse flex flex-col space-y-4 w-full">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Create New Style Card */}
        <div 
          onClick={onCreateNew}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col justify-center items-center p-8"
        >
          <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
            <FiPlus size={24} className="text-primary-600 dark:text-primary-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Create New Style</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Add a custom writing style for your AI-generated content
          </p>
        </div>
        
        {/* Style Cards */}
        {styles.map((style) => (
          <StyleCard
            key={style.id}
            style={style}
            onEdit={onEdit}
            onDelete={onDelete}
            onSelect={onSelect}
          />
        ))}
      </div>
      
      {styles.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-8 text-center mt-6">
          <p className="text-gray-600 dark:text-gray-400">
            You haven't created any styles yet. Create your first style to get started!
          </p>
        </div>
      )}
    </div>
  );
};

export default StylesList;
