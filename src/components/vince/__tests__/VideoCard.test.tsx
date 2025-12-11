/**
 * Integration tests for VideoCard component
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import VideoCard from '../VideoCard';
import type { Video } from '@services/vince/types';

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn(() => 'Jan 1, 2024 12:00 PM'),
}));

describe('VideoCard Component', () => {
  const mockOnDownload = jest.fn();
  const mockOnReprocess = jest.fn();
  const mockOnDelete = jest.fn();

  const createMockVideo = (overrides: Partial<Video> = {}): Video => ({
    id: 'video-123',
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
    error_message: null,
    retry_count: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    processing_started_at: null,
    processing_completed_at: null,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders video title and filename', () => {
    const video = createMockVideo();

    render(
      <VideoCard
        video={video}
        onDownload={mockOnDownload}
        onReprocess={mockOnReprocess}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Test Video')).toBeInTheDocument();
    expect(screen.getByText('test-video.mp4')).toBeInTheDocument();
  });

  test('displays template name', () => {
    const video = createMockVideo({ template_name: 'Hormozi 4' });

    render(
      <VideoCard
        video={video}
        onDownload={mockOnDownload}
        onReprocess={mockOnReprocess}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/Bold & Energetic/)).toBeInTheDocument();
  });

  test('displays formatted date', () => {
    const video = createMockVideo();

    render(
      <VideoCard
        video={video}
        onDownload={mockOnDownload}
        onReprocess={mockOnReprocess}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Jan 1, 2024 12:00 PM')).toBeInTheDocument();
  });

  test('shows Completed status badge for completed videos', () => {
    const video = createMockVideo({ submagic_status: 'completed' });

    render(
      <VideoCard
        video={video}
        onDownload={mockOnDownload}
        onReprocess={mockOnReprocess}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  test('shows Processing status badge for processing videos', () => {
    const video = createMockVideo({ submagic_status: 'processing' });

    render(
      <VideoCard
        video={video}
        onDownload={mockOnDownload}
        onReprocess={mockOnReprocess}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  test('shows Pending status badge for pending videos', () => {
    const video = createMockVideo({ submagic_status: 'pending' });

    render(
      <VideoCard
        video={video}
        onDownload={mockOnDownload}
        onReprocess={mockOnReprocess}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  test('shows Failed status badge with error message for failed videos', () => {
    const video = createMockVideo({
      submagic_status: 'failed',
      error_message: 'Processing timeout',
    });

    render(
      <VideoCard
        video={video}
        onDownload={mockOnDownload}
        onReprocess={mockOnReprocess}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Processing timeout')).toBeInTheDocument();
  });

  test('shows Download button for completed videos', () => {
    const video = createMockVideo({ submagic_status: 'completed' });

    render(
      <VideoCard
        video={video}
        onDownload={mockOnDownload}
        onReprocess={mockOnReprocess}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
  });

  test('calls onDownload when Download button is clicked', () => {
    const video = createMockVideo({ submagic_status: 'completed' });

    render(
      <VideoCard
        video={video}
        onDownload={mockOnDownload}
        onReprocess={mockOnReprocess}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /download/i }));
    expect(mockOnDownload).toHaveBeenCalledWith(video);
  });

  test('shows downloading state when isDownloading is true', () => {
    const video = createMockVideo({ submagic_status: 'completed' });

    render(
      <VideoCard
        video={video}
        onDownload={mockOnDownload}
        onReprocess={mockOnReprocess}
        onDelete={mockOnDelete}
        isDownloading={true}
      />
    );

    expect(screen.getByText('Downloading...')).toBeInTheDocument();
  });

  test('shows Re-process button for completed videos', () => {
    const video = createMockVideo({ submagic_status: 'completed' });

    render(
      <VideoCard
        video={video}
        onDownload={mockOnDownload}
        onReprocess={mockOnReprocess}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByRole('button', { name: /re-process/i })).toBeInTheDocument();
  });

  test('shows Re-process button for failed videos', () => {
    const video = createMockVideo({ submagic_status: 'failed' });

    render(
      <VideoCard
        video={video}
        onDownload={mockOnDownload}
        onReprocess={mockOnReprocess}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByRole('button', { name: /re-process/i })).toBeInTheDocument();
  });

  test('calls onReprocess when Re-process button is clicked', () => {
    const video = createMockVideo({ submagic_status: 'completed' });

    render(
      <VideoCard
        video={video}
        onDownload={mockOnDownload}
        onReprocess={mockOnReprocess}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /re-process/i }));
    expect(mockOnReprocess).toHaveBeenCalledWith(video);
  });

  test('shows delete confirmation dialog when delete is clicked', () => {
    const video = createMockVideo();

    render(
      <VideoCard
        video={video}
        onDownload={mockOnDownload}
        onReprocess={mockOnReprocess}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /delete video/i }));

    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  test('calls onDelete when delete is confirmed', () => {
    const video = createMockVideo();

    render(
      <VideoCard
        video={video}
        onDownload={mockOnDownload}
        onReprocess={mockOnReprocess}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /delete video/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(mockOnDelete).toHaveBeenCalledWith(video);
  });

  test('hides delete confirmation when cancel is clicked', () => {
    const video = createMockVideo();

    render(
      <VideoCard
        video={video}
        onDownload={mockOnDownload}
        onReprocess={mockOnReprocess}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /delete video/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();
  });

  test('shows deleting state when isDeleting is true', () => {
    const video = createMockVideo();

    render(
      <VideoCard
        video={video}
        onDownload={mockOnDownload}
        onReprocess={mockOnReprocess}
        onDelete={mockOnDelete}
        isDeleting={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /delete video/i }));
    expect(screen.getByText('Deleting...')).toBeInTheDocument();
  });

  test('does not show download button for non-completed videos', () => {
    const video = createMockVideo({ submagic_status: 'processing' });

    render(
      <VideoCard
        video={video}
        onDownload={mockOnDownload}
        onReprocess={mockOnReprocess}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.queryByRole('button', { name: /download/i })).not.toBeInTheDocument();
  });

  test('does not show re-process button for pending videos', () => {
    const video = createMockVideo({ submagic_status: 'pending' });

    render(
      <VideoCard
        video={video}
        onDownload={mockOnDownload}
        onReprocess={mockOnReprocess}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.queryByRole('button', { name: /re-process/i })).not.toBeInTheDocument();
  });
});
