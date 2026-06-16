import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import type { Style, StyleInsert } from '../../services/styles';
import { useAuth } from '../../context/AuthContext';

interface StyleFormProps {
  initialStyle?: Style;
  onSubmit: (style: Omit<StyleInsert, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

/**
 * Form component for creating and editing styles
 * @param {StyleFormProps} props - Component props
 * @returns {JSX.Element} StyleForm component
 */
const StyleForm: React.FC<StyleFormProps> = ({ 
  initialStyle, 
  onSubmit, 
  onCancel,
  isSubmitting 
}) => {
  // Form state
  const [name, setName] = useState(initialStyle?.name || '');
  const [niche, setNiche] = useState(initialStyle?.niche || '');
  const [targetAudience, setTargetAudience] = useState(initialStyle?.target_audience || '');
  const [painPointsText, setPainPointsText] = useState(
    initialStyle?.pain_points ? initialStyle.pain_points.join('\n') : ''
  );
  const [communicationStyle, setCommunicationStyle] = useState(
    initialStyle?.communication_style || initialStyle?.content || ''
  );
  const [heroStory, setHeroStory] = useState(
    initialStyle?.hero_story || initialStyle?.description || ''
  );
  
  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate the form fields
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) newErrors.name = 'Info title is required';
    if (!niche.trim()) newErrors.niche = 'Niche is required';
    if (!targetAudience.trim()) newErrors.targetAudience = 'Target audience is required';
    if (!painPointsText.trim()) newErrors.painPoints = 'At least one pain point is required';
    if (!communicationStyle.trim()) newErrors.communicationStyle = 'Communication style is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Process pain points from text area to array
  const processPainPoints = () => {
    return painPointsText
      .split('\n')
      .map(point => point.trim())
      .filter(point => point.length > 0);
  };

  // Get the current user from auth context
  const { user } = useAuth();
  
  // Handle form submission
  const handleFormSubmit = async () => {
    console.log('Submit handler called');
    
    // Check if user is authenticated
    if (!user?.id) {
      console.error('Cannot submit form: No user ID available');
      alert('You must be logged in to create or edit info. Please log in and try again.');
      window.location.href = '/login';
      return;
    }
    
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }
    
    const processedPainPoints = processPainPoints();
    console.log('Pain points processed:', processedPainPoints);
    
    const styleData = {
      name,
      niche,
      target_audience: targetAudience,
      pain_points: processedPainPoints,
      communication_style: communicationStyle,
      hero_story: heroStory || null,
      // For backward compatibility
      content: communicationStyle,
      description: heroStory || null,
      user_id: user.id // Use the current user's ID from auth context
    };
    
    console.log('Submitting style data:', styleData);
    console.log('Is user_id present?', Boolean(styleData.user_id));
    
    try {
      console.log('About to call onSubmit function');
      await onSubmit(styleData);
      console.log('Style submitted successfully');
    } catch (error) {
      console.error('Error submitting style:', error);
      alert(`Error creating info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {initialStyle ? 'Edit Info' : 'Create New Info'}
        </h2>
        <button
          onClick={onCancel}
          className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Close"
        >
          <FiX size={20} />
        </button>
      </div>
      
      {/* Style Name */}
      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Info Title
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white`}
          placeholder="Enter a title for this info"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
      </div>
      
      {/* Niche */}
      <div className="mb-4">
        <label htmlFor="niche" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Niche
        </label>
        <input
          type="text"
          id="niche"
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          className={`w-full px-3 py-2 border ${errors.niche ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white`}
          placeholder="Enter your business niche (e.g., Fitness Coaching)"
        />
        {errors.niche && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.niche}</p>}
      </div>
      
      {/* Target Audience */}
      <div className="mb-4">
        <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Target Audience
        </label>
        <input
          type="text"
          id="targetAudience"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          className={`w-full px-3 py-2 border ${errors.targetAudience ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white`}
          placeholder="Describe who you want to make content for (e.g. Busy Professionals aged 30-45)"
        />
        {errors.targetAudience && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.targetAudience}</p>}
      </div>
      
      {/* Pain Points */}
      <div className="mb-4">
        <label htmlFor="painPoints" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Pain Points/Interests of your Target Audience
        </label>
        <textarea
          id="painPoints"
          value={painPointsText}
          onChange={(e) => setPainPointsText(e.target.value)}
          rows={3}
          className={`w-full px-3 py-2 border ${errors.painPoints ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white`}
          placeholder="List pain points, one per line (e.g., Lack of time, Inconsistent results)"
        />
        {errors.painPoints && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.painPoints}</p>}
      </div>
      
      {/* Communication Style */}
      <div className="mb-4">
        <label htmlFor="communicationStyle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Communication Style
        </label>
        <textarea
          id="communicationStyle"
          value={communicationStyle}
          onChange={(e) => setCommunicationStyle(e.target.value)}
          rows={3}
          className={`w-full px-3 py-2 border ${errors.communicationStyle ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white`}
          placeholder="Describe your preferred communication style (e.g., professional, conversational, direct)"
        />
        {errors.communicationStyle && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.communicationStyle}</p>}
      </div>
      
      {/* Hero Story */}
      <div className="mb-6">
        <label htmlFor="heroStory" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Hero Story (Optional)
        </label>
        <textarea
          id="heroStory"
          value={heroStory}
          onChange={(e) => setHeroStory(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
          placeholder="Share a personal story that resonates with your audience (optional)"
        />
      </div>
      
      {/* Platform field removed */}
      
      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleFormSubmit}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
          data-testid="submit-style-button"
          data-component-name="StyleForm"
        >
          {isSubmitting ? 'Saving...' : initialStyle ? 'Update Info' : 'Create Info'}
        </button>
      </div>
    </div>
  );
};

export default StyleForm;
