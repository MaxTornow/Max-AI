import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { canvasExportService, type CanvasExportProgress, type ExportPhase } from '../services/tyler/canvasExportService';
import type { TextOverlaySettings } from '../services/tyler/types';

interface ExportState {
    status: 'idle' | 'loading-ffmpeg' | 'processing' | 'completed' | 'error' | 'cancelled';
    ffmpegProgress: number;
    processingProgress: number;
    outputBlob: Blob | null;
    outputBlobUrl: string | null;
    error: string | null;
    videoFileName: string | null;
    // Canvas export phase tracking
    exportPhase: ExportPhase | null;
    phaseMessage: string | null;
}

interface ExportContextType {
    state: ExportState;
    startExport: (file: File, settings: TextOverlaySettings, dimensions: { width: number; height: number }) => Promise<void>;
    cancelExport: () => void;
    clearExport: () => void;
    downloadResult: () => void;
    isExporting: boolean;
}

const initialState: ExportState = {
    status: 'idle',
    ffmpegProgress: 0,
    processingProgress: 0,
    outputBlob: null,
    outputBlobUrl: null,
    error: null,
    videoFileName: null,
    exportPhase: null,
    phaseMessage: null,
};

const ExportContext = createContext<ExportContextType | undefined>(undefined);

/**
 * Export context provider for managing global video export state
 * Allows export to continue when navigating away from Tyler page
 */
export const ExportProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<ExportState>(initialState);
    const abortRef = useRef(false);
    const blobUrlRef = useRef<string | null>(null);

    // Convenience getter - computed from state
    const isExporting = state.status === 'loading-ffmpeg' || state.status === 'processing';

    const startExport = useCallback(async (
        file: File,
        settings: TextOverlaySettings,
        dimensions: { width: number; height: number }
    ) => {
        // CRITICAL: Prevent duplicate exports
        if (state.status === 'loading-ffmpeg' || state.status === 'processing') {
            console.warn('Export already in progress');
            return;
        }

        // Check if canvas export is supported
        if (!canvasExportService.isSupported()) {
            setState(prev => ({
                ...prev,
                status: 'error',
                error: 'Your browser does not support canvas video recording. Please use Chrome, Edge, or Firefox.',
            }));
            return;
        }

        // Clean up previous blob URL
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
        }

        abortRef.current = false;
        setState({
            ...initialState,
            status: 'loading-ffmpeg',
            videoFileName: file.name,
            exportPhase: 'initializing',
            phaseMessage: 'Initializing...',
        });

        try {
            // Use canvas-based export for pixel-perfect text rendering
            const outputBlob = await canvasExportService.exportVideo({
                videoFile: file,
                settings,
                videoWidth: dimensions.width,
                videoHeight: dimensions.height,
                onProgress: (progress: CanvasExportProgress) => {
                    if (abortRef.current) return;

                    // Map phase to status
                    const status = progress.phase === 'initializing' ? 'loading-ffmpeg' : 'processing';

                    // Calculate overall progress based on phase
                    let overallProgress = 0;
                    switch (progress.phase) {
                        case 'initializing':
                            overallProgress = progress.progress * 0.1; // 0-10%
                            break;
                        case 'extracting-audio':
                            overallProgress = 10 + progress.progress * 0.1; // 10-20%
                            break;
                        case 'recording':
                            overallProgress = 20 + progress.progress * 0.6; // 20-80%
                            break;
                        case 'merging':
                            overallProgress = 80 + progress.progress * 0.2; // 80-100%
                            break;
                        case 'completed':
                            overallProgress = 100;
                            break;
                    }

                    setState(prev => ({
                        ...prev,
                        status,
                        ffmpegProgress: progress.phase === 'initializing' ? progress.progress : 100,
                        processingProgress: Math.round(overallProgress),
                        exportPhase: progress.phase,
                        phaseMessage: progress.message,
                    }));
                },
            });

            if (abortRef.current) {
                setState(prev => ({ ...prev, status: 'cancelled' }));
                return;
            }

            const blobUrl = URL.createObjectURL(outputBlob);
            blobUrlRef.current = blobUrl;

            setState(prev => ({
                ...prev,
                status: 'completed',
                processingProgress: 100,
                outputBlob,
                outputBlobUrl: blobUrl,
                exportPhase: 'completed',
                phaseMessage: 'Export complete!',
            }));

        } catch (error) {
            if (abortRef.current) {
                setState(prev => ({ ...prev, status: 'cancelled' }));
                return;
            }
            const errorMessage = error instanceof Error ? error.message : 'Export failed';
            setState(prev => ({
                ...prev,
                status: 'error',
                error: errorMessage,
            }));
        }
    }, [state.status]);

    const cancelExport = useCallback(() => {
        abortRef.current = true;
        setState(prev => ({ ...prev, status: 'cancelled' }));
    }, []);

    const clearExport = useCallback(() => {
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
        }
        setState(initialState);
    }, []);

    const downloadResult = useCallback(() => {
        if (!state.outputBlobUrl || !state.videoFileName) return;

        const link = document.createElement('a');
        link.href = state.outputBlobUrl;
        link.download = `${state.videoFileName.replace(/\.[^.]+$/, '')}_overlay.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // CRITICAL: Auto-dismiss after download
        clearExport();
    }, [state.outputBlobUrl, state.videoFileName, clearExport]);

    return (
        <ExportContext.Provider value={{
            state,
            startExport,
            cancelExport,
            clearExport,
            downloadResult,
            isExporting
        }}>
            {children}
        </ExportContext.Provider>
    );
};

/**
 * Custom hook to use the export context
 * @throws Error if used outside of ExportProvider
 */
export const useExport = (): ExportContextType => {
    const context = useContext(ExportContext);
    if (context === undefined) {
        throw new Error('useExport must be used within an ExportProvider');
    }
    return context;
};
