import { useEffect } from 'react';

/**
 * NoSleep Video Technique for iOS Safari on HTTP:
 * The Wake Lock API requires HTTPS, so on LAN/Hotspot HTTP connections,
 * playing a silent 1x1 looping inline video keeps the screen awake reliably.
 */
const BLANK_VIDEO_B64 =
  'data:video/mp4;base64,AAAAHGZ0eXBNNEVFAAAAAAxpc29tYXZjMW1wNDEAAAAIZnJlZQAAABdtZGF0AAACrgYF//+63234234AAAAARG1vb3YAAABsbXZoZAAAAAB1624AdetuAAACmgAAAmkAAAEAAAEAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAA==';

export function useNoSleep(): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    let video: HTMLVideoElement | null = document.createElement('video');
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('muted', 'true');
    video.muted = true;
    video.setAttribute('loop', 'true');
    video.loop = true;
    video.style.position = 'fixed';
    video.style.bottom = '0px';
    video.style.right = '0px';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.opacity = '0.01';
    video.style.pointerEvents = 'none';
    video.style.zIndex = '-9999';
    video.src = BLANK_VIDEO_B64;

    try {
      document.body.appendChild(video);
    } catch {
      return;
    }

    const playVideo = () => {
      if (video && video.paused) {
        video.play().catch(() => {});
      }
    };

    window.addEventListener('touchstart', playVideo, { passive: true });
    window.addEventListener('touchend', playVideo, { passive: true });
    window.addEventListener('click', playVideo, { passive: true });

    playVideo();

    return () => {
      window.removeEventListener('touchstart', playVideo);
      window.removeEventListener('touchend', playVideo);
      window.removeEventListener('click', playVideo);
      if (video && video.parentNode) {
        try {
          video.pause();
          video.parentNode.removeChild(video);
        } catch {}
        video = null;
      }
    };
  }, []);
}
