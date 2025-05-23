/**
 * Video Processing Form Component
 * 
 * This component provides a form for users to submit video processing requests.
 * It handles the submission of video URLs and story details for script generation.
 */

import React, { useState, useEffect } from 'react';
import useVideoProcessing from '../../hooks/useVideoProcessing';
import { VideoProcessingRequest } from '../../services/videoProcessing';

/**
 * Props for the VideoProcessingForm component
 */
interface VideoProcessingFormProps {
  onProcessingComplete?: (result: any) => void;
}

/**
 * Form component for processing videos and generating scripts
 */
const VideoProcessingForm: React.FC<VideoProcessingFormProps> = ({ onProcessingComplete }) => {
  // State for form fields
  const [videoUrl, setVideoUrl] = useState('');
  const [platform, setPlatform] = useState('instagram');
  
  /**
   * Detect platform from URL
   */
  useEffect(() => {
    if (!videoUrl) return;
    
    try {
      const url = new URL(videoUrl);
      const hostname = url.hostname.toLowerCase();
      
      if (hostname.includes('instagram.com') || hostname.includes('instagr.am')) {
        setPlatform('instagram');
      } else if (hostname.includes('tiktok.com') || hostname.includes('vm.tiktok.com')) {
        setPlatform('tiktok');
      }
      // Add more platform detection as needed
    } catch (error) {
      // Invalid URL, don't change platform
      console.log('Invalid URL format');
    }
  }, [videoUrl]);
  const [niche, setNiche] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [painPoints, setPainPoints] = useState('');
  const [communicationStyle, setCommunicationStyle] = useState('');
  const [heroStory, setHeroStory] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  
  // Use our custom hook
  const { 
    processVideo, 
    isProcessing, 
    progress, 
    error, 
    result, 
    reset 
  } = useVideoProcessing();

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create the request object
    const request: VideoProcessingRequest = {
      videoDetails: {
        url: videoUrl,
        platform
      },
      storyDetails: {
        niche,
        targetAudience,
        painPoints,
        communicationStyle,
        heroStory: heroStory || undefined
      },
      systemPrompt: systemPrompt || undefined
    };
    
    try {
      // Process the video
      const result = await processVideo(request);
      
      // Call the callback if provided
      if (onProcessingComplete) {
        onProcessingComplete(result);
      }
    } catch (err) {
      // Error is already handled by the hook
      console.error('Video processing failed:', err);
    }
  };

  /**
   * Reset the form and processing state
   */
  const handleReset = () => {
    setVideoUrl('');
    setPlatform('instagram');
    setNiche('');
    setTargetAudience('');
    setPainPoints('');
    setCommunicationStyle('');
    setHeroStory('');
    setSystemPrompt('');
    reset();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Video Processing</h2>
      
      {/* Error display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error.message}</p>
        </div>
      )}
      
      {/* Result display */}
      {result && !isProcessing && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Processing Complete!</p>
          <div className="mt-2">
            <h3 className="font-semibold">Transcription:</h3>
            <p className="text-sm mt-1 mb-3 max-h-32 overflow-y-auto">{result.transcription.substring(0, 200)}...</p>
            
            <h3 className="font-semibold">Generated Scripts:</h3>
            <div className="mt-1 mb-3">
              <details className="mb-2">
                <summary className="cursor-pointer font-medium">Script 1</summary>
                <p className="text-sm mt-1 pl-4">{result.scripts.script_1}</p>
              </details>
              <details className="mb-2">
                <summary className="cursor-pointer font-medium">Script 2</summary>
                <p className="text-sm mt-1 pl-4">{result.scripts.script_2}</p>
              </details>
              <details className="mb-2">
                <summary className="cursor-pointer font-medium">Script 3</summary>
                <p className="text-sm mt-1 pl-4">{result.scripts.script_3}</p>
              </details>
            </div>
            
            <button
              onClick={handleReset}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Process Another Video
            </button>
          </div>
        </div>
      )}
      
      {/* Progress display */}
      {isProcessing && (
        <div className="mb-6">
          <p className="mb-2">Processing video... {progress}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            This may take a few minutes. Please don't close this page.
          </p>
        </div>
      )}
      
      {/* Form */}
      {!result && !isProcessing && (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="videoUrl">
              Video URL
            </label>
            <input
              id="videoUrl"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="https://www.instagram.com/reel/..."
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="platform">
              Platform
            </label>
            <select
              id="platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              {/* Add other platforms as they become supported */}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="niche">
              Niche
            </label>
            <input
              id="niche"
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="e.g., Fitness, Business, Personal Development"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="targetAudience">
              Target Audience
            </label>
            <input
              id="targetAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="e.g., Entrepreneurs, Fitness enthusiasts"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="painPoints">
              Pain Points
            </label>
            <textarea
              id="painPoints"
              value={painPoints}
              onChange={(e) => setPainPoints(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Describe the pain points of your target audience"
              rows={3}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="communicationStyle">
              Communication Style
            </label>
            <input
              id="communicationStyle"
              type="text"
              value={communicationStyle}
              onChange={(e) => setCommunicationStyle(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="e.g., Casual, Professional, Motivational"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="heroStory">
              Hero Story (Optional)
            </label>
            <textarea
              id="heroStory"
              value={heroStory}
              onChange={(e) => setHeroStory(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Share a hero story if applicable"
              rows={3}
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="systemPrompt">
              Additional Instructions (Optional)
            </label>
            <textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Any additional instructions for script generation"
              rows={3}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={isProcessing}
            >
              Process Video
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={isProcessing}
            >
              Reset
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default VideoProcessingForm;
