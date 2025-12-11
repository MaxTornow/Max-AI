import React, { useRef, useEffect, useState } from 'react';
import type { TextOverlaySettings, TextPosition, TextAlignment } from '@services/tyler/types';
import { getCssFontFamily } from '@services/tyler/textUtils';

interface VideoPreviewProps {
    videoUrl: string;
    settings: TextOverlaySettings;
    onVideoLoad?: (width: number, height: number, duration: number) => void;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({
    videoUrl,
    settings,
    onVideoLoad,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const textOverlayRef = useRef<HTMLDivElement>(null);

    // Track actual video dimensions and displayed dimensions for accurate scaling
    const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);
    const [displayedSize, setDisplayedSize] = useState<{ width: number; height: number } | null>(null);

    // Calculate aspect ratio for dynamic container sizing (eliminates black bars)
    const aspectRatio = videoDimensions
        ? videoDimensions.width / videoDimensions.height
        : 16 / 9; // Default to 16:9 until video loads
    const isVertical = aspectRatio < 1;

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

    // Calculate Y position in pixels to match FFmpeg exactly
    const getYPosition = (): number => {
        if (!displayedSize || !videoDimensions) return 0;

        const scaleFactor = displayedSize.height / videoDimensions.height;
        const scaledFontSize = settings.fontSize * scaleFactor;
        const lineHeight = scaledFontSize * 1.3;
        const lines = settings.text.split('\n').filter(line => line.trim());
        const totalTextHeight = lines.length * lineHeight;

        switch (settings.position) {
            case 'top':
                // FFmpeg: y = h * 0.10
                return displayedSize.height * 0.10;
            case 'middle':
                // FFmpeg: y = (h - totalTextHeight) / 2
                return (displayedSize.height - totalTextHeight) / 2;
            case 'bottom':
                // FFmpeg: y = h * 0.85 - totalTextHeight
                return displayedSize.height * 0.85 - totalTextHeight;
        }
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
    const scaledLineHeight = scaledFontSize * 1.3;
    const yPosition = getYPosition();
    const xStyles = getXStyles();
    const scaledShadow = Math.max(1, scaledFontSize * 0.04);

    // Container styles: for vertical videos, constrain width and center; for horizontal, use full width
    const containerStyle: React.CSSProperties = isVertical
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

    return (
        <div
            className="relative rounded-lg overflow-hidden"
            style={containerStyle}
        >
            <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-cover"
                style={isVertical ? { maxHeight: '600px' } : {}}
                controls
                playsInline
                muted
            />

            {settings.text && displayedSize && (
                <div
                    ref={textOverlayRef}
                    className="absolute pointer-events-none inset-0"
                    style={{
                        width: displayedSize.width,
                        height: displayedSize.height,
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
                            {settings.text}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoPreview;
