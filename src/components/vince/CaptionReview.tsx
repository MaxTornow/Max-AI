import React, { useState } from 'react';
import { FiX, FiCheck, FiLoader, FiAlertCircle, FiLock } from 'react-icons/fi';
import type { Video, SubmagicWord } from '@services/vince/types';
import { isWordInHookWindow } from '@services/vince/captions';
import { saveCaptionCorrections } from '@services/vince/captionCorrection';
import { updateVideoRecord } from '@services/vince';

interface CaptionReviewProps {
  video: Video;
  onClose: () => void;
  /** Called after a successful save so the caller can refresh its video list. */
  onSaved: () => void;
}

/**
 * Caption correction panel: lets a user fix misspelled words/names in
 * Submagic's transcript, text-only (timing is never touched), then saves
 * the correction and waits for the re-rendered video.
 */
const CaptionReview: React.FC<CaptionReviewProps> = ({ video, onClose, onSaved }) => {
  const originalWords = video.transcript?.words ?? [];
  const [words, setWords] = useState<SubmagicWord[]>(originalWords);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      await updateVideoRecord(video.id, {
        transcript: { words },
        submagic_download_url: newVideoUrl,
      });

      onSaved();
      onClose();
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Review Captions</h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Click a word to fix a typo or misspelling. Timing is never changed.
          </p>

          <div className="flex flex-wrap gap-1 leading-loose">
            {words.map((word) => {
              if (word.type === 'silence') return null;

              const inHook = isWordInHookWindow(word, video.hook_title_enabled);
              const isEditing = editingId === word.id;

              if (word.type === 'punctuation') {
                return (
                  <span key={word.id} className="text-gray-700 dark:text-gray-300">
                    {word.text}
                  </span>
                );
              }

              if (inHook) {
                return (
                  <span
                    key={word.id}
                    title="Inside the animated intro title — that text is a separate AI-generated line, not driven by this transcript. Edit the intro text in the video's hook title setting instead."
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed"
                  >
                    <FiLock className="w-3 h-3" />
                    {word.text}
                  </span>
                );
              }

              if (isEditing) {
                return (
                  <input
                    key={word.id}
                    autoFocus
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    className="px-1.5 py-0.5 rounded border border-primary-400 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm w-24"
                  />
                );
              }

              const edited = originalWords.find((w) => w.id === word.id)?.text !== word.text;

              return (
                <button
                  key={word.id}
                  type="button"
                  onClick={() => startEditing(word)}
                  disabled={saving}
                  className={`px-1.5 py-0.5 rounded text-sm transition-colors disabled:opacity-50 ${
                    edited
                      ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  {word.text}
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-400">
              <FiAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {hasChanges ? 'Discard' : 'Close'}
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
