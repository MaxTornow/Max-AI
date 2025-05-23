import React from 'react';

/**
 * Faris Chat component
 * @returns {JSX.Element} Faris Chat page
 */
const FarisChat: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Faris Chat</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Facebook Automated Rewriting Intelligent Scholar - Rewrites Facebook posts into your personalized tone.
      </p>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <p className="text-center py-8 text-gray-500 dark:text-gray-400">
          This feature is under development. Check back soon!
        </p>
      </div>
    </div>
  );
};

export default FarisChat;