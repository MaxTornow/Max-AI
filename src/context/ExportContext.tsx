import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { ffmpegService } from '../services/tyler';
import type { TextOverlaySettings } from '../services/tyler/types';

interface ExportState {
    status: 'idle' | 'loading-ffmpeg' | 'processing' | 'completed' | 'error' | 'cancelled';
    ffmpegProgress: number;
    processingProgress: number;
    outputBlob: Blob | null;
    outputBlobUrl: string | null;
    error: string | null;
    videoFileName: string | null;
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
        });

        try {
            // Load FFmpeg if needed
            if (!ffmpegService.isLoaded()) {
                await ffmpegService.load((progress) => {
                    if (abortRef.current) return;
                    setState(prev => ({ ...prev, ffmpegProgress: progress }));
                });
            }

            if (abortRef.current) {
                setState(prev => ({ ...prev, status: 'cancelled' }));
                return;
            }

            setState(prev => ({ ...prev, status: 'processing', ffmpegProgress: 100 }));

            // Process video
            const outputBlob = await ffmpegService.processVideo(
                file,
                settings,
                dimensions.width,
                dimensions.height,
                (progress) => {
                    if (abortRef.current) return;
                    setState(prev => ({ ...prev, processingProgress: progress }));
                }
            );

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
