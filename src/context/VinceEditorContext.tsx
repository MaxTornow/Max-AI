import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { UploadState, ProcessingState } from '@services/vince/types';

/**
 * VinceEditorContext - Persists Vince editor state across in-app navigation
 *
 * The selectedFile is stored in memory (not localStorage - File objects can't be serialized)
 * so navigating to other pages and back will preserve the video selection.
 *
 * Upload and processing state are also stored here so the progress bar
 * persists when navigating away and back during upload/processing.
 *
 * hookTitleText is also stored here for in-app navigation persistence.
 * (It's also saved to localStorage for page refresh persistence in VincePage.tsx)
 */

interface VinceEditorState {
  selectedFile: File | null;
  videoTitle: string;
  hookTitleText: string;
  // Upload/Processing state - persists across navigation
  uploadState: UploadState;
  processingState: ProcessingState;
  currentVideoId: string | null;
  currentProjectId: string | null;
}

interface VinceEditorContextValue {
  editorState: VinceEditorState;
  setSelectedFile: (file: File | null) => void;
  setVideoTitle: (title: string) => void;
  setHookTitleText: (text: string) => void;
  setUploadState: (state: UploadState) => void;
  setProcessingState: (state: ProcessingState) => void;
  setCurrentVideoId: (id: string | null) => void;
  setCurrentProjectId: (id: string | null) => void;
  clearEditorState: () => void;
}

const defaultState: VinceEditorState = {
  selectedFile: null,
  videoTitle: '',
  hookTitleText: '',
  uploadState: { status: 'idle' },
  processingState: { status: 'idle' },
  currentVideoId: null,
  currentProjectId: null,
};

const VinceEditorContext = createContext<VinceEditorContextValue | undefined>(undefined);

export const VinceEditorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [editorState, setEditorState] = useState<VinceEditorState>(defaultState);

  const setSelectedFile = useCallback((file: File | null) => {
    setEditorState((prev) => ({
      ...prev,
      selectedFile: file,
      // Auto-fill title when file is selected
      videoTitle: file
        ? file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
        : prev.videoTitle,
    }));
  }, []);

  const setVideoTitle = useCallback((title: string) => {
    setEditorState((prev) => ({ ...prev, videoTitle: title }));
  }, []);

  const setHookTitleText = useCallback((text: string) => {
    setEditorState((prev) => ({ ...prev, hookTitleText: text }));
  }, []);

  const setUploadState = useCallback((uploadState: UploadState) => {
    setEditorState((prev) => ({ ...prev, uploadState }));
  }, []);

  const setProcessingState = useCallback((processingState: ProcessingState) => {
    setEditorState((prev) => ({ ...prev, processingState }));
  }, []);

  const setCurrentVideoId = useCallback((currentVideoId: string | null) => {
    setEditorState((prev) => ({ ...prev, currentVideoId }));
  }, []);

  const setCurrentProjectId = useCallback((currentProjectId: string | null) => {
    setEditorState((prev) => ({ ...prev, currentProjectId }));
  }, []);

  const clearEditorState = useCallback(() => {
    setEditorState(defaultState);
  }, []);

  return (
    <VinceEditorContext.Provider
      value={{
        editorState,
        setSelectedFile,
        setVideoTitle,
        setHookTitleText,
        setUploadState,
        setProcessingState,
        setCurrentVideoId,
        setCurrentProjectId,
        clearEditorState,
      }}
    >
      {children}
    </VinceEditorContext.Provider>
  );
};

export const useVinceEditor = (): VinceEditorContextValue => {
  const context = useContext(VinceEditorContext);
  if (!context) {
    throw new Error('useVinceEditor must be used within a VinceEditorProvider');
  }
  return context;
};

export default VinceEditorContext;
