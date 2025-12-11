import React, { useEffect, useState } from 'react';
import { FiLoader, FiCheckCircle, FiXCircle, FiDownload, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';
import type { FFmpegLoadState, ProcessingState } from '@services/tyler/types';

interface ExportProgressProps {
    ffmpegState: FFmpegLoadState;
    processingState: ProcessingState;
    onDownload?: () => void;
    onRetry?: () => void;
}

const ExportProgress: React.FC<ExportProgressProps> = ({
    ffmpegState,
    processingState,
    onDownload,
    onRetry,
}) => {
    const [isTabHidden, setIsTabHidden] = useState(false);

    // Track tab visibility to warn user about potential processing pause
    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsTabHidden(document.hidden);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);
    // Determine current state - only ONE should be active at a time
    const isError = ffmpegState.status === 'error' || processingState.status === 'error';
    const isCompleted = !isError && processingState.status === 'completed';
    const isProcessing = !isError && !isCompleted && processingState.status === 'processing';
    const isLoading = !isError && !isCompleted && !isProcessing && ffmpegState.status === 'loading';

    const errorMessage =
        ffmpegState.status === 'error'
            ? ffmpegState.message
            : processingState.status === 'error'
            ? processingState.message
            : null;

    // Don't render if nothing is happening
    if (ffmpegState.status === 'idle' && processingState.status === 'idle') {
        return null;
    }

    // Also don't render if FFmpeg loaded but no processing started yet
    if (ffmpegState.status === 'loaded' && processingState.status === 'idle') {
        return null;
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            {isLoading && (
                <div className="text-center">
                    <FiLoader className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Loading FFmpeg...
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        This may take a moment (downloading ~25MB)
                    </p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${ffmpegState.progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {ffmpegState.progress}%
                    </p>
                </div>
            )}

            {isProcessing && (
                <div className="text-center">
                    <FiLoader className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Processing Video...
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Adding text overlay to your video
                    </p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${processingState.progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {processingState.progress}%
                    </p>
                    {/* Tab visibility warning */}
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
                        <FiAlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>Keep this tab open and visible for best results</span>
                    </div>
                </div>
            )}

            {isCompleted && (
                <div className="text-center">
                    <FiCheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                        Video Ready!
                    </p>
                    <button
                        onClick={onDownload}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                    >
                        <FiDownload className="w-5 h-5" />
                        Download Video
                    </button>
                </div>
            )}

            {isError && (
                <div className="text-center">
                    <FiXCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Processing Failed
                    </p>
                    <p className="text-xs text-red-500 dark:text-red-400 mb-4">
                        {errorMessage || 'An unexpected error occurred'}
                    </p>
                    <button
                        onClick={onRetry}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                    >
                        <FiRefreshCw className="w-5 h-5" />
                        Try Again
                    </button>
                </div>
            )}
        </div>
    );
};

export default ExportProgress;
