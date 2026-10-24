import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

/**
 * useAppStateCleanup (Web):
 * Listens to document visibilitychange and pagehide:
 * - On visible: if socket is closed or disconnected, immediately initiates resumeSession().
 * - Dispatches custom 'imposter-hide-card' event on visibilitychange / pagehide
 *   so the secret word card instantly conceals itself.
 */
export function useAppStateCleanup(): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        window.dispatchEvent(new CustomEvent('imposter-hide-card'));
      } else if (document.visibilityState === 'visible') {
        const { roomCode, status, resumeSession } = useGameStore.getState();
        if (roomCode && status === 'closed') {
          console.log('[WebLifecycle] Tab returned to foreground; attempting session resume...');
          resumeSession().catch(() => {});
        }
      }
    };

    const handlePageHide = () => {
      window.dispatchEvent(new CustomEvent('imposter-hide-card'));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);
}
