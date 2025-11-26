/**
 * Integration tests for ProcessingProgress component
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProcessingProgress from '../ProcessingProgress';
import type { ProcessingState } from '@services/betty/types';

describe('ProcessingProgress Component', () => {
  const mockOnRetry = jest.fn();
  const mockOnViewLibrary = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns null when status is idle', () => {
    const state: ProcessingState = {
      status: 'idle',
      progress: 0,
      message: '',
    };

    const { container } = render(
      <ProcessingProgress state={state} onRetry={mockOnRetry} onViewLibrary={mockOnViewLibrary} />
    );

    expect(container.firstChild).toBeNull();
  });

  test('displays creating state correctly', () => {
    const state: ProcessingState = {
      status: 'creating',
      progress: 0,
      message: 'Setting up your project...',
    };

    render(
      <ProcessingProgress state={state} onRetry={mockOnRetry} onViewLibrary={mockOnViewLibrary} />
    );

    expect(screen.getByText('Creating project...')).toBeInTheDocument();
    expect(screen.getByText('Setting up your project...')).toBeInTheDocument();
  });

  test('displays processing state with progress bar', () => {
    const state: ProcessingState = {
      status: 'processing',
      progress: 45,
      message: 'Processing...',
    };

    render(
      <ProcessingProgress state={state} onRetry={mockOnRetry} onViewLibrary={mockOnViewLibrary} />
    );

    expect(screen.getByText('Processing video...')).toBeInTheDocument();
    expect(screen.getByText('This may take a few minutes. You can close this page and check back later.')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  test('displays downloading state correctly', () => {
    const state: ProcessingState = {
      status: 'downloading',
      progress: 100,
      message: 'Downloading processed video...',
    };

    render(
      <ProcessingProgress state={state} onRetry={mockOnRetry} onViewLibrary={mockOnViewLibrary} />
    );

    expect(screen.getByText('Finalizing...')).toBeInTheDocument();
    expect(screen.getByText('Downloading processed video...')).toBeInTheDocument();
  });

  test('displays completed state with view library button', () => {
    const state: ProcessingState = {
      status: 'completed',
      progress: 100,
      message: 'Done!',
    };

    render(
      <ProcessingProgress state={state} onRetry={mockOnRetry} onViewLibrary={mockOnViewLibrary} />
    );

    expect(screen.getByText('Processing complete!')).toBeInTheDocument();
    expect(screen.getByText('Your video is ready to download.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view in library/i })).toBeInTheDocument();
  });

  test('calls onViewLibrary when view library button is clicked', () => {
    const state: ProcessingState = {
      status: 'completed',
      progress: 100,
      message: 'Done!',
    };

    render(
      <ProcessingProgress state={state} onRetry={mockOnRetry} onViewLibrary={mockOnViewLibrary} />
    );

    fireEvent.click(screen.getByRole('button', { name: /view in library/i }));
    expect(mockOnViewLibrary).toHaveBeenCalled();
  });

  test('displays error state with error message', () => {
    const state: ProcessingState = {
      status: 'error',
      progress: 0,
      message: 'Network error occurred',
      retryable: true,
    };

    render(
      <ProcessingProgress state={state} onRetry={mockOnRetry} onViewLibrary={mockOnViewLibrary} />
    );

    expect(screen.getByText('Processing failed')).toBeInTheDocument();
    expect(screen.getByText('Network error occurred')).toBeInTheDocument();
  });

  test('shows retry button for retryable errors', () => {
    const state: ProcessingState = {
      status: 'error',
      progress: 0,
      message: 'Temporary error',
      retryable: true,
    };

    render(
      <ProcessingProgress state={state} onRetry={mockOnRetry} onViewLibrary={mockOnViewLibrary} />
    );

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  test('hides retry button for non-retryable errors', () => {
    const state: ProcessingState = {
      status: 'error',
      progress: 0,
      message: 'Fatal error',
      retryable: false,
    };

    render(
      <ProcessingProgress state={state} onRetry={mockOnRetry} onViewLibrary={mockOnViewLibrary} />
    );

    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  test('calls onRetry when retry button is clicked', () => {
    const state: ProcessingState = {
      status: 'error',
      progress: 0,
      message: 'Temporary error',
      retryable: true,
    };

    render(
      <ProcessingProgress state={state} onRetry={mockOnRetry} onViewLibrary={mockOnViewLibrary} />
    );

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(mockOnRetry).toHaveBeenCalled();
  });

  test('does not show view library button when onViewLibrary is not provided', () => {
    const state: ProcessingState = {
      status: 'completed',
      progress: 100,
      message: 'Done!',
    };

    render(<ProcessingProgress state={state} />);

    expect(screen.queryByRole('button', { name: /view in library/i })).not.toBeInTheDocument();
  });

  test('does not show retry button when onRetry is not provided', () => {
    const state: ProcessingState = {
      status: 'error',
      progress: 0,
      message: 'Error',
      retryable: true,
    };

    render(<ProcessingProgress state={state} />);

    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  test('progress bar width matches progress value', () => {
    const state: ProcessingState = {
      status: 'processing',
      progress: 67,
      message: 'Processing...',
    };

    const { container } = render(
      <ProcessingProgress state={state} onRetry={mockOnRetry} onViewLibrary={mockOnViewLibrary} />
    );

    const progressBar = container.querySelector('[style*="width: 67%"]');
    expect(progressBar).toBeInTheDocument();
  });
});
