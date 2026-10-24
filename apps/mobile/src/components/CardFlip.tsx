import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  AppState,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { usePreventScreenCapture } from '../hooks/useScreenCapture';

interface CardFlipProps {
  word: string | null;
  hasWord: boolean;
  roundId: string;
  isOneWord?: boolean;
}

export const CardFlip: React.FC<CardFlipProps> = ({
  word,
  hasWord,
  roundId,
  isOneWord = false,
}) => {
  const { theme } = useTheme();

  // Screen capture protection per spec (safe across dev clients)
  usePreventScreenCapture();

  const [isRevealed, setIsRevealed] = useState(false);
  const [hasLookedOnce, setHasLookedOnce] = useState(false);
  const [hint, setHint] = useState<string>('Tap to reveal your card');

  const lastTapRef = useRef<number>(0);
  const hideTimerRef = useRef<any>(null);
  const flipAnim = useRef(new Animated.Value(0)).current;

  // Reset look state whenever round changes
  useEffect(() => {
    setIsRevealed(false);
    setHasLookedOnce(false);
    setHint('Tap to reveal your card');
    flipAnim.setValue(0);
  }, [roundId]);

  // Auto-hide instantly when app is backgrounded, switcher opened, or web page hidden
  useEffect(() => {
    const handleHide = () => {
      hideCard();
    };

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState.match(/inactive|background/)) {
        hideCard();
      }
    });

    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      typeof window.addEventListener === 'function'
    ) {
      window.addEventListener('pagehide', handleHide);
      window.addEventListener('visibilitychange', handleHide);
      window.addEventListener('imposter-hide-card', handleHide);
    }

    return () => {
      subscription.remove();
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (
        Platform.OS === 'web' &&
        typeof window !== 'undefined' &&
        typeof window.removeEventListener === 'function'
      ) {
        window.removeEventListener('pagehide', handleHide);
        window.removeEventListener('visibilitychange', handleHide);
        window.removeEventListener('imposter-hide-card', handleHide);
      }
    };
  }, []);

  const showCard = (durationMs: number) => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    setIsRevealed(true);
    setHasLookedOnce(true);
    setHint('Tap to hide (or auto-hides)');

    Animated.spring(flipAnim, {
      toValue: 180,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();

    // Auto-hide timer (4s for first look, 3s for re-peek)
    hideTimerRef.current = setTimeout(() => {
      hideCard();
    }, durationMs);
  };

  const hideCard = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    setIsRevealed(false);
    setHint('Double-tap to peek');

    Animated.spring(flipAnim, {
      toValue: 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  };

  const handleCardPress = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    lastTapRef.current = now;

    if (isRevealed) {
      // Tap again hides immediately
      hideCard();
      return;
    }

    if (!hasLookedOnce) {
      // First look: single tap reveals for 4 seconds
      showCard(4000);
    } else {
      // Re-peek: requires double-tap (< 350 ms)
      if (timeSinceLastTap < 350) {
        showCard(3000);
      } else {
        setHint('Double-tap quickly to peek!');
        setTimeout(() => {
          setHint('Double-tap to peek');
        }, 1500);
      }
    }
  };

  // Interpolations for 3D flip effect
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [89, 90],
    outputRange: [1, 0],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [89, 90],
    outputRange: [0, 1],
  });

  const isBlankImposter = hasWord && word === null;

  // Responsive font sizing based on word length.
  // Crucial for Web/Safari where adjustsFontSizeToFit is not supported by browsers,
  // preventing longer words like "MOUNTAIN" or "RESTAURANT" from getting cut off with ellipses.
  const revealedWordFontSize = (() => {
    if (!word) return 38;
    const len = word.length;
    if (len <= 5) return 44; // "APPLE", "PIZZA"
    if (len <= 8) return 32; // "MOUNTAIN", "BASEBALL", "AIRPLANE"
    if (len <= 11) return 26; // "RESTAURANT", "HELICOPTER"
    if (len <= 15) return 22; // "ROLLER COASTER", "CHOCOLATE"
    return 19;
  })();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleCardPress}
        style={styles.touchArea}
      >
        {/* CARD BACK (HIDDEN STATE) */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.cardBack,
              borderColor: theme.colors.cardBackBorder,
              opacity: frontOpacity,
              transform: [{ rotateY: frontInterpolate }],
            },
          ]}
        >
          <View style={styles.cardBackDesign}>
            <View
              style={[
                styles.patternBox,
                { borderColor: theme.colors.cardBackPattern },
              ]}
            >
              <Text style={styles.cardBackIcon}>🎭</Text>
              <Text
                style={[
                  styles.cardBackTitle,
                  { color: theme.colors.primary },
                ]}
              >
                IMPOSTER
              </Text>
              <Text
                style={[
                  styles.cardBackSub,
                  { color: theme.colors.textMuted },
                ]}
              >
                SECRET CARD
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* CARD FRONT (REVEALED STATE) */}
        <Animated.View
          style={[
            styles.card,
            styles.cardFront,
            {
              backgroundColor: theme.colors.surfaceCard,
              borderColor: theme.colors.borderStrong,
              opacity: backOpacity,
              transform: [{ rotateY: backInterpolate }],
            },
          ]}
        >
          {isBlankImposter ? (
            <View style={styles.revealedContent}>
              <Text style={styles.roleBadgeBlank}>BLANK IMPOSTER</Text>
              <Text
                style={[
                  styles.blankWord,
                  {
                    color: theme.colors.danger,
                    fontSize: 40,
                  },
                ]}
              >
                — ??? —
              </Text>
              <Text
                style={[
                  styles.roleExplain,
                  { color: theme.colors.textSecondary },
                ]}
              >
                You have NO word! Listen closely to clues and bluff your way through.
              </Text>
            </View>
          ) : (
            <View style={styles.revealedContent}>
              <Text
                style={[
                  styles.roleBadge,
                  {
                    color: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  },
                ]}
              >
                YOUR SECRET WORD
              </Text>
              <Text
                style={[
                  styles.revealedWord,
                  {
                    color: theme.colors.text,
                    fontSize: revealedWordFontSize,
                  },
                ]}
                adjustsFontSizeToFit
                numberOfLines={2}
              >
                {word ? word.toUpperCase() : '...'}
              </Text>
              <Text
                style={[
                  styles.roleExplain,
                  { color: theme.colors.textMuted },
                ]}
              >
                Memorize it! Give subtle spoken clues that only civilians will recognize.
              </Text>
            </View>
          )}

          {isOneWord && (
            <View
              style={[
                styles.oneWordCardTag,
                { backgroundColor: theme.colors.accent },
              ]}
            >
              <Text style={styles.oneWordCardTagText}>⚡ 1 WORD ONLY</Text>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* Interaction Hint */}
      <View
        style={[
          styles.hintPill,
          {
            backgroundColor: theme.colors.surfaceSubtle,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.hintText,
            {
              color: isRevealed ? theme.colors.accent : theme.colors.text,
              fontSize: theme.typography.size.sm,
            },
          ]}
        >
          {hint}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  touchArea: {
    width: 290,
    height: 420,
    minHeight: 56,
    touchAction: 'manipulation' as any,
    userSelect: 'none' as any,
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    position: 'absolute',
    backfaceVisibility: 'hidden',
    touchAction: 'manipulation' as any,
    userSelect: 'none' as any,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  cardFront: {
    // Front styling
  },
  cardBackDesign: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  patternBox: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cardBackIcon: {
    fontSize: 54,
  },
  cardBackTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 3,
  },
  cardBackSub: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
  },
  revealedContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 16,
  },
  roleBadge: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  roleBadgeBlank: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#7F1D1D',
    color: '#FECACA',
  },
  revealedWord: {
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1,
    marginVertical: 10,
    width: '100%',
    paddingHorizontal: 4,
  },
  blankWord: {
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 2,
    marginVertical: 12,
  },
  roleExplain: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  oneWordCardTag: {
    position: 'absolute',
    bottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  oneWordCardTagText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  hintPill: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  hintText: {
    fontWeight: '700',
    textAlign: 'center',
  },
} as any);
