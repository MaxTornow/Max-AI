/**
 * BETTY Service - Submagic API Integration and Supabase Storage
 * Handles video processing workflow for AI-powered video editing
 */

import { supabase } from '../supabase/client';
import type {
  Video,
  SubmagicCreateProjectRequest,
  SubmagicCreateProjectResponse,
  SubmagicProjectResponse,
} from './types';
import { MAX_TITLE_LENGTH } from './types';
import { retryableFetch } from './retry';

const SUBMAGIC_API_URL = import.meta.env.VITE_SUBMAGIC_API_URL || 'https://api.submagic.co/v1';
const SUBMAGIC_API_KEY = import.meta.env.VITE_SUBMAGIC_API_KEY;

// ===== Submagic API Functions =====

/**
 * Create a Submagic project for video processing
 */
export const createSubmagicProject = async (
  request: SubmagicCreateProjectRequest
): Promise<SubmagicCreateProjectResponse> => {
  if (!SUBMAGIC_API_KEY) {
    throw new Error('Submagic API key not configured. Please check environment variables.');
  }

  console.log('Creating Submagic project:', request.title);

  const response = await retryableFetch(
    `${SUBMAGIC_API_URL}/projects`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SUBMAGIC_API_KEY,
      },
      body: JSON.stringify(request),
    },
    'Submagic API error'
  );

  const data = await response.json();
  console.log('Submagic project created:', data.id);
  return data;
};

/**
 * Get Submagic project status
 */
export const getSubmagicProjectStatus = async (
  projectId: string
): Promise<SubmagicProjectResponse> => {
  if (!SUBMAGIC_API_KEY) {
    throw new Error('Submagic API key not configured');
  }

  console.log('Checking Submagic project status:', projectId);

  const response = await fetch(`${SUBMAGIC_API_URL}/projects/${projectId}`, {
    method: 'GET',
    headers: {
      'x-api-key': SUBMAGIC_API_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get project status: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Submagic project status:', data.status, 'downloadUrl:', data.downloadUrl, 'directUrl:', data.directUrl);
  return data;
};

// ===== Supabase Storage Functions =====

/**
 * Get the correct MIME type for a video file based on extension.
 * Browsers (especially Safari/iOS) sometimes report .MOV files as
 * "application/octet-stream" instead of "video/quicktime", causing
 * Supabase bucket validation to fail.
 */
const getVideoMimeType = (filename: string): string => {
  const extension = filename.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    'mp4': 'video/mp4',
    'm4v': 'video/mp4',
    'mov': 'video/quicktime',
    'webm': 'video/webm',
  };
  return mimeTypes[extension || ''] || 'video/mp4';
};

/**
 * Upload video file to Supabase Storage
 */
export const uploadVideoToStorage = async (
  file: File,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<{ path: string; url: string }> => {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `${userId}/${timestamp}-${safeName}`;

  // Determine correct MIME type from extension (don't trust browser detection)
  const contentType = getVideoMimeType(file.name);
  console.log('Uploading video to storage:', path, 'contentType:', contentType);

  // Simulate progress for now (Supabase standard upload doesn't support progress)
  if (onProgress) {
    onProgress(10);
  }

  // Convert File to Blob with correct MIME type
  // Safari/iOS reports .MOV files as application/octet-stream which Supabase rejects
  const fileBuffer = await file.arrayBuffer();
  const blob = new Blob([fileBuffer], { type: contentType });

  const { data, error } = await supabase.storage
    .from('videos')
    .upload(path, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType,
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  if (onProgress) {
    onProgress(80);
  }

  // Get signed URL for Submagic (24 hours for processing)
  const { data: urlData, error: urlError } = await supabase.storage
    .from('videos')
    .createSignedUrl(path, 86400);

  if (urlError || !urlData) {
    console.error('Signed URL error:', urlError);
    throw new Error('Failed to generate signed URL');
  }

  if (onProgress) {
    onProgress(100);
  }

  console.log('Video uploaded successfully:', path);
  return { path, url: urlData.signedUrl };
};

/**
 * Download processed video from Submagic and save to Supabase
 */
export const saveProcessedVideo = async (
  downloadUrl: string,
  userId: string,
  originalFilename: string
): Promise<string> => {
  console.log('Attempting to save processed video from:', downloadUrl);

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error('Failed to download from Submagic');
    }
    const blob = await response.blob();

    const timestamp = Date.now();
    const safeName = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const processedName = safeName.replace(/\.[^.]+$/, '_processed.mp4');
    const path = `${userId}/processed/${timestamp}-${processedName}`;

    const { error } = await supabase.storage
      .from('videos')
      .upload(path, blob, {
        contentType: 'video/mp4',
        cacheControl: '3600',
      });

    if (error) {
      throw new Error(`Failed to save processed video: ${error.message}`);
    }

    console.log('Processed video saved to:', path);
    return path;
  } catch (error) {
    // CORS fallback: just store the Submagic URL (it will expire)
    console.warn('Could not download from Submagic, storing URL reference only:', error);
    return downloadUrl;
  }
};

/**
 * Delete original video file from storage after processed version is confirmed saved.
 * Non-fatal: errors are logged as warnings, never thrown.
 * Idempotent: calling on an already-deleted file returns success.
 */
export const deleteOriginalVideo = async (
  originalStoragePath: string
): Promise<void> => {
  console.log('Cleaning up original video file:', originalStoragePath);
  const { error } = await supabase.storage
    .from('videos')
    .remove([originalStoragePath]);
  if (error) {
    console.warn('Failed to delete original video (non-fatal):', error);
  } else {
    console.log('Original video deleted successfully:', originalStoragePath);
  }
};

/**
 * Complete video processing: save processed video, update DB, and clean up original.
 * Only deletes the original if the processed version was saved to Supabase Storage
 * (not a URL fallback from CORS failure).
 */
export const completeVideoProcessing = async (
  videoId: string,
  userId: string,
  originalFilename: string,
  originalStoragePath: string,
  downloadUrl: string
): Promise<string> => {
  // 1. Download from Submagic and save to Supabase Storage
  const processedPath = await saveProcessedVideo(downloadUrl, userId, originalFilename);

  // 2. Update database record
  await updateVideoRecord(videoId, {
    submagic_status: 'completed',
    processed_storage_path: processedPath,
    submagic_download_url: downloadUrl,
    processing_completed_at: new Date().toISOString(),
  });

  // 3. Delete original ONLY if processed was saved to storage (not URL fallback)
  if (!processedPath.startsWith('http')) {
    await deleteOriginalVideo(originalStoragePath);
  }

  return processedPath;
};

/**
 * Get signed URL for video download
 */
export const getVideoSignedUrl = async (
  storagePath: string
): Promise<string> => {
  // If it's already a URL (from Submagic), return as-is
  if (storagePath.startsWith('http')) {
    return storagePath;
  }

  const { data, error } = await supabase.storage
    .from('videos')
    .createSignedUrl(storagePath, 3600); // 1 hour

  if (error || !data) {
    console.error('Signed URL error:', error);
    throw new Error('Failed to generate download URL');
  }

  return data.signedUrl;
};

// ===== Database Functions =====

/**
 * Create video record in database
 */
export const createVideoRecord = async (
  video: Omit<Video, 'id' | 'created_at' | 'updated_at'>
): Promise<Video> => {
  console.log('Creating video record:', video.title);

  const { data, error } = await supabase
    .from('videos')
    .insert(video)
    .select()
    .single();

  if (error) {
    console.error('Create video record error:', error);
    throw new Error(`Failed to create video record: ${error.message}`);
  }

  console.log('Video record created:', data.id);
  return data;
};

/**
 * Update video record
 */
export const updateVideoRecord = async (
  videoId: string,
  updates: Partial<Video>
): Promise<Video> => {
  console.log('Updating video record:', videoId, updates);

  const { data, error } = await supabase
    .from('videos')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', videoId)
    .select()
    .single();

  if (error) {
    console.error('Update video record error:', error);
    throw new Error(`Failed to update video: ${error.message}`);
  }

  console.log('Video record updated:', data.id);
  return data;
};

/**
 * Get user's videos
 */
export const getUserVideos = async (
  userId: string
): Promise<Video[]> => {
  console.log('Fetching videos for user:', userId);

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get user videos error:', error);
    throw new Error(`Failed to load videos: ${error.message}`);
  }

  console.log('Fetched', data?.length || 0, 'videos');
  return data || [];
};

/**
 * Get single video
 */
export const getVideo = async (
  videoId: string,
  userId: string
): Promise<Video | null> => {
  console.log('Fetching video:', videoId);

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.log('Video not found:', videoId);
      return null;
    }
    console.error('Get video error:', error);
    throw new Error(`Failed to load video: ${error.message}`);
  }

  return data;
};

/**
 * Delete video and associated files
 */
export const deleteVideo = async (
  videoId: string,
  userId: string
): Promise<void> => {
  console.log('Deleting video:', videoId);

  // Get video to find storage paths
  const video = await getVideo(videoId, userId);
  if (!video) {
    throw new Error('Video not found');
  }

  // Delete from storage
  const pathsToDelete = [video.original_storage_path];
  if (video.processed_storage_path && !video.processed_storage_path.startsWith('http')) {
    pathsToDelete.push(video.processed_storage_path);
  }

  console.log('Deleting storage paths:', pathsToDelete);
  const { error: storageError } = await supabase.storage.from('videos').remove(pathsToDelete);

  if (storageError) {
    console.warn('Storage deletion warning:', storageError);
    // Continue with database deletion even if storage deletion fails
  }

  // Delete database record
  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('id', videoId)
    .eq('user_id', userId);

  if (error) {
    console.error('Delete video error:', error);
    throw new Error(`Failed to delete video: ${error.message}`);
  }

  console.log('Video deleted successfully:', videoId);
};

/**
 * Process video through Submagic
 * This is the main orchestration function
 */
export const processVideo = async (
  videoId: string,
  userId: string,
  signedUrl: string,
  options: {
    title: string;
    templateName: string;
    language: string;
    magicZooms: boolean;
    magicBrolls: boolean;
    magicBrollsPercentage: number;
    // New enhancement options
    removeSilencePace?: 'natural' | 'fast' | 'extra-fast';
    removeBadTakes?: boolean;
    hookTitle?: boolean | { text?: string; top?: number };
  }
): Promise<string> => {
  console.log('Starting video processing:', videoId);

  // Update status to processing
  await updateVideoRecord(videoId, {
    submagic_status: 'processing',
    processing_started_at: new Date().toISOString(),
  });

  // Truncate title to prevent Submagic "title is too long" error
  const truncatedTitle = options.title.length > MAX_TITLE_LENGTH
    ? options.title.substring(0, MAX_TITLE_LENGTH).trim()
    : options.title;

  // Build base request
  const request: SubmagicCreateProjectRequest = {
    title: truncatedTitle,
    videoUrl: signedUrl,
    templateName: options.templateName,
    language: options.language,
    magicZooms: options.magicZooms,
    magicBrolls: options.magicBrolls,
    magicBrollsPercentage: options.magicBrollsPercentage,
  };

  // Add optional enhancement parameters only if they have values
  if (options.removeSilencePace) {
    request.removeSilencePace = options.removeSilencePace;
  }
  if (options.removeBadTakes) {
    request.removeBadTakes = options.removeBadTakes;
  }
  if (options.hookTitle) {
    request.hookTitle = options.hookTitle;
  }

  // Create Submagic project
  const project = await createSubmagicProject(request);

  // Update with project ID
  await updateVideoRecord(videoId, {
    submagic_project_id: project.id,
  });

  console.log('Video processing started, project ID:', project.id);
  return project.id;
};

// Re-export types for convenience
export * from './types';
export * from './templates';
