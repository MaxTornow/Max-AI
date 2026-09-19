import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiCheck, FiLoader, FiAlertCircle, FiLock, FiCrosshair } from 'react-icons/fi';
import type { Video, SubmagicWord } from '@services/vince/types';
import { isWordInHookWindow } from '@services/vince/captions';
import { saveCaptionCorrections } from '@services/vince/captionCorrection';
import { completeVideoProcessing, getVideoSignedUrl } from '@services/vince';

interface CaptionReviewProps {
  video: Video;
  onClose: () => void;
  /**
   * Called after a successful save. The caller is expected to both refresh
   * its video list and close/finalize this panel -- this component does not
   * call onClose itself after a successful save.
   */
  onSaved: () => void;
  /**
   * 'gate': a video that just finished processing -- this is a mandatory
   * checkpoint before it's finalized, so closing without saving still finishes
   * (a user isn't forced to edit anything, just to pass through the screen).
   * 'library': optional, anytime revisit of an already-finalized video.
   */
  mode?: 'gate' | 'library';
}

/**
 * Caption correction panel: video playback synced with the word-level
 * transcript (TikTok-editor style) -- click the target icon on any word to
 * jump the video there, or click the word itself to fix a typo. Timing is
 * never changed; only word text can be edited.
 */
const CaptionReview: React.FC<CaptionReviewProps> = ({ video, onClose, onSaved, mode = 'library' }) => {
  const originalWords = video.transcript?.words ?? [];
  const [words, setWords] = useState<SubmagicWord[]>(originalWords);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wordRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Prefer our own cached copy in Storage (kept indefinitely) over Submagic's
  // own hosted URL, which the docs note expires "in hours" -- a video opened
  // for review more than a few hours after processing would otherwise fail
  // to load. Same source getVideoSignedUrl() already serves for downloads.
  useEffect(() => {
    let cancelled = false;
    const source = video.processed_storage_path || video.submagic_download_url;

    if (!source) {
      setVideoError('No video file is available to preview.');
      return;
    }

    getVideoSignedUrl(source)
      .then((url) => {
        if (!cancelled) setVideoSrc(url);
      })
      .catch(() => {
        if (!cancelled) setVideoError('Could not load the video preview.');
      });

    return () => {
      cancelled = true;
    };
  }, [video.processed_storage_path, video.submagic_download_url]);

  const hasChanges = words.some((word, i) => word.text !== originalWords[i]?.text);

  const startEditing = (word: SubmagicWord) => {
    if (saving) return;
    setEditingId(word.id);
    setDraftText(word.text);
  };

  const commitEdit = () => {
    if (editingId == null) return;
    setWords((prev) =>
      prev.map((word) => (word.id === editingId ? { ...word, text: draftText } : word))
    );
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  // Always pauses before seeking (decision: clicking a seek target while
  // playing should stop playback and jump, never seek silently underneath
  // continued playback).
  const seekToWord = (word: SubmagicWord) => {
    const el = videoRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = word.startTime;
    setActiveWordId(word.id);
  };

  // Active word = the most recent word-type entry whose startTime has been
  // reached -- stays highlighted through gaps/silence rather than flickering
  // off between words, since this drives the auto-scroll that's meant to
  // track "what's on screen right now" continuously during playback.
  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (!el) return;
    const t = el.currentTime;

    let current: SubmagicWord | null = null;
    for (const word of words) {
      if (word.type !== 'word') continue;
      if (word.startTime <= t && (!current || word.startTime > current.startTime)) {
        current = word;
      }
    }
    setActiveWordId(current?.id ?? null);
  };

  useEffect(() => {
    if (!activeWordId) return;
    wordRefs.current.get(activeWordId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [activeWordId]);

  const handleSave = async () => {
    if (!video.submagic_project_id) {
      setError('This video has no Submagic project on record, so corrections can’t be saved.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const previousVideoUrl = video.submagic_download_url ?? undefined;
      const result = await saveCaptionCorrections(video.submagic_project_id, words, previousVideoUrl);
      const newVideoUrl = result.downloadUrl || result.directUrl || previousVideoUrl || '';

      // Re-run the same download-and-store step the initial processing used
      // (completeVideoProcessing), not just a DB field update -- the app
      // serves processed_storage_path (our own cached copy in Storage) over
      // submagic_download_url whenever both exist, so updating only the URL
      // text left every download serving the stale pre-correction file. This
      // was a real bug caught by live testing (Sep 19 2026): Submagic's own
      // API confirmed the corrected render existed, but downloads from our
      // Library kept serving the original.
      await completeVideoProcessing(
        video.id,
        video.user_id,
        video.original_filename,
        video.original_storage_path,
        newVideoUrl,
        { words }
      );

      onSaved();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save caption corrections. Your edits are still here — you can retry.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Review Captions</h2>
            {mode === 'gate' && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Your video is processed. Check for any misspelled words before finishing up.
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col md:flex-row gap-4 px-6 py-4">
          {/* Video pane */}
          <div className="w-full max-w-[220px] mx-auto md:mx-0 flex-shrink-0">
            {videoError ? (
              <div className="aspect-[9/16] rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-xs text-gray-400 text-center p-3">
                {videoError}
              </div>
            ) : videoSrc ? (
              <video
                ref={videoRef}
                src={videoSrc}
                controls
                playsInline
                onTimeUpdate={handleTimeUpdate}
                className="w-full aspect-[9/16] rounded-lg bg-black object-contain"
              />
            ) : (
              <div className="aspect-[9/16] rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                <FiLoader className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            )}
          </div>

          {/* Transcript pane */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Click a word to fix a typo. Click <FiCrosshair className="inline w-3 h-3 -mt-0.5" /> to jump the video there. Timing is never changed.
            </p>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="flex flex-wrap content-start gap-1.5 leading-loose">
                {words.map((word) => {
                  if (word.type === 'silence') return null;

                  if (word.type === 'punctuation') {
                    return (
                      <span key={word.id} className="text-gray-700 dark:text-gray-300">
                        {word.text}
                      </span>
                    );
                  }

                  const inHook = isWordInHookWindow(word, video.hook_title_enabled);
                  const isEditing = editingId === word.id;
                  const isActive = activeWordId === word.id;
                  const edited = originalWords.find((w) => w.id === word.id)?.text !== word.text;

                  return (
                    <span
                      key={word.id}
                      ref={(el) => {
                        if (el) wordRefs.current.set(word.id, el);
                        else wordRefs.current.delete(word.id);
                      }}
                      className={`inline-flex items-stretch rounded overflow-hidden ${
                        isActive ? 'ring-2 ring-primary-400' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => seekToWord(word)}
                        disabled={!videoSrc || saving}
                        title="Jump the video to this word"
                        className="px-1 flex items-center text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 bg-gray-50 dark:bg-gray-900/40 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <FiCrosshair className="w-3 h-3" />
                      </button>

                      {inHook ? (
                        <span
                          title="Inside the animated intro title — that text is a separate AI-generated line, not driven by this transcript. Edit the intro text in the video's hook title setting instead."
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed"
                        >
                          <FiLock className="w-3 h-3" />
                          {word.text}
                        </span>
                      ) : isEditing ? (
                        <input
                          autoFocus
                          value={draftText}
                          onChange={(e) => setDraftText(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="px-1.5 py-0.5 border-0 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm w-24 focus:outline-none focus:ring-1 focus:ring-primary-400"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditing(word)}
                          disabled={saving}
                          className={`px-1.5 py-0.5 text-sm transition-colors disabled:opacity-50 ${
                            edited
                              ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300'
                              : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                          }`}
                        >
                          {word.text}
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-400">
            <FiAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {mode === 'gate'
              ? hasChanges ? 'Discard & Finish' : 'Looks Good, Finish'
              : hasChanges ? 'Discard' : 'Close'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <FiLoader className="w-4 h-4 animate-spin" />
                Saving & re-rendering...
              </>
            ) : (
              <>
                <FiCheck className="w-4 h-4" />
                Save corrections
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CaptionReview;
