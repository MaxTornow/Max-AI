/**
 * Integration tests for VideoLibrary component
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import VideoLibrary from '../VideoLibrary';
import type { Video } from '@services/vince/types';

// Mock date-fns for VideoCard
jest.mock('date-fns', () => ({
  format: jest.fn(() => 'Jan 1, 2024 12:00 PM'),
}));

describe('VideoLibrary Component', () => {
  const mockOnDownload = jest.fn();
  const mockOnReprocess = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnRefresh = jest.fn();

  const createMockVideo = (overrides: Partial<Video> = {}): Video => ({
    id: 'video-' + Math.random().toString(36).substr(2, 9),
    user_id: 'user-456',
    title: 'Test Video',
    original_filename: 'test-video.mp4',
    file_size_bytes: 1024000,
    duration_seconds: 60,
    original_storage_path: 'user-456/test.mp4',
    processed_storage_path: null,
    submagic_project_id: 'proj-789',
    submagic_status: 'completed',
    submagic_download_url: 'https://example.com/download',
    template_name: 'Hormozi 4',
    language: 'en',
    magic_zooms: true,
    magic_brolls: false,
    magic_brolls_percentage: 0,
    remove_silence_pace: null,
    remove_bad_takes: false,
    hook_title_enabled: false,
    hook_title_text: null,
    hook_title_position: null,
    error_message: null,
    retry_count: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    processing_started_at: null,
    processing_completed_at: null,
    ...overrides,
  });

  const defaultProps = {
    videos: [],
    isLoading: false,
    onDownload: mockOnDownload,
    onReprocess: mockOnReprocess,
    onDelete: mockOnDelete,
    onRefresh: mockOnRefresh,
    downloadingVideoId: null,
    deletingVideoId: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state', () => {
    render(<VideoLibrary {...defaultProps} isLoading={true} />);

    expect(screen.getByText('Loading your videos...')).toBeInTheDocument();
  });

  test('renders empty state when no videos', () => {
    render(<VideoLibrary {...defaultProps} />);

    expect(screen.getByText('No videos yet')).toBeInTheDocument();
    expect(
      screen.getByText('Upload a video in the Editor tab to get started with AI-powered video editing.')
    ).toBeInTheDocument();
  });

  test('renders video count correctly for single video', () => {
    const videos = [createMockVideo()];

    render(<VideoLibrary {...defaultProps} videos={videos} />);

    expect(screen.getByText('1 video in your library')).toBeInTheDocument();
  });

  test('renders video count correctly for multiple videos', () => {
    const videos = [
      createMockVideo({ id: '1', title: 'Video 1' }),
      createMockVideo({ id: '2', title: 'Video 2' }),
      createMockVideo({ id: '3', title: 'Video 3' }),
    ];

    render(<VideoLibrary {...defaultProps} videos={videos} />);

    expect(screen.getByText('3 videos in your library')).toBeInTheDocument();
  });

  test('renders refresh button', () => {
    const videos = [createMockVideo()];

    render(<VideoLibrary {...defaultProps} videos={videos} />);

    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  test('calls onRefresh when refresh button is clicked', () => {
    const videos = [createMockVideo()];

    render(<VideoLibrary {...defaultProps} videos={videos} />);

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(mockOnRefresh).toHaveBeenCalled();
  });

  test('renders all video cards', () => {
    const videos = [
      createMockVideo({ id: '1', title: 'First Video' }),
      createMockVideo({ id: '2', title: 'Second Video' }),
    ];

    render(<VideoLibrary {...defaultProps} videos={videos} />);

    expect(screen.getByText('First Video')).toBeInTheDocument();
    expect(screen.getByText('Second Video')).toBeInTheDocument();
  });

  test('passes downloadingVideoId to correct video card', () => {
    const videos = [
      createMockVideo({ id: 'video-1', title: 'Video 1', submagic_status: 'completed' }),
      createMockVideo({ id: 'video-2', title: 'Video 2', submagic_status: 'completed' }),
    ];

    render(
      <VideoLibrary {...defaultProps} videos={videos} downloadingVideoId="video-1" />
    );

    // The first video should show "Downloading..."
    expect(screen.getByText('Downloading...')).toBeInTheDocument();
    // There should be exactly one "Download" button text (the non-downloading one)
    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  test('passes deletingVideoId to correct video card', () => {
    const videos = [
      createMockVideo({ id: 'video-1', title: 'Video 1' }),
      createMockVideo({ id: 'video-2', title: 'Video 2' }),
    ];

    render(
      <VideoLibrary {...defaultProps} videos={videos} deletingVideoId="video-1" />
    );

    // Click delete on first video
    const deleteButtons = screen.getAllByRole('button', { name: /delete video/i });
    fireEvent.click(deleteButtons[0]);

    // Should show "Deleting..." for the first video
    expect(screen.getByText('Deleting...')).toBeInTheDocument();
  });

  test('calls onDownload with correct video', () => {
    const videos = [createMockVideo({ id: 'video-1', submagic_status: 'completed' })];

    render(<VideoLibrary {...defaultProps} videos={videos} />);

    fireEvent.click(screen.getByRole('button', { name: /download/i }));
    expect(mockOnDownload).toHaveBeenCalledWith(expect.objectContaining({ id: 'video-1' }));
  });

  test('calls onReprocess with correct video', () => {
    const videos = [createMockVideo({ id: 'video-1', submagic_status: 'completed' })];

    render(<VideoLibrary {...defaultProps} videos={videos} />);

    fireEvent.click(screen.getByRole('button', { name: /re-process/i }));
    expect(mockOnReprocess).toHaveBeenCalledWith(expect.objectContaining({ id: 'video-1' }));
  });

  test('calls onDelete with correct video', () => {
    const videos = [createMockVideo({ id: 'video-1' })];

    render(<VideoLibrary {...defaultProps} videos={videos} />);

    fireEvent.click(screen.getByRole('button', { name: /delete video/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(mockOnDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'video-1' }));
  });

  test('renders videos in a grid layout', () => {
    const videos = [
      createMockVideo({ id: '1' }),
      createMockVideo({ id: '2' }),
      createMockVideo({ id: '3' }),
      createMockVideo({ id: '4' }),
    ];

    const { container } = render(<VideoLibrary {...defaultProps} videos={videos} />);

    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).toHaveClass('sm:grid-cols-2');
    expect(grid).toHaveClass('lg:grid-cols-3');
    expect(grid).toHaveClass('xl:grid-cols-4');
  });
});
