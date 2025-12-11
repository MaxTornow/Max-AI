/**
 * Integration tests for TabNav component
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TabNav, { VinceTab } from '../TabNav';

describe('TabNav Component', () => {
  const mockOnTabChange = jest.fn();

  beforeEach(() => {
    mockOnTabChange.mockClear();
  });

  test('renders both Editor and Library tabs', () => {
    render(
      <TabNav activeTab="editor" onTabChange={mockOnTabChange} />
    );

    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
  });

  test('highlights active Editor tab correctly', () => {
    render(
      <TabNav activeTab="editor" onTabChange={mockOnTabChange} />
    );

    const editorTab = screen.getByText('Editor').closest('button');
    expect(editorTab).toHaveClass('text-primary-600');
  });

  test('highlights active Library tab correctly', () => {
    render(
      <TabNav activeTab="library" onTabChange={mockOnTabChange} />
    );

    const libraryTab = screen.getByText('Library').closest('button');
    expect(libraryTab).toHaveClass('text-primary-600');
  });

  test('calls onTabChange when Editor tab is clicked', () => {
    render(
      <TabNav activeTab="library" onTabChange={mockOnTabChange} />
    );

    fireEvent.click(screen.getByText('Editor'));
    expect(mockOnTabChange).toHaveBeenCalledWith('editor');
  });

  test('calls onTabChange when Library tab is clicked', () => {
    render(
      <TabNav activeTab="editor" onTabChange={mockOnTabChange} />
    );

    fireEvent.click(screen.getByText('Library'));
    expect(mockOnTabChange).toHaveBeenCalledWith('library');
  });

  test('displays library count when provided', () => {
    render(
      <TabNav activeTab="editor" onTabChange={mockOnTabChange} libraryCount={5} />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  test('does not display count when libraryCount is 0', () => {
    render(
      <TabNav activeTab="editor" onTabChange={mockOnTabChange} libraryCount={0} />
    );

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  test('does not display count when libraryCount is undefined', () => {
    render(
      <TabNav activeTab="editor" onTabChange={mockOnTabChange} />
    );

    // Should not have any count badge
    const libraryButton = screen.getByText('Library').closest('button');
    expect(libraryButton?.querySelector('.rounded-full')).not.toBeInTheDocument();
  });
});
