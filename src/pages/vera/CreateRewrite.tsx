import React, { useState, useEffect } from 'react';
import { FiChevronDown, FiChevronUp, FiPlus, FiCopy, FiSave, FiExternalLink, FiTrash2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import StyleForm from '../../components/styles/StyleForm';
import { useAuth } from '../../context/AuthContext';
import { useStyles } from '../../context/StylesContext';
import { useToast } from '../../context/ToastContext';
import { processVideo, VideoProcessingRequest } from '../../services/videoProcessing';
import { ProcessingStatus, ProcessingStage } from '../../services/videoProcessing/types';
import { saveRewriteScript, RewriteParameters, getUserRewrites, deleteRewrite, RewriteRow } from '../../services/rewrites/rewriteService';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

/**
 * Step interface for the rewrite creation process
 */
interface Step {
  id: number;
  title: string;
  isOpen: boolean;
  isCompleted: boolean;
}

/**
 * Modal interface for the style form
 */
interface Modal {
  isOpen: boolean;
  type: 'create' | 'edit';
}

/**
 * Get a user-friendly description for a processing stage
 * @param {ProcessingStage} stage - The current processing stage
 * @returns {string} A user-friendly description
 */
const getStageDescription = (stage: ProcessingStage): string => {
  switch (stage) {
    case 'initializing':
      return 'Preparing to process video';
    case 'fetching_video_info':
      return 'Getting video information';
    case 'downloading_video':
      return 'Downloading video content';
    case 'uploading_to_transcription_service':
      return 'Preparing for transcription';
    case 'transcribing_video':
      return 'Converting speech to text';
    case 'generating_scripts':
      return 'Creating script variations';
    case 'completed':
      return 'Processing complete';
    case 'error':
      return 'Error occurred';
    default:
      return 'Processing video';
  }
};

/**
 * Format seconds into a human-readable time string
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
const formatTimeRemaining = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }
};

/**
 * Create Rewrite component for VERA
 * @returns {JSX.Element} Create Rewrite page
 */
const CreateRewrite: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  // State for managing steps
  const [steps, setSteps] = useState<Step[]>([
    { id: 1, title: 'Video Input', isOpen: true, isCompleted: false },
    { id: 2, title: 'Story & Communication Style', isOpen: false, isCompleted: false },
    { id: 3, title: 'Generated Scripts', isOpen: false, isCompleted: false },
  ]);
  
  // State for video URL input
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [platform, setPlatform] = useState<string>('instagram');
  
  // Get styles from context
  const { styles, isLoading, error, addStyle } = useStyles();
  
  // Local state
  const [selectedStyleId, setSelectedStyleId] = useState<string>('');
  
  // State for style form modal
  const [modal, setModal] = useState<Modal>({ isOpen: false, type: 'create' });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Video processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [processingResult, setProcessingResult] = useState<any>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    stage: 'initializing',
    progress: 0,
    message: 'Preparing to process video...'
  });
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | undefined>(undefined);

  // Saved rewrites state
  const [savedRewrites, setSavedRewrites] = useState<RewriteRow[]>([]);
  const [rewritesLoading, setRewritesLoading] = useState<boolean>(true);
  const [rewritesError, setRewritesError] = useState<string | null>(null);
  const [expandedRewrite, setExpandedRewrite] = useState<string | null>(null);
  const [showSavedRewrites, setShowSavedRewrites] = useState<boolean>(false);
  const [deletingRewrite, setDeletingRewrite] = useState<string | null>(null);
  const [rewriteToDelete, setRewriteToDelete] = useState<RewriteRow | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  // Platform detection from URL
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
    } catch (error) {
      // Invalid URL, don't change platform
      console.log('Invalid URL format');
    }
  }, [videoUrl]);

  // Load saved rewrites
  useEffect(() => {
    const fetchRewrites = async () => {
      if (!user) return;

      try {
        setRewritesLoading(true);
        const { data, error } = await getUserRewrites(user.id);

        if (error) {
          setRewritesError(error);
        } else if (data) {
          setSavedRewrites(data);
        }
      } catch (err: any) {
        setRewritesError(err.message || 'An error occurred while fetching rewrites');
      } finally {
        setRewritesLoading(false);
      }
    };

    fetchRewrites();
  }, [user]);

  /**
   * Toggle step collapse/expand
   * @param {number} stepId - The ID of the step to toggle
   */
  const toggleStep = (stepId: number) => {
    setSteps(steps.map(step => 
      step.id === stepId ? { ...step, isOpen: !step.isOpen } : step
    ));
  };

  /**
   * Handle continue to next step
   * @param {number} currentStepId - The ID of the current step
   */
  const handleContinue = async (currentStepId: number) => {
    // If this is step 2, process the video before continuing
    if (currentStepId === 2) {
      await processVideoAndGenerateScripts();
    } else {
      // Mark current step as completed
      setSteps(steps.map(step => 
        step.id === currentStepId ? { ...step, isCompleted: true, isOpen: false } : step
      ));
      
      // Open next step if it exists
      const nextStepId = currentStepId + 1;
      if (nextStepId <= steps.length) {
        setSteps(steps.map(step => 
          step.id === nextStepId ? { ...step, isOpen: true } : step
        ));
      }
      
      // If this is Step 1 and we have both a video URL and a selected style,
      // automatically open Step 3 (Generated Scripts) as well
      if (currentStepId === 1 && videoUrl && selectedStyleId) {
        setSteps(steps.map(step => 
          step.id === 3 ? { ...step, isOpen: true } : step
        ));
      }
    }
  };
  
  /**
   * Process video and generate scripts
   */
  const processVideoAndGenerateScripts = async () => {
    if (!videoUrl || !selectedStyleId) return;
    
    // Get the selected style
    const selectedStyle = styles.find(s => s.id === selectedStyleId);
    if (!selectedStyle) return;
    
    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingError(null);
    setProcessingStatus({
      stage: 'initializing',
      progress: 0,
      message: 'Preparing to process video...'
    });
    
    try {
      // Create the request object
      const request: VideoProcessingRequest = {
        videoDetails: {
          url: videoUrl,
          platform
        },
        storyDetails: {
          niche: selectedStyle.niche || '',
          targetAudience: selectedStyle.target_audience || '',
          painPoints: selectedStyle.pain_points?.join(', ') || '',
          communicationStyle: selectedStyle.communication_style || '',
          heroStory: selectedStyle.hero_story || undefined
        },
        // Add a custom system prompt if needed
        systemPrompt: undefined
      };
      
      // Process the video with status updates
      const result = await processVideo(request, (status: ProcessingStatus) => {
        setProcessingStatus(status);
        setProcessingProgress(status.progress);
        setEstimatedTimeRemaining(status.estimatedTimeRemaining);
      });
      
      setProcessingResult(result);
      
      // Mark current step as completed
      setSteps(steps.map(step => 
        step.id === 2 ? { ...step, isCompleted: true, isOpen: false } : step
      ));
      
      // Open next step
      setSteps(steps.map(step => 
        step.id === 3 ? { ...step, isOpen: true } : step
      ));
    } catch (error) {
      console.error('Error processing video:', error);
      setProcessingError(error instanceof Error ? error.message : 'Unknown error occurred');
      setProcessingStatus({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  /**
   * Copy text to clipboard
   * @param {string} text - The text to copy
   */
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        showToast('Copied to clipboard!', 'success');
        console.log('Text copied to clipboard');
      })
      .catch(err => {
        showToast('Failed to copy text', 'error');
        console.error('Failed to copy text: ', err);
      });
  };
  
  /**
   * Save a single rewrite to Supabase
   * @param {string} content - The rewrite content to save
   * @param {number} scriptNumber - The script number (1, 2, or 3)
   */
  const saveRewrite = async (content: string, scriptNumber: number) => {
    if (!user || !processingResult) return;
    
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);
    
    try {
      // Get the selected style for parameters
      const selectedStyle = styles.find(s => s.id === selectedStyleId);
      
      if (!selectedStyle) {
        setSaveError('Style not found');
        showToast('Style not found. Please select a style.', 'error');
        setIsSaving(false);
        return;
      }
      
      // Create parameters object from the selected style
      const parameters: RewriteParameters = {
        niche: selectedStyle.niche,
        target_audience: selectedStyle.target_audience,
        pain_points: selectedStyle.pain_points,
        communication_style: selectedStyle.communication_style,
        hero_story: selectedStyle.hero_story
      };
      
      // Save the rewrite
      const { data, error, isDuplicate } = await saveRewriteScript(
        user.id,
        videoUrl,
        platform as 'tiktok' | 'instagram',
        content,
        parameters
      );
      
      if (error) {
        setSaveError(error);
        showToast(`Error saving rewrite: ${error}`, 'error');
        console.error('Error saving rewrite:', error);
      } else if (isDuplicate) {
        showToast(`This rewrite has already been saved.`, 'warning');
        console.log(`Script ${scriptNumber} already exists in saved rewrites`);
      } else {
        setSaveSuccess(true);
        showToast(`Script ${scriptNumber} saved successfully!`, 'success');
        console.log(`Script ${scriptNumber} saved successfully`, data);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'An error occurred while saving';
      setSaveError(errorMsg);
      showToast(errorMsg, 'error');
      console.error('Error in saveRewrite:', err);
    } finally {
      setIsSaving(false);
    }
  };
  
  /**
   * Save all rewrites to Supabase
   */
  const saveAllRewrites = async () => {
    if (!user || !processingResult) return;
    
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);
    
    try {
      // Get the selected style for parameters
      const selectedStyle = styles.find(s => s.id === selectedStyleId);
      
      if (!selectedStyle) {
        setSaveError('Style not found');
        showToast('Style not found. Please select a style.', 'error');
        setIsSaving(false);
        return;
      }
      
      // Create parameters object from the selected style
      const parameters: RewriteParameters = {
        niche: selectedStyle.niche,
        target_audience: selectedStyle.target_audience,
        pain_points: selectedStyle.pain_points,
        communication_style: selectedStyle.communication_style,
        hero_story: selectedStyle.hero_story
      };
      
      // Save all three scripts
      const promises = [
        saveRewriteScript(
          user.id,
          videoUrl,
          platform as 'tiktok' | 'instagram',
          processingResult.scripts.script_1,
          parameters
        ),
        saveRewriteScript(
          user.id,
          videoUrl,
          platform as 'tiktok' | 'instagram',
          processingResult.scripts.script_2,
          parameters
        ),
        saveRewriteScript(
          user.id,
          videoUrl,
          platform as 'tiktok' | 'instagram',
          processingResult.scripts.script_3,
          parameters
        )
      ];
      
      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error).map(r => r.error);
      const duplicates = results.filter(r => r.isDuplicate).length;
      const successCount = results.length - errors.length - duplicates;
      
      if (errors.length > 0) {
        const errorMsg = `${errors.length} error(s) occurred while saving`;
        setSaveError(errorMsg);
        showToast(errorMsg, 'error');
        console.error('Errors saving rewrites:', errors);
      } else if (duplicates === results.length) {
        // All were duplicates
        showToast('All rewrites have already been saved.', 'warning');
      } else {
        setSaveSuccess(true);
        
        if (duplicates > 0) {
          showToast(`${successCount} rewrites saved. ${duplicates} were already saved.`, 'success');
        } else {
          showToast('All rewrites saved successfully!', 'success');
        }
        
        console.log('Scripts saved successfully', { 
          saved: successCount, 
          duplicates: duplicates 
        });
        
        // Navigate to My Styles page after a short delay
        setTimeout(() => {
          navigate('/styles');
        }, 1500);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'An error occurred while saving';
      setSaveError(errorMsg);
      showToast(errorMsg, 'error');
      console.error('Error in saveAllRewrites:', err);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Toggle expand/collapse for a saved rewrite
   */
  const toggleExpandRewrite = (id: string) => {
    setExpandedRewrite(expandedRewrite === id ? null : id);
  };

  /**
   * Handle delete button click - show confirmation modal
   */
  const handleDeleteRewriteClick = (rewrite: RewriteRow, e: React.MouseEvent) => {
    e.stopPropagation();
    setRewriteToDelete(rewrite);
    setShowDeleteModal(true);
  };

  /**
   * Confirm and execute delete
   */
  const handleConfirmDeleteRewrite = async () => {
    if (!rewriteToDelete) return;

    setDeletingRewrite(rewriteToDelete.id);

    try {
      const { success, error } = await deleteRewrite(rewriteToDelete.id);

      if (success) {
        setSavedRewrites(prev => prev.filter(r => r.id !== rewriteToDelete.id));
        showToast('Rewrite deleted successfully', 'success');
      } else {
        showToast(error || 'Failed to delete rewrite', 'error');
      }
    } catch (err: any) {
      showToast('An unexpected error occurred', 'error');
    } finally {
      setDeletingRewrite(null);
      setShowDeleteModal(false);
      setRewriteToDelete(null);
    }
  };

  /**
   * Cancel delete operation
   */
  const handleCancelDeleteRewrite = () => {
    setShowDeleteModal(false);
    setRewriteToDelete(null);
  };

  /**
   * Format date for display
   */
  const formatRewriteDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Handle video URL input change
   * @param {React.ChangeEvent<HTMLInputElement>} e - Input change event
   */
  const handleVideoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideoUrl(e.target.value);
  };
  

  
  /**
   * Handle style selection change
   * @param {React.ChangeEvent<HTMLSelectElement>} e - Select change event
   */
  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStyleId(e.target.value);
  };
  
  /**
   * Open the style form modal
   */
  const openStyleModal = () => {
    setModal({ isOpen: true, type: 'create' });
  };
  
  /**
   * Close the style form modal
   */
  const closeStyleModal = () => {
    setModal({ ...modal, isOpen: false });
  };
  
  /**
   * Handle style form submission
   * @param {Omit<StyleInsert, 'id' | 'created_at' | 'updated_at'>} styleData - The style data to submit
   */
  const handleStyleSubmit = async (styleData: any) => {
    if (!user?.id) {
      alert('You must be logged in to create styles.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Use the addStyle function from context to create the style
      // This will update the styles state in the context, making it available throughout the app
      const newStyle = await addStyle(styleData);
      
      // Select the newly created style
      setSelectedStyleId(newStyle.id);
      
      // Close the modal
      closeStyleModal();
    } catch (err) {
      console.error('Error creating style:', err);
      alert('Failed to create style. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Create New Rewrite</h1>
      
      {/* Step 1: Video Input */}
      <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div 
          className={`flex items-center justify-between p-4 cursor-pointer ${steps[0].isCompleted ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
          onClick={() => toggleStep(1)}
        >
          <div className="flex items-center">
            <span className="mr-2 font-medium">Step 1: Video Input</span>
            {steps[0].isCompleted && (
              <span className="text-xs bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 px-2 py-1 rounded-full">Completed</span>
            )}
          </div>
          {steps[0].isOpen ? <FiChevronUp /> : <FiChevronDown />}
        </div>
        
        {steps[0].isOpen && (
          <div className="p-4 border-t dark:border-gray-700">
            <div className="mb-4">
              <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Video URL
              </label>
              <input
                type="text"
                id="videoUrl"
                placeholder="Enter TikTok or Instagram video URL"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                value={videoUrl}
                onChange={handleVideoUrlChange}
              />
            </div>
            <button
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!videoUrl.trim()}
              onClick={() => handleContinue(1)}
              data-component-name="CreateRewrite"
            >
              Continue
            </button>
          </div>
        )}
      </div>
      
      {/* Step 2: Story & Communication Style */}
      <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div 
          className={`flex items-center justify-between p-4 cursor-pointer ${steps[1].isCompleted ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
          onClick={() => toggleStep(2)}
        >
          <div className="flex items-center">
            <span className="mr-2 font-medium">Step 2: Story & Communication Style</span>
            {steps[1].isCompleted && (
              <span className="text-xs bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 px-2 py-1 rounded-full">Completed</span>
            )}
          </div>
          {steps[1].isOpen ? <FiChevronUp /> : <FiChevronDown />}
        </div>
        
        {steps[1].isOpen && (
          <div className="p-4 border-t dark:border-gray-700">
            {/* Style Selection */}
            <div className="mb-6">
              <label htmlFor="styleSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Choose a Style
              </label>
              <div className="flex items-center space-x-3">
                <select
                  id="styleSelect"
                  value={selectedStyleId}
                  onChange={handleStyleChange}
                  className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  disabled={isLoading || styles.length === 0}
                >
                  <option value="">Select a style...</option>
                  {styles.map(style => (
                    <option key={style.id} value={style.id}>
                      {style.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={openStyleModal}
                  className="p-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  title="Create New Style"
                >
                  <FiPlus size={20} />
                </button>
              </div>
              {isLoading && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading styles...</p>
              )}
              {error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              {!isLoading && styles.length === 0 && !error && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  No styles found. Create a new style to continue.
                </p>
              )}
            </div>
            
            {/* Style Preview (if a style is selected) */}
            {selectedStyleId && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Style Preview</h3>
                {styles.find(s => s.id === selectedStyleId) && (
                  <div className="text-sm">
                    <p className="mb-1"><span className="font-medium">Niche:</span> {styles.find(s => s.id === selectedStyleId)?.niche}</p>
                    <p className="mb-1"><span className="font-medium">Target Audience:</span> {styles.find(s => s.id === selectedStyleId)?.target_audience}</p>
                    <p className="mb-1"><span className="font-medium">Communication Style:</span> {styles.find(s => s.id === selectedStyleId)?.communication_style}</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Other form fields for Step 2 will go here */}
            
            <button
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                // First, toggle Step 3 to be open
                setSteps(prevSteps => prevSteps.map(step => 
                  step.id === 3 ? { ...step, isOpen: true } : step
                ));
                
                // Then proceed with normal handling
                handleContinue(2);
              }}
              disabled={!selectedStyleId}
              data-component-name="CreateRewrite"
            >
              {videoUrl && selectedStyleId ? 'Generate Scripts' : 'Continue'}
            </button>
          </div>
        )}
      </div>
      
      {/* Step 3: Generated Scripts */}
      <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div 
          className={`flex items-center justify-between p-4 cursor-pointer ${steps[2].isCompleted ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
          onClick={() => toggleStep(3)}
        >
          <div className="flex items-center">
            <span className="mr-2 font-medium">Step 3: Generated Scripts</span>
            {steps[2].isCompleted && (
              <span className="text-xs bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 px-2 py-1 rounded-full">Completed</span>
            )}
          </div>
          {steps[2].isOpen ? <FiChevronUp /> : <FiChevronDown />}
        </div>
        
        {steps[2].isOpen && (
          <div className="p-4 border-t dark:border-gray-700">
            {isProcessing && (
              <div className="mb-6">
                <p className="mb-2">{processingStatus.message} ({processingProgress}%)</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {getStageDescription(processingStatus.stage)}
                  </p>
                  {estimatedTimeRemaining !== undefined && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Estimated time remaining: {formatTimeRemaining(estimatedTimeRemaining)}
                    </p>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  This may take a few minutes. Please don't close this page.
                </p>
              </div>
            )}
            
            {processingError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <p className="font-bold">Error</p>
                <p>{processingError}</p>
              </div>
            )}
            
            {processingResult && !isProcessing && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Transcription</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {processingResult.transcription.substring(0, 300)}...
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Generated Scripts</h3>
                  
                  <div className="space-y-4">
                    {/* Script 1 */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                      <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700">
                        <h4 className="font-medium">Script 1</h4>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => copyToClipboard(processingResult.scripts.script_1)}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            title="Copy to clipboard"
                          >
                            <FiCopy size={18} />
                          </button>
                          <button 
                            onClick={() => saveRewrite(processingResult.scripts.script_1, 1)}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            title="Save rewrite"
                          >
                            <FiSave size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="whitespace-pre-line text-gray-700 dark:text-gray-300">
                          {processingResult.scripts.script_1}
                        </p>
                      </div>
                    </div>
                    
                    {/* Script 2 */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                      <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700">
                        <h4 className="font-medium">Script 2</h4>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => copyToClipboard(processingResult.scripts.script_2)}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            title="Copy to clipboard"
                          >
                            <FiCopy size={18} />
                          </button>
                          <button 
                            onClick={() => saveRewrite(processingResult.scripts.script_2, 2)}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            title="Save rewrite"
                          >
                            <FiSave size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="whitespace-pre-line text-gray-700 dark:text-gray-300">
                          {processingResult.scripts.script_2}
                        </p>
                      </div>
                    </div>
                    
                    {/* Script 3 */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                      <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700">
                        <h4 className="font-medium">Script 3</h4>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => copyToClipboard(processingResult.scripts.script_3)}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            title="Copy to clipboard"
                          >
                            <FiCopy size={18} />
                          </button>
                          <button 
                            onClick={() => saveRewrite(processingResult.scripts.script_3, 3)}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            title="Save rewrite"
                          >
                            <FiSave size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="whitespace-pre-line text-gray-700 dark:text-gray-300">
                          {processingResult.scripts.script_3}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Save status messages */}
                {saveSuccess && (
                  <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                    <p>Rewrite saved successfully!</p>
                  </div>
                )}
                
                {saveError && (
                  <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <p className="font-bold">Error saving rewrite</p>
                    <p>{saveError}</p>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <button
                    className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                    onClick={() => {
                      setProcessingResult(null);
                      setVideoUrl('');
                      setSelectedStyleId('');
                      setSteps([
                        { id: 1, title: 'Video Input', isOpen: true, isCompleted: false },
                        { id: 2, title: 'Story & Communication Style', isOpen: false, isCompleted: false },
                        { id: 3, title: 'Generated Scripts', isOpen: false, isCompleted: false },
                      ]);
                    }}
                    disabled={isSaving}
                  >
                    Create New Rewrite
                  </button>
                  
                  <button
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => saveAllRewrites()}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save All Rewrites'}
                  </button>
                </div>
              </div>
            )}
            
            {!processingResult && !isProcessing && !processingError && (
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Click "Continue" in Step 2 to process the video and generate scripts.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Saved Rewrites Section */}
      <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
          onClick={() => setShowSavedRewrites(!showSavedRewrites)}
        >
          <div className="flex items-center">
            <span className="mr-2 font-medium">Saved Rewrites</span>
            <span className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 px-2 py-1 rounded-full">
              {savedRewrites.length}
            </span>
          </div>
          {showSavedRewrites ? <FiChevronUp /> : <FiChevronDown />}
        </div>

        {showSavedRewrites && (
          <div className="p-4 border-t dark:border-gray-700">
            {rewritesLoading ? (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                <span className="ml-2 text-sm text-gray-500">Loading rewrites...</span>
              </div>
            ) : rewritesError ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p>{rewritesError}</p>
              </div>
            ) : savedRewrites.length === 0 ? (
              <p className="text-center py-4 text-gray-500 dark:text-gray-400">
                No saved rewrites yet. Create a rewrite above to get started.
              </p>
            ) : (
              <div className="space-y-3">
                {savedRewrites.map((rewrite) => (
                  <div key={rewrite.id} className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                    <div
                      className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 cursor-pointer"
                      onClick={() => toggleExpandRewrite(rewrite.id)}
                    >
                      <div>
                        <span className="font-medium text-sm">
                          {rewrite.platform.charAt(0).toUpperCase() + rewrite.platform.slice(1)} Rewrite
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatRewriteDate(rewrite.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <a
                          href={rewrite.original_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                          title="View original"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FiExternalLink size={16} />
                        </a>
                        <button
                          className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400"
                          title="Delete"
                          onClick={(e) => handleDeleteRewriteClick(rewrite, e)}
                          disabled={deletingRewrite === rewrite.id}
                        >
                          {deletingRewrite === rewrite.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-red-600"></div>
                          ) : (
                            <FiTrash2 size={16} />
                          )}
                        </button>
                        {expandedRewrite === rewrite.id ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                      </div>
                    </div>

                    {expandedRewrite === rewrite.id && (
                      <div className="p-3 border-t dark:border-gray-600">
                        <div className="mb-3">
                          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Style Parameters</h4>
                          <div className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            <p><span className="font-medium">Niche:</span> {rewrite.parameters.niche}</p>
                            <p><span className="font-medium">Target:</span> {rewrite.parameters.target_audience}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {rewrite.variations.map((variation) => (
                            <div key={variation.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded p-2">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-gray-500">{formatRewriteDate(variation.created_at)}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(variation.content);
                                  }}
                                  className="p-1 text-gray-500 hover:text-gray-700"
                                  title="Copy"
                                >
                                  <FiCopy size={14} />
                                </button>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                                {variation.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Rewrite Confirmation Modal */}
      {showDeleteModal && rewriteToDelete && (
        <ConfirmationModal
          title="Delete Rewrite"
          message={`Are you sure you want to delete this ${rewriteToDelete.platform} rewrite?`}
          details="This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          isLoading={deletingRewrite === rewriteToDelete.id}
          onConfirm={handleConfirmDeleteRewrite}
          onCancel={handleCancelDeleteRewrite}
          type="danger"
        />
      )}

      {/* Style Form Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Modal backdrop */}
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>
            
            {/* Modal content */}
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <StyleForm
                onSubmit={handleStyleSubmit}
                onCancel={closeStyleModal}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateRewrite;