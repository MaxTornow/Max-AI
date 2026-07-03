import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FiPlay, FiLoader } from 'react-icons/fi';

import { useAuth } from '@context/AuthContext';
import { useToast } from '@context/ToastContext';
import { useVinceEditor } from '@context/VinceEditorContext';

import TabNav, { VinceTab } from '@components/vince/TabNav';
import VideoUploader from '@components/vince/VideoUploader';
import TemplateSelector from '@components/vince/TemplateSelector';
import FeatureToggles from '@components/vince/FeatureToggles';
import ProcessingProgress from '@components/vince/ProcessingProgress';
import VideoLibrary from '@components/vince/VideoLibrary';

import {
  uploadVideoToStorage,
  createVideoRecord,
  updateVideoRecord,
  getUserVideos,
  deleteVideo,
  processVideo,
  getSubmagicProjectStatus,
  completeVideoProcessing,
  getVideoSignedUrl,
} from '@services/vince';
import { formatSubmagicErrorMessage } from '@services/vince/retry';
import { VINCE_TEMPLATES, getDefaultTemplate } from '@services/vince/templates';
import type { Video, VinceTemplate, UploadState, ProcessingState, SilencePace } from '@services/vince/types';

const POLL_INTERVAL = parseInt(import.meta.env.VITE_SUBMAGIC_POLL_INTERVAL_MS || '30000');
const VINCE_SETTINGS_KEY = 'vince_editor_settings';

/** Maximum time (ms) a video can stay in 'processing' before being marked as timed out */
const PROCESSING_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

/** Vince editor settings that persist across page refreshes */
interface VinceSettings {
  templateKey: string;
  magicZooms: boolean;
  magicBrolls: boolean;
  magicBrollsPercentage: number;
  language: string;
  removeSilencePace: SilencePace;
  removeBadTakes: boolean;
  hookTitleEnabled: boolean;
  hookTitleText: string;
  hookTitlePosition: number;
}

/** Load saved settings from localStorage */
const loadSavedSettings = (): Partial<VinceSettings> => {
  try {
    const saved = localStorage.getItem(VINCE_SETTINGS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load Vince settings from localStorage:', e);
  }
  return {};
};

/** Get initial template based on saved settings */
const getInitialTemplate = (): VinceTemplate => {
  const saved = loadSavedSettings();
  if (saved.templateKey) {
    const template = VINCE_TEMPLATES.find(t => t.key === saved.templateKey);
    if (template) return template;
  }
  return getDefaultTemplate();
};

/**
 * VINCE Page - Vertical INstant Content Editor
 * Single page with Editor and Library tabs
 */
const VincePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Get editor state from context (persists across in-app navigation)
  const {
    editorState: {
      selectedFile,
      videoTitle,
      hookTitleText,
      hookTitlePosition,
      uploadState,
      processingState,
      currentVideoId,
      currentProjectId,
    },
    setSelectedFile,
    setVideoTitle,
    setHookTitleText,
    setHookTitlePosition,
    setUploadState,
    setProcessingState,
    setCurrentVideoId,
    setCurrentProjectId,
    clearEditorState,
  } = useVinceEditor();

  // Tab state
  const [activeTab, setActiveTab] = useState<VinceTab>('editor');

  // Load saved settings once on mount
  const savedSettings = loadSavedSettings();
  const initialTemplate = getInitialTemplate();

  // Editor state - initialized from localStorage if available
  const [selectedTemplate, setSelectedTemplate] = useState<VinceTemplate>(initialTemplate);
  const [magicZooms, setMagicZooms] = useState(
    savedSettings.magicZooms ?? initialTemplate.defaults.magicZooms
  );
  const [magicBrolls, setMagicBrolls] = useState(
    savedSettings.magicBrolls ?? initialTemplate.defaults.magicBrolls
  );
  const [magicBrollsPercentage, setMagicBrollsPercentage] = useState(
    savedSettings.magicBrollsPercentage ?? initialTemplate.defaults.magicBrollsPercentage
  );
  const [language, setLanguage] = useState(savedSettings.language ?? 'en');

  // New enhancement state - initialized from localStorage if available
  const [removeSilencePace, setRemoveSilencePace] = useState<SilencePace>(
    savedSettings.removeSilencePace ?? 'off'
  );
  const [removeBadTakes, setRemoveBadTakes] = useState(savedSettings.removeBadTakes ?? false);
  const [hookTitleEnabled, setHookTitleEnabled] = useState(savedSettings.hookTitleEnabled ?? false);
  // hookTitleText comes from context (useVinceEditor) for in-app navigation persistence
  // We sync it to localStorage for page refresh persistence in the useEffect below

  // Initialize hookTitleText and hookTitlePosition from localStorage on mount (for page refresh)
  useEffect(() => {
    if (savedSettings.hookTitleText && !hookTitleText) {
      setHookTitleText(savedSettings.hookTitleText);
    }
    if (savedSettings.hookTitlePosition !== undefined && hookTitlePosition === 10) {
      setHookTitlePosition(savedSettings.hookTitlePosition);
    }
  }, []); // Only run once on mount

  // Upload/Processing state now comes from context (persists across navigation)
  // See useVinceEditor() destructuring above

  // Library state
  const [downloadingVideoId, setDownloadingVideoId] = useState<string | null>(null);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    const settings: VinceSettings = {
      templateKey: selectedTemplate.key,
      magicZooms,
      magicBrolls,
      magicBrollsPercentage,
      language,
      removeSilencePace,
      removeBadTakes,
      hookTitleEnabled,
      hookTitleText,
      hookTitlePosition,
    };
    try {
      localStorage.setItem(VINCE_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save Vince settings to localStorage:', e);
    }
  }, [
    selectedTemplate,
    magicZooms,
    magicBrolls,
    magicBrollsPercentage,
    language,
    removeSilencePace,
    removeBadTakes,
    hookTitleEnabled,
    hookTitleText,
    hookTitlePosition,
  ]);

  // Warn user before leaving page if they have an unuploaded video
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (selectedFile && processingState.status === 'idle') {
        // Standard way to trigger browser's "Leave site?" dialog
        e.preventDefault();
        // Chrome requires returnValue to be set
        e.returnValue = 'You have a video selected that hasn\'t been processed yet. If you leave, you\'ll need to re-upload it.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [selectedFile, processingState.status]);

  // Fetch user's videos for library
  const {
    data: videos = [],
    isLoading: isLoadingVideos,
    refetch: refetchVideos,
  } = useQuery(
    ['vince-videos', user?.id],
    () => getUserVideos(user!.id),
    {
      enabled: !!user?.id,
      staleTime: 30000,
    }
  );

  // Track sync state to prevent duplicate syncs (use ref to avoid stale closure)
  const isSyncingRef = useRef(false);

  // Function to sync processing videos with Submagic API
  const syncProcessingVideos = useCallback(async () => {
    if (isSyncingRef.current || !user?.id) return;

    const processingVideos = videos.filter(
      (v) => v.submagic_status === 'processing'
    );

    if (processingVideos.length === 0) return;

    isSyncingRef.current = true;
    console.log('Found', processingVideos.length, 'videos still processing, syncing status...');

    let uiRestored = false;
    let needsRefetch = false;

    for (const video of processingVideos) {
      try {
        // Fix 1: Videos without a submagic_project_id never reached Submagic - mark as failed
        if (!video.submagic_project_id) {
          console.log('Video', video.id, 'has no Submagic project ID, marking as failed');
          await updateVideoRecord(video.id, {
            submagic_status: 'failed',
            error_message: 'Processing failed to start - no project was created',
          });
          needsRefetch = true;
          continue;
        }

        // Fix 2: Check for timeout - if processing started > 15 minutes ago, mark as timed out
        if (video.processing_started_at) {
          const elapsed = Date.now() - new Date(video.processing_started_at).getTime();
          if (elapsed > PROCESSING_TIMEOUT_MS) {
            console.log('Video', video.id, 'timed out after', Math.round(elapsed / 60000), 'minutes');
            // Still check Submagic one last time before marking as failed
            try {
              const status = await getSubmagicProjectStatus(video.submagic_project_id);
              const videoUrl = status.downloadUrl || status.directUrl;
              if (status.status === 'completed' && videoUrl) {
                // It actually completed! Save it.
                console.log('Timed-out video', video.id, 'actually completed on Submagic, saving...');
                await completeVideoProcessing(
                  video.id, user!.id, video.original_filename,
                  video.original_storage_path, videoUrl
                );
                needsRefetch = true;
                continue;
              }
            } catch {
              // Submagic API call failed - proceed with timeout
            }
            await updateVideoRecord(video.id, {
              submagic_status: 'failed',
              error_message: `Processing timed out after ${Math.round(elapsed / 60000)} minutes`,
            });
            needsRefetch = true;
            continue;
          }
        }

        // Normal sync: check Submagic for current status
        const status = await getSubmagicProjectStatus(video.submagic_project_id);
        console.log('Submagic status for', video.id, ':', status.status);

        const videoUrl = status.downloadUrl || status.directUrl;

        if (status.status === 'completed' && videoUrl) {
          console.log('Video', video.id, 'completed, updating database with URL:', videoUrl);
          await completeVideoProcessing(
            video.id, user!.id, video.original_filename,
            video.original_storage_path, videoUrl
          );
          needsRefetch = true;
        } else if (status.status === 'failed') {
          console.log('Video', video.id, 'failed, updating database');
          await updateVideoRecord(video.id, {
            submagic_status: 'failed',
            error_message: status.errorMessage || 'Processing failed',
          });
          needsRefetch = true;
        } else if (['processing', 'transcribing', 'exporting'].includes(status.status) && !uiRestored) {
          // Restore UI for the first (most recent) video still legitimately processing
          console.log('Restoring processing UI for video:', video.id, 'status:', status.status);
          setCurrentVideoId(video.id);
          setCurrentProjectId(video.submagic_project_id);

          let estimatedProgress = 30;
          if (status.status === 'transcribing') estimatedProgress = 50;
          if (status.status === 'exporting') estimatedProgress = 75;

          setProcessingState({
            status: 'processing',
            projectId: video.submagic_project_id,
            progress: estimatedProgress
          });
          setUploadState({ status: 'uploaded', videoId: video.id, storagePath: video.original_storage_path });
          uiRestored = true;
        }
      } catch (error) {
        console.error('Error syncing video status:', video.id, error);
        // Fix 3: If we can't reach Submagic and the video is old, mark as failed
        if (video.processing_started_at) {
          const elapsed = Date.now() - new Date(video.processing_started_at).getTime();
          if (elapsed > PROCESSING_TIMEOUT_MS) {
            try {
              await updateVideoRecord(video.id, {
                submagic_status: 'failed',
                error_message: 'Processing timed out and status check failed',
              });
              needsRefetch = true;
            } catch (updateError) {
              console.error('Failed to update timed-out video:', video.id, updateError);
            }
          }
        }
      }
    }

    // Refresh the video list to show updated statuses
    if (needsRefetch) {
      await refetchVideos();
    }
    isSyncingRef.current = false;
  }, [videos, user?.id, refetchVideos, setCurrentVideoId, setCurrentProjectId, setProcessingState, setUploadState]);

  // Sync processing videos on mount and when videos change
  useEffect(() => {
    if (user?.id && videos.length > 0) {
      syncProcessingVideos();
    }
  }, [videos.length, user?.id, syncProcessingVideos]);

  // Also sync when switching to Library tab
  useEffect(() => {
    if (activeTab === 'library' && videos.length > 0) {
      syncProcessingVideos();
    }
  }, [activeTab, videos.length, syncProcessingVideos]);

  // Track polling start time to detect timeout during active polling
  const pollingStartRef = useRef<number | null>(null);
  // Ref to read processingState without adding it to useEffect deps (prevents infinite loops)
  const processingStateRef = useRef(processingState);
  processingStateRef.current = processingState;
  useEffect(() => {
    if (currentProjectId && processingState.status === 'processing') {
      if (!pollingStartRef.current) pollingStartRef.current = Date.now();
    } else {
      pollingStartRef.current = null;
    }
  }, [currentProjectId, processingState.status]);

  // Poll for processing status when we have an active project
  const { data: projectStatus } = useQuery(
    ['vince-project', currentProjectId],
    () => getSubmagicProjectStatus(currentProjectId!),
    {
      enabled: !!currentProjectId && processingState.status === 'processing',
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      onError: (error: unknown) => {
        console.error('Polling error for project', currentProjectId, ':', error);
        // If we've been polling for longer than the timeout, give up
        if (pollingStartRef.current && (Date.now() - pollingStartRef.current > PROCESSING_TIMEOUT_MS)) {
          setProcessingState({
            status: 'error',
            message: 'Processing timed out. Please check your video in the library or try again.',
            retryable: true,
          });
          setCurrentProjectId(null);
        }
      },
      refetchInterval: (data) => {
        // Continue polling for all intermediate states
        if (data?.status && ['processing', 'transcribing', 'exporting'].includes(data.status)) {
          // Check for timeout during active polling
          if (pollingStartRef.current && (Date.now() - pollingStartRef.current > PROCESSING_TIMEOUT_MS)) {
            console.warn('Processing timeout reached during polling');
            return false; // Stop polling, the onError/status handler will clean up
          }
          return POLL_INTERVAL;
        }
        // If we get an unexpected status (not completed/failed/known), keep polling
        if (data?.status && !['completed', 'failed'].includes(data.status)) {
          console.warn('Unknown Submagic status:', data.status, '- continuing to poll');
          return POLL_INTERVAL;
        }
        return false;
      },
    }
  );

  // Handle project status changes
  useEffect(() => {
    if (!projectStatus || !currentVideoId) return;

    const handleStatusChange = async () => {
      // Check for either downloadUrl or directUrl (Submagic returns both)
      const videoUrl = projectStatus.downloadUrl || projectStatus.directUrl;

      // IMPORTANT: Only handle completion if we're currently in 'processing' state
      // This prevents infinite loops when processingState changes trigger re-runs
      if (projectStatus.status === 'completed' && videoUrl && processingState.status === 'processing') {
        setProcessingState({ status: 'downloading', message: 'Saving processed video...' });

        try {
          // Save processed video, update DB, and clean up original
          await completeVideoProcessing(
            currentVideoId, user!.id,
            selectedFile?.name || 'video.mp4',
            uploadState.status === 'uploaded' ? uploadState.storagePath : '',
            videoUrl
          );

          setProcessingState({ status: 'completed', videoId: currentVideoId });
          showToast('Video processing complete!', 'success');
          refetchVideos();

          // Reset current tracking
          setCurrentProjectId(null);
        } catch (error) {
          console.error('Error saving processed video:', error);
          setProcessingState({
            status: 'error',
            message: 'Failed to save processed video. Please try downloading from library.',
            retryable: false,
          });
        }
      } else if (projectStatus.status === 'failed' && processingStateRef.current.status === 'processing') {
        // Only handle failure if we're currently in 'processing' state
        await updateVideoRecord(currentVideoId, {
          submagic_status: 'failed',
          error_message: projectStatus.errorMessage || 'Processing failed',
        });

        setProcessingState({
          status: 'error',
          message: projectStatus.errorMessage || 'Video processing failed',
          retryable: true,
        });
        refetchVideos();
        setCurrentProjectId(null);
      } else if (['processing', 'transcribing', 'exporting'].includes(projectStatus.status) && processingStateRef.current.status === 'processing') {
        // Check for timeout during active polling
        if (pollingStartRef.current && (Date.now() - pollingStartRef.current > PROCESSING_TIMEOUT_MS)) {
          console.warn('Processing timeout reached, marking as failed');
          await updateVideoRecord(currentVideoId, {
            submagic_status: 'failed',
            error_message: 'Processing timed out after 15 minutes',
          });
          setProcessingState({
            status: 'error',
            message: 'Processing timed out after 15 minutes. Please try again.',
            retryable: true,
          });
          refetchVideos();
          setCurrentProjectId(null);
          return;
        }

        // Update progress based on current Submagic phase
        // Use functional update to avoid depending on processingState in the dep array
        setProcessingState((prev) => {
          if (prev.status !== 'processing') return prev;
          let targetProgress = prev.progress;
          if (projectStatus.status === 'processing') {
            targetProgress = Math.min(prev.progress + 3, 40);
          } else if (projectStatus.status === 'transcribing') {
            targetProgress = Math.max(40, Math.min(prev.progress + 5, 70));
          } else if (projectStatus.status === 'exporting') {
            targetProgress = Math.max(70, Math.min(prev.progress + 5, 90));
          }
          // Only update if progress actually changed to avoid re-render loops
          if (targetProgress === prev.progress) return prev;
          return {
            status: 'processing',
            projectId: prev.projectId,
            progress: targetProgress,
          };
        });
      }
    };

    handleStatusChange();
  }, [projectStatus, currentVideoId, user, selectedFile, showToast, refetchVideos, setProcessingState]);

  // Update feature toggles when template changes
  const handleTemplateChange = useCallback((template: VinceTemplate) => {
    setSelectedTemplate(template);
    setMagicZooms(template.defaults.magicZooms);
    setMagicBrolls(template.defaults.magicBrolls);
    setMagicBrollsPercentage(template.defaults.magicBrollsPercentage);
  }, []);

  // Handle file selection
  const handleFileAccepted = useCallback((file: File) => {
    setSelectedFile(file); // Context auto-fills title from filename
    setUploadState({ status: 'idle' });
    setProcessingState({ status: 'idle' });
  }, [setSelectedFile]);

  // Handle file removal
  const handleFileRemoved = useCallback(() => {
    setSelectedFile(null);
    setUploadState({ status: 'idle' });
    setProcessingState({ status: 'idle' });
  }, [setSelectedFile]);

  // Process video
  const handleProcessVideo = async () => {
    if (!selectedFile || !user) return;

    try {
      // Step 1: Upload to Supabase Storage
      setUploadState({ status: 'uploading', progress: 0, filename: selectedFile.name });

      const { path, url } = await uploadVideoToStorage(selectedFile, user.id, (progress) => {
        setUploadState({ status: 'uploading', progress, filename: selectedFile.name });
      });

      setUploadState({ status: 'uploaded', videoId: '', storagePath: path });

      // Step 2: Create database record
      setProcessingState({ status: 'creating', message: 'Creating video record...' });

      const videoRecord = await createVideoRecord({
        user_id: user.id,
        title: videoTitle || selectedFile.name,
        original_filename: selectedFile.name,
        file_size_bytes: selectedFile.size,
        duration_seconds: null,
        original_storage_path: path,
        processed_storage_path: null,
        submagic_project_id: null,
        submagic_status: 'pending',
        submagic_download_url: null,
        template_name: selectedTemplate.submagicTemplateName,
        language,
        magic_zooms: magicZooms,
        magic_brolls: magicBrolls,
        magic_brolls_percentage: magicBrollsPercentage,
        // New enhancement fields
        remove_silence_pace: removeSilencePace !== 'off' ? removeSilencePace : null,
        remove_bad_takes: removeBadTakes,
        hook_title_enabled: hookTitleEnabled,
        hook_title_text: hookTitleText.trim() || null,
        hook_title_position: hookTitleEnabled ? hookTitlePosition : null,
        error_message: null,
        retry_count: 0,
        processing_started_at: null,
        processing_completed_at: null,
      });

      setCurrentVideoId(videoRecord.id);

      // Step 3: Start Submagic processing
      setProcessingState({ status: 'processing', projectId: '', progress: 10 });

      const projectId = await processVideo(videoRecord.id, user.id, url, {
        title: videoTitle || selectedFile.name,
        templateName: selectedTemplate.submagicTemplateName,
        language,
        magicZooms,
        magicBrolls,
        magicBrollsPercentage,
        // New enhancement options - only pass if enabled/has value
        removeSilencePace: removeSilencePace !== 'off' ? removeSilencePace : undefined,
        removeBadTakes: removeBadTakes || undefined,
        hookTitle: hookTitleEnabled
          ? (hookTitleText.trim()
            ? { text: hookTitleText.trim(), top: hookTitlePosition }
            : { top: hookTitlePosition })
          : undefined,
      });

      setCurrentProjectId(projectId);
      setProcessingState({ status: 'processing', projectId, progress: 20 });
      showToast('Video processing started!', 'info');

    } catch (error) {
      console.error('Process video error:', error);
      const errorMessage = formatSubmagicErrorMessage(error);
      setUploadState({ status: 'error', message: errorMessage });
      setProcessingState({ status: 'error', message: errorMessage, retryable: true });
      showToast(errorMessage, 'error');
    }
  };

  // Download video
  const handleDownload = async (video: Video) => {
    setDownloadingVideoId(video.id);
    try {
      let downloadUrl: string;

      if (video.processed_storage_path) {
        downloadUrl = await getVideoSignedUrl(video.processed_storage_path);
      } else if (video.submagic_download_url) {
        downloadUrl = video.submagic_download_url;
      } else {
        throw new Error('No download URL available');
      }

      // Trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${video.title}_processed.mp4`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Download started!', 'success');
    } catch (error) {
      console.error('Download error:', error);
      showToast('Failed to download video', 'error');
    } finally {
      setDownloadingVideoId(null);
    }
  };

  // Re-process video
  const handleReprocess = (video: Video) => {
    // Switch to editor tab and pre-fill settings
    setActiveTab('editor');
    setVideoTitle(video.title);

    const template = VINCE_TEMPLATES.find(
      (t) => t.submagicTemplateName === video.template_name
    );
    if (template) {
      setSelectedTemplate(template);
    }

    setMagicZooms(video.magic_zooms);
    setMagicBrolls(video.magic_brolls);
    setMagicBrollsPercentage(video.magic_brolls_percentage);
    setLanguage(video.language);

    showToast('Select a video file to re-process', 'info');
  };

  // Delete video
  const handleDelete = async (video: Video) => {
    setDeletingVideoId(video.id);
    try {
      await deleteVideo(video.id, user!.id);
      showToast('Video deleted', 'success');
      refetchVideos();
    } catch (error) {
      console.error('Delete error:', error);
      showToast('Failed to delete video', 'error');
    } finally {
      setDeletingVideoId(null);
    }
  };

  // View library after processing
  const handleViewLibrary = () => {
    setActiveTab('library');
    refetchVideos();
  };

  // Handle retry after error - keeps file and settings, only resets upload/processing state
  const handleRetry = useCallback(() => {
    // Keep the file and all settings intact, just reset the upload/processing state
    setUploadState({ status: 'idle' });
    setProcessingState({ status: 'idle' });
    setCurrentVideoId(null);
    setCurrentProjectId(null);
  }, []);

  // Reset editor state (full reset for "Process Another Video")
  const resetEditor = () => {
    // Clear file and title from context
    clearEditorState();
    // Reset local state
    setSelectedTemplate(getDefaultTemplate());
    setMagicZooms(getDefaultTemplate().defaults.magicZooms);
    setMagicBrolls(getDefaultTemplate().defaults.magicBrolls);
    setMagicBrollsPercentage(getDefaultTemplate().defaults.magicBrollsPercentage);
    setLanguage('en');
    // Reset new enhancement state
    setRemoveSilencePace('off');
    setRemoveBadTakes(false);
    setHookTitleEnabled(false);
    setHookTitleText('');
    // Reset upload/processing state
    setUploadState({ status: 'idle' });
    setProcessingState({ status: 'idle' });
    setCurrentVideoId(null);
    setCurrentProjectId(null);
  };

  const isProcessing =
    uploadState.status === 'uploading' ||
    processingState.status === 'creating' ||
    processingState.status === 'processing' ||
    processingState.status === 'downloading';

  const canProcess = selectedFile && videoTitle.trim() && !isProcessing;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          VINCE
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Vertical INstant Content Editor
        </p>
      </div>

      {/* Tab Navigation */}
      <TabNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        libraryCount={videos.length}
      />

      {/* Editor Tab */}
      {activeTab === 'editor' && (
        <div className="space-y-6">
          {/* Processing Progress (if active) */}
          {(processingState.status !== 'idle' || uploadState.status === 'uploading') && (
            <ProcessingProgress
              state={processingState}
              onRetry={handleRetry}
              onViewLibrary={handleViewLibrary}
            />
          )}

          {/* Only show form if not completed */}
          {processingState.status !== 'completed' && (
            <>
              {/* Video Upload */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Upload Video
                </h2>
                <VideoUploader
                  onFileAccepted={handleFileAccepted}
                  onFileRemoved={handleFileRemoved}
                  selectedFile={selectedFile}
                  isUploading={uploadState.status === 'uploading'}
                  uploadProgress={
                    uploadState.status === 'uploading' ? uploadState.progress : 0
                  }
                  error={uploadState.status === 'error' ? uploadState.message : null}
                />

                {/* Video Title Input */}
                {selectedFile && (
                  <div className="mt-4">
                    <label
                      htmlFor="video-title"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Video Title
                    </label>
                    <input
                      id="video-title"
                      type="text"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      placeholder="Enter video title"
                      disabled={isProcessing}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                )}
              </div>

              {/* Template Selection */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <TemplateSelector
                  selectedTemplate={selectedTemplate}
                  onSelectTemplate={handleTemplateChange}
                  disabled={isProcessing}
                />
              </div>

              {/* AI Features */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <FeatureToggles
                  magicZooms={magicZooms}
                  magicBrolls={magicBrolls}
                  magicBrollsPercentage={magicBrollsPercentage}
                  language={language}
                  onMagicZoomsChange={setMagicZooms}
                  onMagicBrollsChange={setMagicBrolls}
                  onMagicBrollsPercentageChange={setMagicBrollsPercentage}
                  onLanguageChange={setLanguage}
                  disabled={isProcessing}
                  // New enhancement props
                  removeSilencePace={removeSilencePace}
                  removeBadTakes={removeBadTakes}
                  hookTitleEnabled={hookTitleEnabled}
                  hookTitleText={hookTitleText}
                  hookTitlePosition={hookTitlePosition}
                  onRemoveSilencePaceChange={setRemoveSilencePace}
                  onRemoveBadTakesChange={setRemoveBadTakes}
                  onHookTitleEnabledChange={setHookTitleEnabled}
                  onHookTitleTextChange={setHookTitleText}
                  onHookTitlePositionChange={setHookTitlePosition}
                />
              </div>

              {/* Process Button */}
              <button
                onClick={handleProcessVideo}
                disabled={!canProcess}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                {isProcessing ? (
                  <>
                    <FiLoader className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FiPlay className="w-5 h-5" />
                    Process Video
                  </>
                )}
              </button>
            </>
          )}

          {/* Success state - show button to process another */}
          {processingState.status === 'completed' && (
            <div className="text-center">
              <button
                onClick={resetEditor}
                className="inline-flex items-center gap-2 px-6 py-3 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg font-medium transition-colors"
              >
                Process Another Video
              </button>
            </div>
          )}
        </div>
      )}

      {/* Library Tab */}
      {activeTab === 'library' && (
        <VideoLibrary
          videos={videos}
          isLoading={isLoadingVideos}
          onDownload={handleDownload}
          onReprocess={handleReprocess}
          onDelete={handleDelete}
          onRefresh={refetchVideos}
          downloadingVideoId={downloadingVideoId}
          deletingVideoId={deletingVideoId}
        />
      )}
    </div>
  );
};

export default VincePage;
