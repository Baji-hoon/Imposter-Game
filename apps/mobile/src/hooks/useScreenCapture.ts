import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Safely prevents screen capture if the native module is compiled into the binary.
 * If running on a client build where the native module is absent, it degrades gracefully
 * without throwing an UnavailabilityError or breaking module evaluation.
 */
export function usePreventScreenCapture(key = 'default') {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    try {
      const { requireOptionalNativeModule } = require('expo-modules-core');
      const ScreenCaptureModule = requireOptionalNativeModule?.('ExpoScreenCapture');
      if (ScreenCaptureModule?.preventScreenCapture) {
        ScreenCaptureModule.preventScreenCapture();
        return () => {
          try {
            ScreenCaptureModule.allowScreenCapture?.();
          } catch {
            // ignore
          }
        };
      }
    } catch {
      // Fallback gracefully on builds without native module
    }
  }, [key]);
}
