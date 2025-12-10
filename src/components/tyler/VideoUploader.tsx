import React, { useCallback } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { FiUploadCloud, FiX, FiVideo, FiAlertCircle } from 'react-icons/fi';
import { ACCEPTED_VIDEO_TYPES, MAX_FILE_SIZE } from '@services/tyler/constants';

interface VideoUploaderProps {
    onFileAccepted: (file: File) => void;
    onFileRemoved: () => void;
    selectedFile: File | null;
    error?: string | null;
    disabled?: boolean;
}

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const VideoUploader: React.FC<VideoUploaderProps> = ({
    onFileAccepted,
    onFileRemoved,
    selectedFile,
    error,
    disabled = false,
}) => {
    const onDrop = useCallback(
        (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
            if (rejectedFiles.length > 0) {
                const rejection = rejectedFiles[0];
                const errorCode = rejection.errors[0]?.code;
                let errorMessage = 'Invalid file';

                if (errorCode === 'file-too-large') {
                    errorMessage = `File is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`;
                } else if (errorCode === 'file-invalid-type') {
                    errorMessage = 'Invalid file type. Please upload MP4 or MOV files only.';
                }

                console.error('File rejected:', errorMessage, rejection);
                return;
            }

            if (acceptedFiles.length > 0) {
                onFileAccepted(acceptedFiles[0]);
            }
        },
        [onFileAccepted]
    );

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop,
        accept: ACCEPTED_VIDEO_TYPES,
        maxSize: MAX_FILE_SIZE,
        maxFiles: 1,
        disabled,
    });

    if (selectedFile) {
        return (
            <div className="w-full">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                            <FiVideo className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {selectedFile.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {formatFileSize(selectedFile.size)}
                            </p>
                        </div>
                        {!disabled && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onFileRemoved();
                                }}
                                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                aria-label="Remove file"
                            >
                                <FiX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mt-3 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                        <FiAlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="w-full">
            <div
                {...getRootProps()}
                className={`
                    relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                    transition-colors duration-200
                    ${
                        isDragReject
                            ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                            : isDragActive
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
                    }
                    ${disabled ? 'opacity-50 pointer-events-none' : ''}
                `}
            >
                <input {...getInputProps()} />

                <div className="flex flex-col items-center gap-3">
                    <div
                        className={`
                            w-14 h-14 rounded-full flex items-center justify-center
                            ${
                                isDragReject
                                    ? 'bg-red-100 dark:bg-red-900/40'
                                    : isDragActive
                                    ? 'bg-primary-100 dark:bg-primary-900/40'
                                    : 'bg-gray-100 dark:bg-gray-800'
                            }
                        `}
                    >
                        <FiUploadCloud
                            className={`w-7 h-7 ${
                                isDragReject
                                    ? 'text-red-500'
                                    : isDragActive
                                    ? 'text-primary-500'
                                    : 'text-gray-400 dark:text-gray-500'
                            }`}
                        />
                    </div>

                    <div>
                        {isDragReject ? (
                            <p className="text-red-600 dark:text-red-400 font-medium">
                                Invalid file type
                            </p>
                        ) : isDragActive ? (
                            <p className="text-primary-600 dark:text-primary-400 font-medium">
                                Drop your video here
                            </p>
                        ) : (
                            <>
                                <p className="text-gray-700 dark:text-gray-200 font-medium">
                                    Drag and drop your video here
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    or click to browse
                                </p>
                            </>
                        )}
                    </div>

                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        MP4 or MOV up to 100MB
                    </p>
                </div>
            </div>

            {error && (
                <div className="mt-3 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                    <FiAlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
};

export default VideoUploader;
