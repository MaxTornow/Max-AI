/**
 * Integration tests for FeatureToggles component
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeatureToggles from '../FeatureToggles';

describe('FeatureToggles Component', () => {
  const defaultProps = {
    magicZooms: true,
    magicBrolls: true,
    magicBrollsPercentage: 40,
    language: 'en',
    onMagicZoomsChange: jest.fn(),
    onMagicBrollsChange: jest.fn(),
    onMagicBrollsPercentageChange: jest.fn(),
    onLanguageChange: jest.fn(),
    // New enhancement props
    removeSilencePace: 'off' as const,
    removeBadTakes: false,
    hookTitleEnabled: false,
    hookTitleText: '',
    hookTitlePosition: 10,
    onRemoveSilencePaceChange: jest.fn(),
    onRemoveBadTakesChange: jest.fn(),
    onHookTitleEnabledChange: jest.fn(),
    onHookTitleTextChange: jest.fn(),
    onHookTitlePositionChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders AI Features label', () => {
    render(<FeatureToggles {...defaultProps} />);
    expect(screen.getByText('AI Features')).toBeInTheDocument();
  });

  test('renders Magic Zooms toggle', () => {
    render(<FeatureToggles {...defaultProps} />);
    expect(screen.getByText('Magic Zooms')).toBeInTheDocument();
    expect(screen.getByText('Auto-zoom on key moments')).toBeInTheDocument();
  });

  test('renders Magic B-rolls toggle', () => {
    render(<FeatureToggles {...defaultProps} />);
    expect(screen.getByText('Magic B-rolls')).toBeInTheDocument();
    expect(screen.getByText('AI-selected background clips')).toBeInTheDocument();
  });

  test('renders language selector', () => {
    render(<FeatureToggles {...defaultProps} />);
    expect(screen.getByText('Video Language')).toBeInTheDocument();
    expect(screen.getByText('Language spoken in the video')).toBeInTheDocument();
  });

  test('Magic Zooms toggle reflects state', () => {
    const { rerender } = render(<FeatureToggles {...defaultProps} magicZooms={true} />);

    const checkboxes = screen.getAllByRole('checkbox');
    const zoomsCheckbox = checkboxes[0];
    expect(zoomsCheckbox).toBeChecked();

    rerender(<FeatureToggles {...defaultProps} magicZooms={false} />);
    expect(zoomsCheckbox).not.toBeChecked();
  });

  test('Magic B-rolls toggle reflects state', () => {
    const { rerender } = render(<FeatureToggles {...defaultProps} magicBrolls={true} />);

    const checkboxes = screen.getAllByRole('checkbox');
    const brollsCheckbox = checkboxes[1];
    expect(brollsCheckbox).toBeChecked();

    rerender(<FeatureToggles {...defaultProps} magicBrolls={false} />);
    expect(brollsCheckbox).not.toBeChecked();
  });

  test('calls onMagicZoomsChange when toggled', () => {
    render(<FeatureToggles {...defaultProps} magicZooms={true} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    expect(defaultProps.onMagicZoomsChange).toHaveBeenCalledWith(false);
  });

  test('calls onMagicBrollsChange when toggled', () => {
    render(<FeatureToggles {...defaultProps} magicBrolls={true} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    expect(defaultProps.onMagicBrollsChange).toHaveBeenCalledWith(false);
  });

  test('shows B-roll percentage slider when B-rolls enabled', () => {
    render(<FeatureToggles {...defaultProps} magicBrolls={true} />);

    expect(screen.getByText('B-roll Percentage')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  test('hides B-roll percentage slider when B-rolls disabled', () => {
    render(<FeatureToggles {...defaultProps} magicBrolls={false} />);

    expect(screen.queryByText('B-roll Percentage')).not.toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  test('calls onMagicBrollsPercentageChange when slider changes', () => {
    render(<FeatureToggles {...defaultProps} magicBrolls={true} />);

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '60' } });

    expect(defaultProps.onMagicBrollsPercentageChange).toHaveBeenCalledWith(60);
  });

  test('displays current language selection', () => {
    render(<FeatureToggles {...defaultProps} language="en" />);

    // Second combobox is the language selector (first is Remove Silence)
    const selects = screen.getAllByRole('combobox');
    expect(selects[1]).toHaveValue('en');
  });

  test('calls onLanguageChange when language changes', () => {
    render(<FeatureToggles {...defaultProps} language="en" />);

    // Second combobox is the language selector
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: 'es' } });

    expect(defaultProps.onLanguageChange).toHaveBeenCalledWith('es');
  });

  test('includes all supported languages in selector', () => {
    render(<FeatureToggles {...defaultProps} />);

    // Second combobox is the language selector
    const selects = screen.getAllByRole('combobox');
    const languageSelect = selects[1];
    const options = languageSelect.querySelectorAll('option');

    expect(options.length).toBeGreaterThanOrEqual(10);
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Spanish')).toBeInTheDocument();
    expect(screen.getByText('French')).toBeInTheDocument();
  });

  test('disables all controls when disabled prop is true', () => {
    render(<FeatureToggles {...defaultProps} disabled={true} />);

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeDisabled();
    });

    // Both comboboxes should be disabled
    const selects = screen.getAllByRole('combobox');
    selects.forEach((select) => {
      expect(select).toBeDisabled();
    });
  });

  test('disables slider when disabled prop is true', () => {
    render(<FeatureToggles {...defaultProps} magicBrolls={true} disabled={true} />);

    const slider = screen.getByRole('slider');
    expect(slider).toBeDisabled();
  });

  test('displays correct percentage value on slider', () => {
    const { rerender } = render(
      <FeatureToggles {...defaultProps} magicBrolls={true} magicBrollsPercentage={25} />
    );

    expect(screen.getByText('25%')).toBeInTheDocument();

    rerender(
      <FeatureToggles {...defaultProps} magicBrolls={true} magicBrollsPercentage={75} />
    );

    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  // ========== NEW ENHANCEMENT TESTS ==========

  test('renders Remove Silence section', () => {
    render(<FeatureToggles {...defaultProps} />);
    expect(screen.getByText('Remove Silence')).toBeInTheDocument();
    expect(screen.getByText('Cut dead air and pauses')).toBeInTheDocument();
  });

  test('renders Remove Filler Words toggle', () => {
    render(<FeatureToggles {...defaultProps} />);
    expect(screen.getByText('Remove Filler Words')).toBeInTheDocument();
    expect(screen.getByText('Removes ums, uhs, hesitations')).toBeInTheDocument();
  });

  test('shows processing time warning when Remove Filler Words enabled', () => {
    render(<FeatureToggles {...defaultProps} removeBadTakes={true} />);
    expect(screen.getByText(/Adds ~1-2 minutes to processing time/)).toBeInTheDocument();
  });

  test('hides processing time warning when Remove Filler Words disabled', () => {
    render(<FeatureToggles {...defaultProps} removeBadTakes={false} />);
    expect(screen.queryByText(/Adds ~1-2 minutes to processing time/)).not.toBeInTheDocument();
  });

  test('renders Hook Title toggle', () => {
    render(<FeatureToggles {...defaultProps} />);
    expect(screen.getByText('Hook Title')).toBeInTheDocument();
    expect(screen.getByText('Add animated intro caption')).toBeInTheDocument();
  });

  test('calls onRemoveSilencePaceChange when dropdown changes', () => {
    render(<FeatureToggles {...defaultProps} />);

    const selects = screen.getAllByRole('combobox');
    // First combobox is Remove Silence dropdown
    fireEvent.change(selects[0], { target: { value: 'fast' } });

    expect(defaultProps.onRemoveSilencePaceChange).toHaveBeenCalledWith('fast');
  });

  test('calls onRemoveBadTakesChange when toggled', () => {
    render(<FeatureToggles {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    // Third checkbox is Remove Filler Words (after Magic Zooms and Magic B-rolls)
    fireEvent.click(checkboxes[2]);

    expect(defaultProps.onRemoveBadTakesChange).toHaveBeenCalledWith(true);
  });

  test('shows hook title text input when enabled', () => {
    render(<FeatureToggles {...defaultProps} hookTitleEnabled={true} />);

    expect(screen.getByPlaceholderText('Custom text (leave empty for AI-generated)')).toBeInTheDocument();
  });

  test('hides hook title text input when disabled', () => {
    render(<FeatureToggles {...defaultProps} hookTitleEnabled={false} />);

    expect(screen.queryByPlaceholderText('Custom text (leave empty for AI-generated)')).not.toBeInTheDocument();
  });

  test('calls onHookTitleTextChange when text input changes', () => {
    render(<FeatureToggles {...defaultProps} hookTitleEnabled={true} />);

    const input = screen.getByPlaceholderText('Custom text (leave empty for AI-generated)');
    fireEvent.change(input, { target: { value: 'My Hook' } });

    expect(defaultProps.onHookTitleTextChange).toHaveBeenCalledWith('My Hook');
  });

  test('calls onHookTitleEnabledChange when toggled', () => {
    render(<FeatureToggles {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    // Fourth checkbox is Hook Title (after Magic Zooms, Magic B-rolls, Remove Filler Words)
    fireEvent.click(checkboxes[3]);

    expect(defaultProps.onHookTitleEnabledChange).toHaveBeenCalledWith(true);
  });
});
