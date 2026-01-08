import React, { useState, useCallback } from 'react';
import type { TextOverlaySettings, TextLayer, LayerId } from '@services/tyler/types';
import FontPicker from './FontPicker';
import FontSizeSlider from './FontSizeSlider';
import ColorPicker from './ColorPicker';
import YPositionSlider from './YPositionSlider';
import AlignmentSelector from './AlignmentSelector';
import LayerSection from './LayerSection';

interface TextEditorProps {
    settings: TextOverlaySettings;
    onChange: (settings: TextOverlaySettings) => void;
    disabled?: boolean;
}

/**
 * TextEditor - Dual layer text editor with shared font
 * Supports headline (top) and body (bottom) text layers
 */
const TextEditor: React.FC<TextEditorProps> = ({
    settings,
    onChange,
    disabled = false,
}) => {
    // Track which sections are expanded
    const [expandedSections, setExpandedSections] = useState<Record<LayerId, boolean>>({
        headline: false,
        body: true,
    });

    // Helper: Get layer by ID
    const getLayer = useCallback((id: LayerId): TextLayer => {
        return settings.layers.find(l => l.id === id)!;
    }, [settings.layers]);

    // Helper: Update layer settings
    const updateLayer = useCallback((id: LayerId, updates: Partial<TextLayer>) => {
        const newLayers = settings.layers.map(layer =>
            layer.id === id ? { ...layer, ...updates } : layer
        );
        onChange({ ...settings, layers: newLayers });
    }, [settings, onChange]);

    // Helper: Update shared font
    const updateFont = useCallback((fontName: string) => {
        onChange({ ...settings, fontName });
    }, [settings, onChange]);

    // Helper: Toggle section expanded state
    const toggleExpanded = useCallback((id: LayerId) => {
        setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
    }, []);

    // Helper: Handle enabled change and auto-expand
    const handleEnabledChange = useCallback((id: LayerId, enabled: boolean) => {
        updateLayer(id, { enabled });
        // Auto-expand when enabling a layer
        if (enabled) {
            setExpandedSections(prev => ({ ...prev, [id]: true }));
        }
    }, [updateLayer]);

    const headlineLayer = getLayer('headline');
    const bodyLayer = getLayer('body');

    return (
        <div className="space-y-6">
            {/* Shared Font Picker */}
            <FontPicker
                selectedFont={settings.fontName}
                onChange={updateFont}
                disabled={disabled}
            />

            {/* Headline Layer Section */}
            <LayerSection
                title="Headline"
                enabled={headlineLayer.enabled}
                onEnabledChange={(enabled) => handleEnabledChange('headline', enabled)}
                isExpanded={expandedSections.headline}
                onExpandedChange={() => toggleExpanded('headline')}
                disabled={disabled}
            >
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Headline Text
                    </label>
                    <textarea
                        value={headlineLayer.text}
                        onChange={(e) => updateLayer('headline', { text: e.target.value })}
                        disabled={disabled}
                        rows={2}
                        placeholder="Enter headline text..."
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                    />
                </div>
                <FontSizeSlider
                    fontSize={headlineLayer.fontSize}
                    onChange={(fontSize) => updateLayer('headline', { fontSize })}
                    disabled={disabled}
                />
                <YPositionSlider
                    value={headlineLayer.yPositionPercent}
                    onChange={(yPositionPercent) => updateLayer('headline', { yPositionPercent })}
                    disabled={disabled}
                    defaultValue={15}
                />
                <ColorPicker
                    selectedColor={headlineLayer.textColor}
                    onChange={(textColor) => updateLayer('headline', { textColor })}
                    disabled={disabled}
                />
                <AlignmentSelector
                    selectedAlignment={headlineLayer.alignment}
                    onChange={(alignment) => updateLayer('headline', { alignment })}
                    disabled={disabled}
                />
            </LayerSection>

            {/* Body Layer Section */}
            <LayerSection
                title="Body Text"
                enabled={bodyLayer.enabled}
                onEnabledChange={(enabled) => handleEnabledChange('body', enabled)}
                isExpanded={expandedSections.body}
                onExpandedChange={() => toggleExpanded('body')}
                disabled={disabled}
            >
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Body Text
                    </label>
                    <textarea
                        value={bodyLayer.text}
                        onChange={(e) => updateLayer('body', { text: e.target.value })}
                        disabled={disabled}
                        rows={3}
                        placeholder="Enter body text..."
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                    />
                </div>
                <FontSizeSlider
                    fontSize={bodyLayer.fontSize}
                    onChange={(fontSize) => updateLayer('body', { fontSize })}
                    disabled={disabled}
                />
                <YPositionSlider
                    value={bodyLayer.yPositionPercent}
                    onChange={(yPositionPercent) => updateLayer('body', { yPositionPercent })}
                    disabled={disabled}
                    defaultValue={75}
                />
                <ColorPicker
                    selectedColor={bodyLayer.textColor}
                    onChange={(textColor) => updateLayer('body', { textColor })}
                    disabled={disabled}
                />
                <AlignmentSelector
                    selectedAlignment={bodyLayer.alignment}
                    onChange={(alignment) => updateLayer('body', { alignment })}
                    disabled={disabled}
                />
            </LayerSection>
        </div>
    );
};

export default TextEditor;
