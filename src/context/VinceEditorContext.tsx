import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { UploadState, ProcessingState } from '@services/vince/types';
import { MAX_TITLE_LENGTH } from '@services/vince/types';

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
  hookTitlePosition: number;
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
  setHookTitlePosition: (position: number) => void;
  setUploadState: (state: UploadState) => void;
  setProcessingState: (stateOrUpdater: ProcessingState | ((prev: ProcessingState) => ProcessingState)) => void;
  setCurrentVideoId: (id: string | null) => void;
  setCurrentProjectId: (id: string | null) => void;
  clearEditorState: () => void;
}

const defaultState: VinceEditorState = {
  selectedFile: null,
  videoTitle: '',
  hookTitleText: '',
  hookTitlePosition: 10,
  uploadState: { status: 'idle' },
  processingState: { status: 'idle' },
  currentVideoId: null,
  currentProjectId: null,
};

const VinceEditorContext = createContext<VinceEditorContextValue | undefined>(undefined);

export const VinceEditorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [editorState, setEditorState] = useState<VinceEditorState>(defaultState);

  const setSelectedFile = useCallback((file: File | null) => {
    setEditorState((prev) => {
      // Auto-fill title when file is selected, truncated to max length
      let title = prev.videoTitle;
      if (file) {
        title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
        if (title.length > MAX_TITLE_LENGTH) {
          title = title.substring(0, MAX_TITLE_LENGTH).trim();
        }
      }
      return {
        ...prev,
        selectedFile: file,
        videoTitle: title,
      };
    });
  }, []);

  const setVideoTitle = useCallback((title: string) => {
    setEditorState((prev) => ({ ...prev, videoTitle: title }));
  }, []);

  const setHookTitleText = useCallback((text: string) => {
    setEditorState((prev) => ({ ...prev, hookTitleText: text }));
  }, []);

  const setHookTitlePosition = useCallback((hookTitlePosition: number) => {
    setEditorState((prev) => ({ ...prev, hookTitlePosition }));
  }, []);

  const setUploadState = useCallback((uploadState: UploadState) => {
    setEditorState((prev) => ({ ...prev, uploadState }));
  }, []);

  const setProcessingState = useCallback((stateOrUpdater: ProcessingState | ((prev: ProcessingState) => ProcessingState)) => {
    setEditorState((prev) => {
      const newProcessingState = typeof stateOrUpdater === 'function'
        ? stateOrUpdater(prev.processingState)
        : stateOrUpdater;
      if (newProcessingState === prev.processingState) return prev;
      return { ...prev, processingState: newProcessingState };
    });
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
        setHookTitlePosition,
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
