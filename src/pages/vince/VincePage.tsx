import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FiPlay, FiLoader } from 'react-icons/fi';

import { useAuth } from '@context/AuthContext';
import { useToast } from '@context/ToastContext';

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
  saveProcessedVideo,
  getVideoSignedUrl,
} from '@services/vince';
import { VINCE_TEMPLATES, getDefaultTemplate } from '@services/vince/templates';
import type { Video, VinceTemplate, UploadState, ProcessingState } from '@services/vince/types';

const POLL_INTERVAL = parseInt(import.meta.env.VITE_SUBMAGIC_POLL_INTERVAL_MS || '30000');

/**
 * VINCE Page - Vertical INstant Content Editor
 * Single page with Editor and Library tabs
 */
const VincePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Tab state
  const [activeTab, setActiveTab] = useState<VinceTab>('editor');

  // Editor state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<VinceTemplate>(getDefaultTemplate());
  const [magicZooms, setMagicZooms] = useState(selectedTemplate.defaults.magicZooms);
  const [magicBrolls, setMagicBrolls] = useState(selectedTemplate.defaults.magicBrolls);
  const [magicBrollsPercentage, setMagicBrollsPercentage] = useState(
    selectedTemplate.defaults.magicBrollsPercentage
  );
  const [language, setLanguage] = useState('en');

  // Upload/Processing state
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
  const [processingState, setProcessingState] = useState<ProcessingState>({ status: 'idle' });
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // Library state
  const [downloadingVideoId, setDownloadingVideoId] = useState<string | null>(null);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);

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

  // Poll for processing status when we have an active project
  const { data: projectStatus } = useQuery(
    ['vince-project', currentProjectId],
    () => getSubmagicProjectStatus(currentProjectId!),
    {
      enabled: !!currentProjectId && processingState.status === 'processing',
      refetchInterval: (data) => {
        if (data?.status === 'processing') {
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
      if (projectStatus.status === 'completed' && projectStatus.downloadUrl) {
        setProcessingState({ status: 'downloading', message: 'Saving processed video...' });

        try {
          // Try to save processed video to Supabase
          const processedPath = await saveProcessedVideo(
            projectStatus.downloadUrl,
            user!.id,
            selectedFile?.name || 'video.mp4'
          );

          // Update database record
          await updateVideoRecord(currentVideoId, {
            submagic_status: 'completed',
            processed_storage_path: processedPath,
            submagic_download_url: projectStatus.downloadUrl,
            processing_completed_at: new Date().toISOString(),
          });

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
      } else if (projectStatus.status === 'failed') {
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
      } else if (projectStatus.status === 'processing') {
        // Update progress (estimated based on time)
        setProcessingState((prev) => {
          if (prev.status === 'processing') {
            // Slowly increment progress
            const newProgress = Math.min(prev.progress + 5, 90);
            return { ...prev, progress: newProgress };
          }
          return prev;
        });
      }
    };

    handleStatusChange();
  }, [projectStatus, currentVideoId, user, selectedFile, showToast, refetchVideos]);

  // Update feature toggles when template changes
  const handleTemplateChange = useCallback((template: VinceTemplate) => {
    setSelectedTemplate(template);
    setMagicZooms(template.defaults.magicZooms);
    setMagicBrolls(template.defaults.magicBrolls);
    setMagicBrollsPercentage(template.defaults.magicBrollsPercentage);
  }, []);

  // Handle file selection
  const handleFileAccepted = useCallback((file: File) => {
    setSelectedFile(file);
    // Auto-fill title from filename
    const titleFromFile = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    setVideoTitle(titleFromFile);
    setUploadState({ status: 'idle' });
    setProcessingState({ status: 'idle' });
  }, []);

  // Handle file removal
  const handleFileRemoved = useCallback(() => {
    setSelectedFile(null);
    setVideoTitle('');
    setUploadState({ status: 'idle' });
    setProcessingState({ status: 'idle' });
  }, []);

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
      });

      setCurrentProjectId(projectId);
      setProcessingState({ status: 'processing', projectId, progress: 20 });
      showToast('Video processing started!', 'info');

    } catch (error) {
      console.error('Process video error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
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

  // Reset editor state
  const resetEditor = () => {
    setSelectedFile(null);
    setVideoTitle('');
    setSelectedTemplate(getDefaultTemplate());
    setMagicZooms(getDefaultTemplate().defaults.magicZooms);
    setMagicBrolls(getDefaultTemplate().defaults.magicBrolls);
    setMagicBrollsPercentage(getDefaultTemplate().defaults.magicBrollsPercentage);
    setLanguage('en');
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
              onRetry={resetEditor}
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
