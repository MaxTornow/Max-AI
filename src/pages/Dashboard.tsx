import React from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import logoImage from '../assets/Smartphone Freedom Lifestyle Logo 1.png';

const FEEDBACK_FORM_URL = 'https://wf9284vfpt6.typeform.com/to/CyB3Rq4K';

/**
 * Dashboard page - Welcome screen for MAXAI
 * @returns {JSX.Element} Dashboard page
 */
const Dashboard: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      {/* Logo */}
      <img
        src={logoImage}
        alt="Max Tornow AI Stack"
        className="h-32 md:h-40 mb-8"
      />

      {/* Welcome Headline */}
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white text-center mb-6">
        Welcome to Max Tornow's AI Stack System
      </h1>

      {/* Directional Arrow (desktop only) */}
      <div className="hidden md:flex items-center text-gray-600 dark:text-gray-400">
        <FiArrowLeft size={24} className="mr-2 animate-pulse" />
        <span className="text-lg">Pick your AI tool on the left</span>
      </div>

      {/* Mobile instruction */}
      <div className="md:hidden text-gray-600 dark:text-gray-400 text-center">
        <p className="text-lg">Tap the menu to pick your AI tool</p>
      </div>

      {/* Feedback card */}
      <div className="mt-12 w-full max-w-md">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            We want to hear your feedback
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Tell us about your experience so we can keep improving the tools.
          </p>
          <a
            href={FEEDBACK_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 rounded-md bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
          >
            <span className="mr-2 text-base" aria-hidden="true">❤️</span>
            Share your feedback
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
