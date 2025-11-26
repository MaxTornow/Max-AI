import React from 'react';
import { FiFilm, FiRefreshCw } from 'react-icons/fi';
import VideoCard from './VideoCard';
import type { Video } from '@services/betty/types';

interface VideoLibraryProps {
  videos: Video[];
  isLoading: boolean;
  onDownload: (video: Video) => void;
  onReprocess: (video: Video) => void;
  onDelete: (video: Video) => void;
  onRefresh: () => void;
  downloadingVideoId?: string | null;
  deletingVideoId?: string | null;
}

/**
 * Video library grid component
 */
const VideoLibrary: React.FC<VideoLibraryProps> = ({
  videos,
  isLoading,
  onDownload,
  onReprocess,
  onDelete,
  onRefresh,
  downloadingVideoId,
  deletingVideoId,
}) => {
  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Loading your videos...</p>
      </div>
    );
  }

  // Empty state
  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <FiFilm className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
          No videos yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
          Upload a video in the Editor tab to get started with AI-powered video editing.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with refresh button */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {videos.length} video{videos.length !== 1 ? 's' : ''} in your library
        </p>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Video grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onDownload={onDownload}
            onReprocess={onReprocess}
            onDelete={onDelete}
            isDownloading={downloadingVideoId === video.id}
            isDeleting={deletingVideoId === video.id}
          />
        ))}
      </div>
    </div>
  );
};

export default VideoLibrary;
