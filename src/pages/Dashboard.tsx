import React from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import logoImage from '../assets/Smartphone Freedom Lifestyle Logo 1.png';

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
    </div>
  );
};

export default Dashboard;
