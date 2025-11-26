import React from 'react';
import { FiZoomIn, FiImage, FiGlobe } from 'react-icons/fi';
import { SUPPORTED_LANGUAGES } from '@services/betty/types';

interface FeatureTogglesProps {
  magicZooms: boolean;
  magicBrolls: boolean;
  magicBrollsPercentage: number;
  language: string;
  onMagicZoomsChange: (value: boolean) => void;
  onMagicBrollsChange: (value: boolean) => void;
  onMagicBrollsPercentageChange: (value: number) => void;
  onLanguageChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * AI feature toggles component
 */
const FeatureToggles: React.FC<FeatureTogglesProps> = ({
  magicZooms,
  magicBrolls,
  magicBrollsPercentage,
  language,
  onMagicZoomsChange,
  onMagicBrollsChange,
  onMagicBrollsPercentageChange,
  onLanguageChange,
  disabled = false,
}) => {
  return (
    <div className="w-full space-y-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        AI Features
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Magic Zooms Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <FiZoomIn className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Magic Zooms
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Auto-zoom on key moments
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={magicZooms}
              onChange={(e) => onMagicZoomsChange(e.target.checked)}
              disabled={disabled}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed" />
          </label>
        </div>

        {/* Magic B-rolls Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
              <FiImage className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Magic B-rolls
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                AI-selected background clips
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={magicBrolls}
              onChange={(e) => onMagicBrollsChange(e.target.checked)}
              disabled={disabled}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed" />
          </label>
        </div>
      </div>

      {/* B-roll Percentage Slider (only shown when B-rolls enabled) */}
      {magicBrolls && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              B-roll Percentage
            </label>
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
              {magicBrollsPercentage}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={magicBrollsPercentage}
            onChange={(e) => onMagicBrollsPercentageChange(parseInt(e.target.value))}
            disabled={disabled}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-600"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* Language Selector */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
            <FiGlobe className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Video Language
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Language spoken in the video
            </p>
          </div>
        </div>
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default FeatureToggles;
