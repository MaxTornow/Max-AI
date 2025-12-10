import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FiPlay, FiLoader, FiRefreshCw } from 'react-icons/fi';

import { useToast } from '@context/ToastContext';

import {
    VideoUploader,
    VideoPreview,
    TextEditor,
    ExportProgress,
} from '@components/tyler';

import {
    ffmpegService,
    DEFAULT_SETTINGS,
    storeVideo,
    retrieveVideo,
    clearAllVideos,
    storeOutputVideo,
    retrieveOutputVideo,
} from '@services/tyler';
import type {
    TextOverlaySettings,
    FFmpegLoadState,
    ProcessingState,
} from '@services/tyler/types';

const STORAGE_KEY = 'tyler_state';

interface PersistedState {
    settings: TextOverlaySettings;
    videoFileName: string | null;
    videoDimensions: { width: number; height: number; duration: number } | null;
    hasCompletedExport: boolean;
}

/**
 * TYLER - Simple Text Overlay Page
 * Browser-based video text overlay with ffmpeg.wasm
 * State persists across navigation using sessionStorage + IndexedDB
 */
const SimpleTextOverlayPage: React.FC = () => {
    const { showToast } = useToast();
    const videoFileRef = useRef<File | null>(null);
    const hasRestoredRef = useRef(false);

    // Load persisted state on mount
    const loadPersistedState = (): PersistedState | null => {
        try {
            const stored = sessionStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Failed to load Tyler state from sessionStorage:', e);
        }
        return null;
    };

    const persisted = loadPersistedState();

    // Video state
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoDimensions, setVideoDimensions] = useState<{
        width: number;
        height: number;
        duration: number;
    } | null>(persisted?.videoDimensions || null);
    const [isLoadingVideo, setIsLoadingVideo] = useState(false);

    // Settings state - restore from sessionStorage
    const [settings, setSettings] = useState<TextOverlaySettings>(
        persisted?.settings || DEFAULT_SETTINGS
    );

    // Track the video filename for persistence
    const [videoFileName, setVideoFileName] = useState<string | null>(
        persisted?.videoFileName || null
    );

    // Processing state
    const [ffmpegState, setFFmpegState] = useState<FFmpegLoadState>({ status: 'idle' });
    const [processingState, setProcessingState] = useState<ProcessingState>({ status: 'idle' });

    // Output state
    const [outputBlobUrl, setOutputBlobUrl] = useState<string | null>(null);

    // Restore video and export state from IndexedDB on mount
    useEffect(() => {
        if (hasRestoredRef.current) return;
        hasRestoredRef.current = true;

        const restoreState = async () => {
            setIsLoadingVideo(true);
            try {
                // Restore input video
                if (persisted?.videoFileName) {
                    const storedFile = await retrieveVideo();
                    if (storedFile) {
                        const url = URL.createObjectURL(storedFile);
                        setVideoFile(storedFile);
                        videoFileRef.current = storedFile;
                        setVideoUrl(url);
                        setVideoFileName(storedFile.name);
                    }
                }

                // Restore completed export if exists
                if (persisted?.hasCompletedExport) {
                    const outputBlob = await retrieveOutputVideo();
                    if (outputBlob) {
                        const blobUrl = URL.createObjectURL(outputBlob);
                        setOutputBlobUrl(blobUrl);
                        setProcessingState({ status: 'completed', blobUrl });
                        setFFmpegState({ status: 'loaded' });
                    }
                }
            } catch (error) {
                console.warn('Failed to restore state:', error);
            } finally {
                setIsLoadingVideo(false);
            }
        };

        restoreState();
    }, []);

    // Persist state to sessionStorage whenever it changes
    useEffect(() => {
        const stateToSave: PersistedState = {
            settings,
            videoFileName,
            videoDimensions,
            hasCompletedExport: processingState.status === 'completed',
        };
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (e) {
            console.warn('Failed to save Tyler state to sessionStorage:', e);
        }
    }, [settings, videoFileName, videoDimensions, processingState.status]);

    // Handle file selection
    const handleFileAccepted = useCallback(async (file: File) => {
        // Revoke previous URL if exists
        if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
        }
        if (outputBlobUrl) {
            URL.revokeObjectURL(outputBlobUrl);
            setOutputBlobUrl(null);
        }

        const url = URL.createObjectURL(file);
        setVideoFile(file);
        videoFileRef.current = file;
        setVideoUrl(url);
        setVideoFileName(file.name);
        // Don't reset settings - keep them so user can reuse
        setFFmpegState({ status: 'idle' });
        setProcessingState({ status: 'idle' });

        // Store video in IndexedDB for persistence
        await storeVideo(file);
    }, [videoUrl, outputBlobUrl]);

    // Handle file removal
    const handleFileRemoved = useCallback(async () => {
        if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
        }
        if (outputBlobUrl) {
            URL.revokeObjectURL(outputBlobUrl);
        }
        setVideoFile(null);
        videoFileRef.current = null;
        setVideoUrl(null);
        setVideoDimensions(null);
        setVideoFileName(null);
        setOutputBlobUrl(null);
        setSettings(DEFAULT_SETTINGS);
        setFFmpegState({ status: 'idle' });
        setProcessingState({ status: 'idle' });

        // Clear all storage
        sessionStorage.removeItem(STORAGE_KEY);
        await clearAllVideos();
    }, [videoUrl, outputBlobUrl]);

    // Handle video metadata loaded
    const handleVideoLoad = useCallback((width: number, height: number, duration: number) => {
        setVideoDimensions({ width, height, duration });
    }, []);

    // Export video with text overlay
    const handleExport = async () => {
        const currentFile = videoFile || videoFileRef.current;
        if (!currentFile || !videoDimensions) {
            showToast('Please upload a video first', 'error');
            return;
        }

        if (!settings.text.trim()) {
            showToast('Please enter some text', 'error');
            return;
        }

        try {
            // Step 1: Load FFmpeg if needed
            if (!ffmpegService.isLoaded()) {
                setFFmpegState({ status: 'loading', progress: 0 });

                await ffmpegService.load((progress) => {
                    setFFmpegState({ status: 'loading', progress });
                });

                setFFmpegState({ status: 'loaded' });
            }

            // Step 2: Process video
            setProcessingState({ status: 'processing', progress: 0 });

            const outputBlob = await ffmpegService.processVideo(
                currentFile,
                settings,
                videoDimensions.width,
                videoDimensions.height,
                (progress) => {
                    setProcessingState({ status: 'processing', progress });
                }
            );

            // Create blob URL for download
            const blobUrl = URL.createObjectURL(outputBlob);
            setOutputBlobUrl(blobUrl);
            setProcessingState({ status: 'completed', blobUrl });

            // Store output in IndexedDB for persistence across navigation
            await storeOutputVideo(outputBlob);

            showToast('Video exported successfully!', 'success');

        } catch (error) {
            console.error('Export error:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

            if (ffmpegState.status === 'loading') {
                setFFmpegState({ status: 'error', message: errorMessage });
            } else {
                setProcessingState({ status: 'error', message: errorMessage });
            }

            showToast(errorMessage, 'error');
        }
    };

    // Download processed video
    const handleDownload = useCallback(() => {
        const currentFile = videoFile || videoFileRef.current;
        if (!outputBlobUrl || !currentFile) return;

        const link = document.createElement('a');
        link.href = outputBlobUrl;
        link.download = `${currentFile.name.replace(/\.[^.]+$/, '')}_overlay.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('Download started!', 'success');
    }, [outputBlobUrl, videoFile, showToast]);

    // Reset for retry
    const handleRetry = useCallback(() => {
        setFFmpegState({ status: ffmpegService.isLoaded() ? 'loaded' : 'idle' });
        setProcessingState({ status: 'idle' });
        if (outputBlobUrl) {
            URL.revokeObjectURL(outputBlobUrl);
            setOutputBlobUrl(null);
        }
    }, [outputBlobUrl]);

    // Start new video
    const handleStartNew = useCallback(() => {
        handleFileRemoved();
    }, [handleFileRemoved]);

    const isProcessing =
        ffmpegState.status === 'loading' ||
        processingState.status === 'processing';

    const isCompleted = processingState.status === 'completed';

    const canExport = (videoFile || videoFileRef.current) && videoDimensions && settings.text.trim() && !isProcessing;

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    TYLER
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Simple Text Overlay for Videos
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Upload / Preview */}
                <div className="space-y-6">
                    {/* Video Upload / Preview Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            {videoUrl ? 'Preview' : 'Upload Video'}
                        </h2>

                        {isLoadingVideo ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <FiLoader className="w-8 h-8 text-primary-500 animate-spin mb-3" />
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Restoring your video...
                                </p>
                            </div>
                        ) : !videoUrl ? (
                            <VideoUploader
                                onFileAccepted={handleFileAccepted}
                                onFileRemoved={handleFileRemoved}
                                selectedFile={videoFile}
                                disabled={isProcessing}
                            />
                        ) : (
                            <>
                                <VideoPreview
                                    videoUrl={videoUrl}
                                    settings={settings}
                                    onVideoLoad={handleVideoLoad}
                                />

                                {!isProcessing && !isCompleted && (
                                    <button
                                        onClick={handleFileRemoved}
                                        className="mt-4 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                    >
                                        Choose different video
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {/* Export Progress */}
                    {(ffmpegState.status !== 'idle' || processingState.status !== 'idle') && (
                        <ExportProgress
                            ffmpegState={ffmpegState}
                            processingState={processingState}
                            onDownload={handleDownload}
                            onRetry={handleRetry}
                        />
                    )}

                    {/* Start New Button (after completion) */}
                    {isCompleted && (
                        <button
                            onClick={handleStartNew}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg font-medium transition-colors"
                        >
                            <FiRefreshCw className="w-5 h-5" />
                            Process Another Video
                        </button>
                    )}
                </div>

                {/* Right Column: Text Settings */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Text Settings
                        </h2>

                        <TextEditor
                            settings={settings}
                            onChange={setSettings}
                            disabled={isProcessing || isCompleted}
                        />
                    </div>

                    {/* Export Button */}
                    {!isCompleted && (
                        <button
                            onClick={handleExport}
                            disabled={!canExport}
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
                                    Export Video
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SimpleTextOverlayPage;
