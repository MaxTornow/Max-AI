import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLoader, FiCheckCircle, FiXCircle, FiDownload, FiX } from 'react-icons/fi';
import { useExport } from '../../context/ExportContext';

/**
 * GlobalExportProgress - Floating progress card visible on all pages
 * Shows FFmpeg loading progress, processing progress, completion, or error state
 * Click to navigate to /tyler, Download button auto-dismisses after download
 */
const GlobalExportProgress: React.FC = () => {
    const navigate = useNavigate();
    const { state, cancelExport, downloadResult } = useExport();

    // Don't show if idle or cancelled
    if (state.status === 'idle' || state.status === 'cancelled') {
        return null;
    }

    const handleCardClick = (e: React.MouseEvent) => {
        // Don't navigate if clicking on buttons
        if ((e.target as HTMLElement).closest('button')) {
            return;
        }
        navigate('/tyler');
    };

    const isLoading = state.status === 'loading-ffmpeg';
    const isProcessing = state.status === 'processing';
    const isCompleted = state.status === 'completed';
    const isError = state.status === 'error';

    return (
        <div
            onClick={handleCardClick}
            className="fixed bottom-4 right-4 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50 cursor-pointer hover:shadow-xl transition-shadow"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Video Export
                </span>
                {(isLoading || isProcessing) && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            cancelExport();
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title="Cancel export"
                    >
                        <FiX className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Loading FFmpeg */}
            {isLoading && (
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <FiLoader className="w-4 h-4 text-primary-500 animate-spin" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                            Loading FFmpeg...
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                            className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${state.ffmpegProgress}%` }}
                        />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                        {state.ffmpegProgress}%
                    </span>
                </div>
            )}

            {/* Processing */}
            {isProcessing && (
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <FiLoader className="w-4 h-4 text-primary-500 animate-spin" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                            Processing video...
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                            className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${state.processingProgress}%` }}
                        />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                        {state.processingProgress}%
                    </span>
                </div>
            )}

            {/* Completed */}
            {isCompleted && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FiCheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-gray-900 dark:text-white">
                            Ready!
                        </span>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            downloadResult();
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded-md font-medium transition-colors"
                    >
                        <FiDownload className="w-3.5 h-3.5" />
                        Download
                    </button>
                </div>
            )}

            {/* Error */}
            {isError && (
                <div className="flex items-start gap-2">
                    <FiXCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <span className="text-sm text-gray-900 dark:text-white block">
                            Export Failed
                        </span>
                        <span className="text-xs text-red-500 dark:text-red-400">
                            {state.error || 'An unexpected error occurred'}
                        </span>
                    </div>
                </div>
            )}

            {/* File name hint */}
            {state.videoFileName && (
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-xs text-gray-400 truncate block">
                        {state.videoFileName}
                    </span>
                </div>
            )}
        </div>
    );
};

export default GlobalExportProgress;
