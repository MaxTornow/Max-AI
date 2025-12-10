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

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('en');
  });

  test('calls onLanguageChange when language changes', () => {
    render(<FeatureToggles {...defaultProps} language="en" />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'es' } });

    expect(defaultProps.onLanguageChange).toHaveBeenCalledWith('es');
  });

  test('includes all supported languages in selector', () => {
    render(<FeatureToggles {...defaultProps} />);

    const select = screen.getByRole('combobox');
    const options = select.querySelectorAll('option');

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

    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
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
});
