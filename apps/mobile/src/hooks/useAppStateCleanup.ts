import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useGameStore } from '../store/gameStore';

/**
 * useAppStateCleanup
 *
 * Handles app lifecycle transitions:
 * - On actual background ('background'):
 *     - Host gracefully stops the TCP server to release port 47777.
 *     - Clients close their sockets cleanly rather than hanging until timeout.
 * - On foreground ('active'):
 *     - If client has a valid session token, attempt to resume.
 *     - If host was backgrounded (and stopped), clean up to home state.
 *
 * NOTE: On Android, 'inactive' fires during normal focus shifts (keyboards,
 * system popups, screen transitions) while the user is still using the app.
 * We MUST NOT tear down servers or sockets on 'inactive'!
 */
export function useAppStateCleanup() {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const wasBackgrounded = useRef<boolean>(false);
  const hostBackgroundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      const prev = appState.current;
      appState.current = nextState;

      console.log(`[AppState] Lifecycle event: ${prev} -> ${nextState}`);

      // When going to background:
      if (nextState === 'background') {
        wasBackgrounded.current = true;
        const { transport } = useGameStore.getState();

        if (transport && typeof (transport as any).pauseHeartbeat === 'function') {
          console.log('[AppState] Backgrounded: pausing heartbeat pinging...');
          (transport as any).pauseHeartbeat();
        }
      }

      // When returning to foreground (active):
      if (nextState === 'active') {

        if (wasBackgrounded.current) {
          wasBackgrounded.current = false;
          const { transport, roomCode, resumeSession, status } = useGameStore.getState();

          console.log(`[AppState] Foreground returned (room: ${roomCode}, status: ${status})`);
          if (transport && typeof (transport as any).resumeHeartbeat === 'function') {
            (transport as any).resumeHeartbeat();
          } else if (roomCode && status === 'closed') {
            console.log('[AppState] Connection closed while backgrounded; attempting session resume...');
            resumeSession().catch((err: any) => {
              console.log(`[AppState] Resume attempt failed: ${err.message}`);
            });
          }
        }
      }
    });

    return () => {
      if (hostBackgroundTimer.current) {
        clearTimeout(hostBackgroundTimer.current);
      }
      subscription.remove();
    };
  }, []);
}
