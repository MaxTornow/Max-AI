/**
 * Integration tests for TemplateSelector component
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TemplateSelector from '../TemplateSelector';
import { BETTY_TEMPLATES, getDefaultTemplate } from '@services/betty/templates';

describe('TemplateSelector Component', () => {
  const mockOnSelectTemplate = jest.fn();
  const defaultTemplate = getDefaultTemplate();

  beforeEach(() => {
    mockOnSelectTemplate.mockClear();
  });

  test('renders all 8 templates', () => {
    render(
      <TemplateSelector
        selectedTemplate={defaultTemplate}
        onSelectTemplate={mockOnSelectTemplate}
      />
    );

    BETTY_TEMPLATES.forEach((template) => {
      expect(screen.getByText(template.name)).toBeInTheDocument();
    });
  });

  test('displays template descriptions', () => {
    render(
      <TemplateSelector
        selectedTemplate={defaultTemplate}
        onSelectTemplate={mockOnSelectTemplate}
      />
    );

    BETTY_TEMPLATES.forEach((template) => {
      expect(screen.getByText(template.description)).toBeInTheDocument();
    });
  });

  test('shows selected template with check icon', () => {
    render(
      <TemplateSelector
        selectedTemplate={defaultTemplate}
        onSelectTemplate={mockOnSelectTemplate}
      />
    );

    // The selected template should have a checkmark
    const selectedButton = screen.getByText(defaultTemplate.name).closest('button');
    expect(selectedButton).toHaveClass('border-primary-500');
  });

  test('calls onSelectTemplate when a template is clicked', () => {
    render(
      <TemplateSelector
        selectedTemplate={defaultTemplate}
        onSelectTemplate={mockOnSelectTemplate}
      />
    );

    const cleanProfessional = BETTY_TEMPLATES.find(t => t.key === 'clean-professional')!;
    fireEvent.click(screen.getByText(cleanProfessional.name));

    expect(mockOnSelectTemplate).toHaveBeenCalledWith(cleanProfessional);
  });

  test('does not call onSelectTemplate when disabled', () => {
    render(
      <TemplateSelector
        selectedTemplate={defaultTemplate}
        onSelectTemplate={mockOnSelectTemplate}
        disabled={true}
      />
    );

    const cleanProfessional = BETTY_TEMPLATES.find(t => t.key === 'clean-professional')!;
    fireEvent.click(screen.getByText(cleanProfessional.name));

    expect(mockOnSelectTemplate).not.toHaveBeenCalled();
  });

  test('applies disabled styling when disabled', () => {
    render(
      <TemplateSelector
        selectedTemplate={defaultTemplate}
        onSelectTemplate={mockOnSelectTemplate}
        disabled={true}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-50');
    });
  });

  test('displays color preview for each template', () => {
    const { container } = render(
      <TemplateSelector
        selectedTemplate={defaultTemplate}
        onSelectTemplate={mockOnSelectTemplate}
      />
    );

    // Each template has a color bar
    const colorBars = container.querySelectorAll('.rounded-full.h-2');
    expect(colorBars.length).toBe(8);
  });

  test('updates selection when different template is selected', () => {
    const { rerender } = render(
      <TemplateSelector
        selectedTemplate={defaultTemplate}
        onSelectTemplate={mockOnSelectTemplate}
      />
    );

    const newTemplate = BETTY_TEMPLATES.find(t => t.key === 'mrbeast-vibes')!;

    rerender(
      <TemplateSelector
        selectedTemplate={newTemplate}
        onSelectTemplate={mockOnSelectTemplate}
      />
    );

    const newSelectedButton = screen.getByText(newTemplate.name).closest('button');
    expect(newSelectedButton).toHaveClass('border-primary-500');
  });

  test('displays label for template selection', () => {
    render(
      <TemplateSelector
        selectedTemplate={defaultTemplate}
        onSelectTemplate={mockOnSelectTemplate}
      />
    );

    expect(screen.getByText('Choose Template Style')).toBeInTheDocument();
  });
});
