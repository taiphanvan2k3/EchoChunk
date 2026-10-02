'use client';

import { useEffect, useRef } from 'react';

// Khai báo kiểu dữ liệu chuẩn cho YouTube IFrame API (Tránh dùng any)
interface YTPlayerInstance {
  destroy: () => void;
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
}

interface YTStateChangeEvent {
  data: number;
  target: YTPlayerInstance;
}

interface YTNamespace {
  Player: new (
    element: HTMLElement | string,
    options: {
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, unknown>;
      events?: {
        onReady?: (event: unknown) => void;
        onStateChange?: (event: YTStateChangeEvent) => void;
      };
    }
  ) => YTPlayerInstance;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  onTimeUpdate: (currentTimeSec: number) => void;
  onReady?: () => void;
  seekToTime?: number | null;
  onSeekHandled?: () => void;
}

export function YouTubePlayer({
  videoId,
  onTimeUpdate,
  onReady,
  seekToTime,
  onSeekHandled,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerElementRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onReadyRef = useRef(onReady);
  const onSeekHandledRef = useRef(onSeekHandled);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
    onReadyRef.current = onReady;
    onSeekHandledRef.current = onSeekHandled;
  }, [onTimeUpdate, onReady, onSeekHandled]);

  // 1. Tải YouTube IFrame API script nếu chưa có
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // 2. Khởi tạo player khi API đã sẵn sàng
  useEffect(() => {
    let isMounted = true;

    function stopTracking() {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    function startTracking() {
      stopTracking();
      timerRef.current = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          const time = playerRef.current.getCurrentTime();
          onTimeUpdateRef.current(time);
        }
      }, 50); // Cập nhật mỗi 50ms cho hiệu ứng Karaoke mượt mà
    }

    function initPlayer() {
      if (!isMounted || !window.YT?.Player || !playerElementRef.current) return;

      // Xóa player cũ nếu đã tồn tại
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch {
          // Bỏ qua lỗi hủy player cũ
        }
      }

      // Khởi tạo player trực tiếp trên phần tử DOM
      playerRef.current = new window.YT.Player(playerElementRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (isMounted) {
              onReadyRef.current?.();
            }
          },
          onStateChange: (event: YTStateChangeEvent) => {
            // 1 = PLAYING
            if (event.data === 1) {
              startTracking();
            } else {
              stopTracking();
              if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                onTimeUpdateRef.current(playerRef.current.getCurrentTime());
              }
            }
          },
        },
      });
    }

    if (window.YT?.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    }

    return () => {
      isMounted = false;
      stopTracking();
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch {
          // Bỏ qua lỗi hủy player khi unmount
        }
      }
    };
  }, [videoId]);

  // 3. Xử lý lệnh tua (seekToTime) từ bên ngoài (khi bấm vào câu)
  useEffect(() => {
    if (seekToTime !== null && seekToTime !== undefined && playerRef.current) {
      if (typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(seekToTime, true);
        if (typeof playerRef.current.playVideo === 'function') {
          playerRef.current.playVideo();
        }
        onTimeUpdateRef.current(seekToTime);
      }
      onSeekHandledRef.current?.();
    }
  }, [seekToTime]);

  return (
    <div className="w-full aspect-video rounded-xl overflow-hidden bg-black shadow-[0_4px_20px_-2px_rgba(0,0,0,0.12)]" ref={containerRef}>
      <div ref={playerElementRef} className="w-full h-full border-0" />
    </div>
  );
}
