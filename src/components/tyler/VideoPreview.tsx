import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FiMaximize, FiMinimize } from 'react-icons/fi';
import type { TextOverlaySettings } from '@services/tyler/types';
import { getCssFontFamily } from '@services/tyler/textUtils';

interface VideoPreviewProps {
    videoUrl: string;
    settings: TextOverlaySettings;
    onVideoLoad?: (width: number, height: number, duration: number) => void;
}

/**
 * VideoPreview - Video player with text overlay preview
 * CRITICAL: Y position formula must match ffmpegService exactly for parity
 */
const VideoPreview: React.FC<VideoPreviewProps> = ({
    videoUrl,
    settings,
    onVideoLoad,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const textOverlayRef = useRef<HTMLDivElement>(null);

    // Track actual video dimensions and displayed dimensions for accurate scaling
    const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);
    const [displayedSize, setDisplayedSize] = useState<{ width: number; height: number } | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Calculate aspect ratio for dynamic container sizing (eliminates black bars)
    const aspectRatio = videoDimensions
        ? videoDimensions.width / videoDimensions.height
        : 16 / 9; // Default to 16:9 until video loads
    const isVertical = aspectRatio < 1;

    // Fullscreen toggle handler
    const handleFullscreen = useCallback(async () => {
        const container = containerRef.current;
        if (!container) return;

        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await container.requestFullscreen();
            }
        } catch (err) {
            console.warn('Fullscreen not supported:', err);
        }
    }, []);

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedMetadata = () => {
            setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
            onVideoLoad?.(video.videoWidth, video.videoHeight, video.duration);
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, [onVideoLoad]);

    // Track the actual rendered size of the video element
    // With dynamic container sizing, the video fills the container exactly (no letterboxing)
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !videoDimensions) return;

        const updateDisplayedSize = () => {
            const videoRect = video.getBoundingClientRect();

            if (videoRect.width <= 0 || videoRect.height <= 0) return;

            // Video now fills container exactly (no letterboxing/pillarboxing)
            setDisplayedSize({ width: videoRect.width, height: videoRect.height });
        };

        const resizeObserver = new ResizeObserver(updateDisplayedSize);
        resizeObserver.observe(video);
        updateDisplayedSize();

        return () => resizeObserver.disconnect();
    }, [videoDimensions]);

    // Calculate scaled font size to match FFmpeg output exactly
    const getScaledFontSize = (): number => {
        if (!videoDimensions || !displayedSize) {
            return settings.fontSize * 0.3;
        }
        // Scale factor based on displayed width vs actual video width
        const scaleFactor = displayedSize.width / videoDimensions.width;
        return settings.fontSize * scaleFactor;
    };

    /**
     * Calculate Y position in pixels to match FFmpeg EXACTLY
     * CRITICAL: This formula MUST match getBaseYPosition in ffmpegService.ts
     *
     * Formula: yPosition = height * (yPositionPercent / 100) - totalTextHeight / 2
     * Clamped to [0, height - totalTextHeight] to keep text fully visible
     */
    const getYPosition = (): number => {
        if (!displayedSize || !videoDimensions) return 0;

        const scaleFactor = displayedSize.height / videoDimensions.height;
        const scaledFontSize = settings.fontSize * scaleFactor;
        const lineHeight = scaledFontSize * 1.3;
        const lines = settings.text.split('\n').filter(line => line.trim());
        const totalTextHeight = lines.length * lineHeight;

        // FORMULA: percentage of height, offset by half text height for centering
        // 0% with clamp = top edge at top
        // 50% = centered
        // 100% with clamp = bottom edge at bottom
        const yPosition = displayedSize.height * (settings.yPositionPercent / 100) - totalTextHeight / 2;

        // CLAMP to keep text fully visible
        return Math.max(0, Math.min(displayedSize.height - totalTextHeight, yPosition));
    };

    // Get X position styles
    const getXStyles = (): React.CSSProperties => {
        switch (settings.alignment) {
            case 'left':
                return { left: '5%', right: 'auto', textAlign: 'left' as const };
            case 'center':
                return { left: '5%', right: '5%', textAlign: 'center' as const };
            case 'right':
                return { left: 'auto', right: '5%', textAlign: 'right' as const };
        }
    };

    const scaledFontSize = getScaledFontSize();
    const yPosition = getYPosition();
    const xStyles = getXStyles();
    const scaledShadow = Math.max(1, scaledFontSize * 0.04);

    // Container styles: for vertical videos, constrain width and center; for horizontal, use full width
    const containerStyle: React.CSSProperties = isFullscreen
        ? {
              // Fullscreen: center video with proper aspect ratio
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'black',
          }
        : isVertical
        ? {
              // Vertical video: constrain to max height, width determined by aspect ratio
              maxHeight: '600px',
              width: 'auto',
              aspectRatio: `${aspectRatio}`,
              margin: '0 auto', // Center horizontally
          }
        : {
              // Horizontal video: full width, height determined by aspect ratio
              width: '100%',
              maxHeight: '600px',
          };

    const videoStyle: React.CSSProperties = isFullscreen
        ? {
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain' as const,
          }
        : isVertical
        ? { maxHeight: '600px' }
        : {};

    return (
        <div
            ref={containerRef}
            className={`relative rounded-lg overflow-hidden ${isFullscreen ? 'bg-black' : ''}`}
            style={containerStyle}
        >
            <video
                ref={videoRef}
                src={videoUrl}
                className={`${isFullscreen ? '' : 'w-full h-full object-cover'}`}
                style={videoStyle}
                controls
                playsInline
                muted
            />

            {settings.text && displayedSize && (
                <div
                    ref={textOverlayRef}
                    className="absolute pointer-events-none"
                    style={{
                        width: displayedSize.width,
                        height: displayedSize.height,
                        top: isFullscreen ? '50%' : 0,
                        left: isFullscreen ? '50%' : 0,
                        transform: isFullscreen ? 'translate(-50%, -50%)' : 'none',
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            top: yPosition,
                            ...xStyles,
                        }}
                    >
                        <span
                            style={{
                                fontFamily: getCssFontFamily(settings.fontName),
                                color: settings.textColor,
                                fontSize: `${scaledFontSize}px`,
                                fontWeight: 'bold',
                                textShadow: `${scaledShadow}px ${scaledShadow}px ${scaledShadow * 2}px rgba(0, 0, 0, 0.7)`,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                lineHeight: 1.3,
                                display: 'block',
                            }}
                        >
                            {/* CRITICAL: Filter empty lines to match FFmpeg behavior */}
                            {settings.text.split('\n').filter(line => line.trim()).join('\n')}
                        </span>
                    </div>
                </div>
            )}

            {/* Fullscreen toggle button */}
            <button
                onClick={handleFullscreen}
                className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors z-10"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
                {isFullscreen ? (
                    <FiMinimize className="w-5 h-5" />
                ) : (
                    <FiMaximize className="w-5 h-5" />
                )}
            </button>
        </div>
    );
};

export default VideoPreview;
