import React, { useState } from 'react';
import { FiDownload, FiRefreshCw, FiTrash2, FiClock, FiAlertCircle, FiCheck, FiLoader } from 'react-icons/fi';
import { format } from 'date-fns';
import type { Video, SubmagicStatus } from '@services/betty/types';
import { getTemplateBySubmagicName } from '@services/betty/templates';

interface VideoCardProps {
  video: Video;
  onDownload: (video: Video) => void;
  onReprocess: (video: Video) => void;
  onDelete: (video: Video) => void;
  isDownloading?: boolean;
  isDeleting?: boolean;
}

/**
 * Get status display info
 */
const getStatusInfo = (status: SubmagicStatus) => {
  switch (status) {
    case 'pending':
      return {
        icon: <FiClock className="w-4 h-4" />,
        label: 'Pending',
        color: 'text-gray-500 bg-gray-100 dark:bg-gray-700',
      };
    case 'processing':
      return {
        icon: <FiLoader className="w-4 h-4 animate-spin" />,
        label: 'Processing',
        color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40',
      };
    case 'completed':
      return {
        icon: <FiCheck className="w-4 h-4" />,
        label: 'Completed',
        color: 'text-green-600 bg-green-100 dark:bg-green-900/40',
      };
    case 'failed':
      return {
        icon: <FiAlertCircle className="w-4 h-4" />,
        label: 'Failed',
        color: 'text-red-600 bg-red-100 dark:bg-red-900/40',
      };
    default:
      return {
        icon: null,
        label: status,
        color: 'text-gray-500 bg-gray-100 dark:bg-gray-700',
      };
  }
};

/**
 * Video card component for library display
 */
const VideoCard: React.FC<VideoCardProps> = ({
  video,
  onDownload,
  onReprocess,
  onDelete,
  isDownloading = false,
  isDeleting = false,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const statusInfo = getStatusInfo(video.submagic_status);
  const template = getTemplateBySubmagicName(video.template_name);

  const handleDelete = () => {
    onDelete(video);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Video preview placeholder */}
      <div
        className="h-32 flex items-center justify-center"
        style={{ backgroundColor: template?.previewColor || '#6B7280' }}
      >
        <span className="text-white text-opacity-70 text-sm font-medium">
          {video.original_filename}
        </span>
      </div>

      {/* Video info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate flex-1">
            {video.title}
          </h3>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}
          >
            {statusInfo.icon}
            {statusInfo.label}
          </span>
        </div>

        <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
          <p>Template: {template?.name || video.template_name}</p>
          <p>{format(new Date(video.created_at), 'MMM d, yyyy h:mm a')}</p>
        </div>

        {/* Error message if failed */}
        {video.submagic_status === 'failed' && video.error_message && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400 line-clamp-2">
            {video.error_message}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          {video.submagic_status === 'completed' && (
            <button
              onClick={() => onDownload(video)}
              disabled={isDownloading}
              className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <FiLoader className="w-3 h-3 animate-spin" />
              ) : (
                <FiDownload className="w-3 h-3" />
              )}
              {isDownloading ? 'Downloading...' : 'Download'}
            </button>
          )}

          {(video.submagic_status === 'completed' || video.submagic_status === 'failed') && (
            <button
              onClick={() => onReprocess(video)}
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              <FiRefreshCw className="w-3 h-3" />
              Re-process
            </button>
          )}

          {/* Delete button */}
          <div className="relative">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-2 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                aria-label="Delete video"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
