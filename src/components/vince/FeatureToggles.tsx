import React, { useEffect, useState } from 'react';
import { FiZoomIn, FiImage, FiGlobe, FiClock, FiFilter, FiType, FiMove, FiVideo } from 'react-icons/fi';
import { SUPPORTED_LANGUAGES, SILENCE_PACE_OPTIONS, SilencePace, CAPTION_POSITION_X_DEFAULT, CAPTION_POSITION_Y_DEFAULT } from '@services/vince/types';

// Fixed preview-thumbnail size for the caption position overlay. No aspect-ratio
// convention exists elsewhere in this codebase (checked: no aspect-[9/16]/aspect-video
// classes, no template width/height metadata) -- 9:16 is chosen here because Submagic
// is used for short-form TikTok/Reels-style vertical captioning, but this is our own
// assumption, not something confirmed against real Submagic output.
const PREVIEW_WIDTH_PX = 120;
const PREVIEW_HEIGHT_PX = Math.round((PREVIEW_WIDTH_PX * 16) / 9);

// Rough caption-band placeholder size within the preview, in px.
const CAPTION_BOX_WIDTH_PX = 76;
const CAPTION_BOX_HEIGHT_PX = 24;

const clamp = (min: number, value: number, max: number) => Math.min(max, Math.max(min, value));

interface FeatureTogglesProps {
  magicZooms: boolean;
  magicBrolls: boolean;
  magicBrollsPercentage: number;
  language: string;
  onMagicZoomsChange: (value: boolean) => void;
  onMagicBrollsChange: (value: boolean) => void;
  onMagicBrollsPercentageChange: (value: number) => void;
  onLanguageChange: (value: string) => void;
  disabled?: boolean;
  // New enhancement props
  removeSilencePace: SilencePace;
  removeBadTakes: boolean;
  hookTitleEnabled: boolean;
  hookTitleText: string;
  hookTitlePosition: number;
  onRemoveSilencePaceChange: (value: SilencePace) => void;
  onRemoveBadTakesChange: (value: boolean) => void;
  onHookTitleEnabledChange: (value: boolean) => void;
  onHookTitleTextChange: (value: string) => void;
  onHookTitlePositionChange: (value: number) => void;
  // Body caption position props (null = user hasn't touched the slider yet,
  // so nothing is sent to Submagic and it applies its own default)
  captionPositionX: number | null;
  captionPositionY: number | null;
  onCaptionPositionXChange: (value: number) => void;
  onCaptionPositionYChange: (value: number) => void;
  // Selected video file, used only to render a first-frame preview behind the
  // caption position overlay. No upload/thumbnail generation happens elsewhere
  // in VINCE today, so this is generated client-side from the raw File.
  videoFile?: File | null;
}

/**
 * AI feature toggles component
 */
const FeatureToggles: React.FC<FeatureTogglesProps> = ({
  magicZooms,
  magicBrolls,
  magicBrollsPercentage,
  language,
  onMagicZoomsChange,
  onMagicBrollsChange,
  onMagicBrollsPercentageChange,
  onLanguageChange,
  disabled = false,
  // New enhancement props
  removeSilencePace,
  removeBadTakes,
  hookTitleEnabled,
  hookTitleText,
  hookTitlePosition,
  onRemoveSilencePaceChange,
  onRemoveBadTakesChange,
  onHookTitleEnabledChange,
  onHookTitleTextChange,
  onHookTitlePositionChange,
  captionPositionX,
  captionPositionY,
  onCaptionPositionXChange,
  onCaptionPositionYChange,
  videoFile = null,
}) => {
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!videoFile) {
      setVideoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(videoFile);
    setVideoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  // Only show the overlay once the user has explicitly set BOTH axes -- we never
  // fabricate a coordinate for an axis the user hasn't touched (see caption
  // position section below for the full reasoning).
  const showCaptionOverlay = captionPositionX !== null && captionPositionY !== null;

  let captionBoxLeftPx = 0;
  let captionBoxTopPx = 0;
  if (showCaptionOverlay) {
    // X: confirmed 0-100 range maps directly to 0%-100% of preview width.
    const centerXPx = (captionPositionX! / 100) * PREVIEW_WIDTH_PX;
    captionBoxLeftPx = clamp(0, centerXPx - CAPTION_BOX_WIDTH_PX / 2, PREVIEW_WIDTH_PX - CAPTION_BOX_WIDTH_PX);

    // Y: ASSUMPTION (UNCONFIRMED) -- we only know captionPositionY's valid range
    // is 0-80 from a Submagic validation error, not how that number maps to a
    // visual position. Two readings are equally plausible from the numbers alone:
    //   (a) literal: Y is a direct percent-from-top of the frame, capped at 80
    //       because Submagic reserves the bottom ~20% of the frame (e.g. for
    //       TikTok/Reels-style UI chrome -- captions, buttons, username, etc.)
    //   (b) normalized: 0-80 is rescaled to fill 0%-100% of the frame, so 80
    //       visually means the bottom edge, not "80% down".
    // We go with (a) here: the field is named like hookTitle's `top`, which reads
    // as a literal offset, and a reserved-bottom-safe-zone is a very common
    // real-world reason for a platform to cap a position field below 100. If this
    // turns out wrong, only this block needs to change (divide by 80 instead of 100).
    const centerYPx = (captionPositionY! / 100) * PREVIEW_HEIGHT_PX;
    captionBoxTopPx = clamp(0, centerYPx - CAPTION_BOX_HEIGHT_PX / 2, PREVIEW_HEIGHT_PX - CAPTION_BOX_HEIGHT_PX);
  }

  return (
    <div className="w-full space-y-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        AI Features
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Magic Zooms Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <FiZoomIn className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Magic Zooms
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Auto-zoom on key moments
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={magicZooms}
              onChange={(e) => onMagicZoomsChange(e.target.checked)}
              disabled={disabled}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed" />
          </label>
        </div>

        {/* Magic B-rolls Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
              <FiImage className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Magic B-rolls
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                AI-selected background clips
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={magicBrolls}
              onChange={(e) => onMagicBrollsChange(e.target.checked)}
              disabled={disabled}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed" />
          </label>
        </div>
      </div>

      {/* B-roll Percentage Slider (only shown when B-rolls enabled) */}
      {magicBrolls && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              B-roll Percentage
            </label>
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
              {magicBrollsPercentage}%
            </span>
          </div>
          <input
            type="range"
            aria-label="B-roll percentage"
            min="0"
            max="100"
            step="5"
            value={magicBrollsPercentage}
            onChange={(e) => onMagicBrollsPercentageChange(parseInt(e.target.value))}
            disabled={disabled}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-600"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* Remove Silence Dropdown */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
              <FiClock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Remove Silence
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Cut dead air and pauses
              </p>
            </div>
          </div>
          <select
            value={removeSilencePace}
            onChange={(e) => onRemoveSilencePaceChange(e.target.value as SilencePace)}
            disabled={disabled}
            className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {SILENCE_PACE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Remove Filler Words Toggle - WITH WARNING */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <FiFilter className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Remove Filler Words
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Removes ums, uhs, hesitations
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={removeBadTakes}
              onChange={(e) => onRemoveBadTakesChange(e.target.checked)}
              disabled={disabled}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed" />
          </label>
        </div>
        {removeBadTakes && (
          <p className="text-xs text-amber-600 dark:text-amber-400 ml-13 pl-13">
            ⚠️ Adds ~1-2 minutes to processing time
          </p>
        )}
      </div>

      {/* Headline Hook Toggle */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center">
              <FiType className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Headline Hook
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Add animated intro caption
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={hookTitleEnabled}
              onChange={(e) => onHookTitleEnabledChange(e.target.checked)}
              disabled={disabled}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed" />
          </label>
        </div>
        {hookTitleEnabled && (
          <>
            <input
              type="text"
              value={hookTitleText}
              onChange={(e) => onHookTitleTextChange(e.target.value)}
              placeholder="Custom text (leave empty for AI-generated)"
              disabled={disabled}
              maxLength={60}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {/* Vertical Position Selector */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Vertical Position
              </label>
              <div className="flex gap-2">
                {[
                  { value: 10, label: 'Top' },
                  { value: 40, label: 'Middle' },
                  { value: 70, label: 'Bottom' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !disabled && onHookTitlePositionChange(option.value)}
                    disabled={disabled}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      hookTitlePosition === option.value
                        ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 ring-1 ring-yellow-300 dark:ring-yellow-700'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                Tip: Place hook and subtitles in different zones to avoid overlap
              </p>
            </div>
          </>
        )}
      </div>

      {/* Body Caption Position — ranges confirmed via live Submagic API testing (Aug 1, 2026): X is 0-100, Y is 0-80 */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
            <FiMove className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Caption Position
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Move the body captions on screen (leave untouched for Submagic's default)
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          {/* Live preview: rough, client-side-only, no real caption text/font/styling */}
          <div className="flex-shrink-0">
            <div
              className="relative bg-gray-900 rounded-md overflow-hidden border border-gray-700"
              style={{ width: PREVIEW_WIDTH_PX, height: PREVIEW_HEIGHT_PX }}
            >
              {videoPreviewUrl ? (
                <video
                  src={videoPreviewUrl}
                  muted
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <FiVideo className="w-6 h-6 text-gray-600" aria-hidden="true" />
                </div>
              )}

              {showCaptionOverlay && (
                <div
                  data-testid="caption-preview-box"
                  className="absolute bg-black/70 rounded flex flex-col items-center justify-center gap-1 px-1"
                  style={{
                    width: CAPTION_BOX_WIDTH_PX,
                    height: CAPTION_BOX_HEIGHT_PX,
                    left: captionBoxLeftPx,
                    top: captionBoxTopPx,
                  }}
                >
                  <div className="h-1 w-3/4 bg-gray-300/80 rounded-full" />
                  <div className="h-1 w-1/2 bg-gray-300/80 rounded-full" />
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 text-center w-[120px]">
              {showCaptionOverlay ? 'Rough preview' : 'Adjust sliders to preview'}
            </p>
          </div>

          {/* Sliders */}
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Horizontal
                </label>
                <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                  {captionPositionX ?? 'Default'}
                </span>
              </div>
              <input
                type="range"
                aria-label="Caption horizontal position"
                min="0"
                max="100"
                step="1"
                value={captionPositionX ?? CAPTION_POSITION_X_DEFAULT}
                onChange={(e) => onCaptionPositionXChange(parseInt(e.target.value))}
                disabled={disabled}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Vertical
                </label>
                <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                  {captionPositionY ?? 'Default'}
                </span>
              </div>
              <input
                type="range"
                aria-label="Caption vertical position"
                min="0"
                max="80"
                step="1"
                value={captionPositionY ?? CAPTION_POSITION_Y_DEFAULT}
                onChange={(e) => onCaptionPositionYChange(parseInt(e.target.value))}
                disabled={disabled}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Language Selector */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
            <FiGlobe className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Video Language
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Language spoken in the video
            </p>
          </div>
        </div>
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default FeatureToggles;
