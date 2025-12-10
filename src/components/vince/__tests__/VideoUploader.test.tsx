/**
 * Integration tests for VideoUploader component
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import VideoUploader from '../VideoUploader';

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(({ onDrop, disabled }) => ({
    getRootProps: () => ({
      onClick: disabled ? undefined : () => {},
      'data-testid': 'dropzone',
    }),
    getInputProps: () => ({
      type: 'file',
      'data-testid': 'file-input',
      disabled,
    }),
    isDragActive: false,
    isDragReject: false,
  })),
}));

describe('VideoUploader Component', () => {
  const defaultProps = {
    onFileAccepted: jest.fn(),
    onFileRemoved: jest.fn(),
    selectedFile: null,
    isUploading: false,
    uploadProgress: 0,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders dropzone when no file is selected', () => {
    render(<VideoUploader {...defaultProps} />);

    expect(screen.getByText('Drag and drop your video here')).toBeInTheDocument();
    expect(screen.getByText('or click to browse')).toBeInTheDocument();
    expect(screen.getByText('MP4, MOV, or WebM up to 2GB')).toBeInTheDocument();
  });

  test('renders file info when file is selected', () => {
    const mockFile = new File(['test'], 'test-video.mp4', { type: 'video/mp4' });
    Object.defineProperty(mockFile, 'size', { value: 1024 * 1024 }); // 1MB

    render(<VideoUploader {...defaultProps} selectedFile={mockFile} />);

    expect(screen.getByText('test-video.mp4')).toBeInTheDocument();
    expect(screen.getByText('1 MB')).toBeInTheDocument();
  });

  test('shows remove button when file is selected and not uploading', () => {
    const mockFile = new File(['test'], 'test-video.mp4', { type: 'video/mp4' });

    render(<VideoUploader {...defaultProps} selectedFile={mockFile} />);

    const removeButton = screen.getByRole('button', { name: /remove file/i });
    expect(removeButton).toBeInTheDocument();
  });

  test('calls onFileRemoved when remove button is clicked', () => {
    const mockFile = new File(['test'], 'test-video.mp4', { type: 'video/mp4' });

    render(<VideoUploader {...defaultProps} selectedFile={mockFile} />);

    const removeButton = screen.getByRole('button', { name: /remove file/i });
    fireEvent.click(removeButton);

    expect(defaultProps.onFileRemoved).toHaveBeenCalled();
  });

  test('hides remove button when uploading', () => {
    const mockFile = new File(['test'], 'test-video.mp4', { type: 'video/mp4' });

    render(
      <VideoUploader {...defaultProps} selectedFile={mockFile} isUploading={true} />
    );

    expect(screen.queryByRole('button', { name: /remove file/i })).not.toBeInTheDocument();
  });

  test('shows upload progress when uploading', () => {
    const mockFile = new File(['test'], 'test-video.mp4', { type: 'video/mp4' });

    render(
      <VideoUploader
        {...defaultProps}
        selectedFile={mockFile}
        isUploading={true}
        uploadProgress={45}
      />
    );

    expect(screen.getByText('Uploading...')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  test('shows error message when error prop is set', () => {
    render(
      <VideoUploader {...defaultProps} error="Invalid file type" />
    );

    expect(screen.getByText('Invalid file type')).toBeInTheDocument();
  });

  test('shows error message with selected file', () => {
    const mockFile = new File(['test'], 'test-video.mp4', { type: 'video/mp4' });

    render(
      <VideoUploader
        {...defaultProps}
        selectedFile={mockFile}
        error="Upload failed"
      />
    );

    expect(screen.getByText('test-video.mp4')).toBeInTheDocument();
    expect(screen.getByText('Upload failed')).toBeInTheDocument();
  });

  test('displays correct file size formatting', () => {
    const mockFile = new File(['test'], 'test-video.mp4', { type: 'video/mp4' });

    // Test KB
    Object.defineProperty(mockFile, 'size', { value: 1024 * 500 }); // 500KB
    const { rerender } = render(<VideoUploader {...defaultProps} selectedFile={mockFile} />);
    expect(screen.getByText('500 KB')).toBeInTheDocument();

    // Test MB
    const mockFile2 = new File(['test'], 'test-video2.mp4', { type: 'video/mp4' });
    Object.defineProperty(mockFile2, 'size', { value: 1024 * 1024 * 50 }); // 50MB
    rerender(<VideoUploader {...defaultProps} selectedFile={mockFile2} />);
    expect(screen.getByText('50 MB')).toBeInTheDocument();

    // Test GB
    const mockFile3 = new File(['test'], 'test-video3.mp4', { type: 'video/mp4' });
    Object.defineProperty(mockFile3, 'size', { value: 1024 * 1024 * 1024 * 1.5 }); // 1.5GB
    rerender(<VideoUploader {...defaultProps} selectedFile={mockFile3} />);
    expect(screen.getByText('1.5 GB')).toBeInTheDocument();
  });

  test('progress bar reflects uploadProgress value', () => {
    const mockFile = new File(['test'], 'test-video.mp4', { type: 'video/mp4' });

    const { container } = render(
      <VideoUploader
        {...defaultProps}
        selectedFile={mockFile}
        isUploading={true}
        uploadProgress={75}
      />
    );

    const progressBar = container.querySelector('[style*="width: 75%"]');
    expect(progressBar).toBeInTheDocument();
  });
});
