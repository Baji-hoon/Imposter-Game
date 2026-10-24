import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { tokens } from '@imposter/shared';
import { useProfileStore } from '../store/profileStore';
import { useGameStore } from '../store/gameStore';
import {
  BrutalButton,
  BrutalCard,
  BrutalBox,
  AccentSquare,
  CheckerStrip,
  Stripe,
  Mascot,
} from '../ui';

interface S1HomeScreenProps {
  onHostPress: () => void;
  onJoinPress: () => void;
  onEditProfilePress: () => void;
}

export const S1_HomeScreen: React.FC<S1HomeScreenProps> = ({
  onHostPress,
  onJoinPress,
  onEditProfilePress,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { name, avatar } = useProfileStore();
  const isStartingHost = useGameStore((s) => s.isStartingHost);
  const lastError = useGameStore((s) => s.lastError);
  const clearError = useGameStore((s) => s.clearError);

  const topInset = Math.max(insets.top, 16);
  const bottomInset = Math.max(insets.bottom, 20) + 16;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContainer,
        { paddingTop: topInset, paddingBottom: bottomInset },
      ]}
      bounces={false}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Bar: Profile Mini Chip (Left) & AccentSquare (Right) */}
      <View style={styles.topBar}>
        <BrutalBox
          hasShadow={true}
          pressable={true}
          onPress={onEditProfilePress}
          contentStyle={styles.profileChip}
          accessibilityLabel="Open player profile"
        >
          <Text style={styles.profileAvatarIcon}>{avatar || '🦊'}</Text>
          <Text style={styles.profileNameText} numberOfLines={1}>
            {(name || 'PLAYER').toUpperCase()}
          </Text>
        </BrutalBox>

        <AccentSquare size={26} />
      </View>

      {/* Hero Brand Section: Wordmark, "Judge quick", CheckerStrip */}
      <View style={styles.heroSection}>
        <Text style={styles.wordmark}>IMPOSTER</Text>
        <Text style={styles.tagline}>Judge quick</Text>
        <View style={styles.checkerWrapper}>
          <CheckerStrip height={14} squareSize={7} />
        </View>
      </View>

      {/* Mascot Placeholder Section (Center Hero) */}
      <View style={styles.mascotSection}>
        <Mascot size={160} />
      </View>

      {/* Error Notice (if lastError is present) */}
      {lastError && (
        <Pressable onPress={clearError} style={styles.errorWrapper}>
          <BrutalCard
            title="ERROR"
            subtitle={lastError.code}
            color="red"
          >
            <Text style={styles.errorText}>
              {lastError.message || 'An error occurred'}
            </Text>
            <Text style={styles.errorDismiss}>TAP TO DISMISS</Text>
          </BrutalCard>
        </Pressable>
      )}

      {/* Main Play Actions: Tile Buttons */}
      <View style={styles.actionSection}>
        <BrutalButton
          title="HOST ROOM"
          variant="tile"
          tileColor="orange"
          icon="rocket"
          onPress={onHostPress}
          disabled={isStartingHost}
          disabledText="STARTING LOBBY..."
        />

        <BrutalButton
          title="JOIN ROOM"
          variant="tile"
          tileColor="yellow"
          icon="hiking"
          onPress={onJoinPress}
        />
      </View>

      {/* Bottom Footer: Hazard stripe, app version, subtle dev gallery links */}
      <View style={styles.footerSection}>
        <Stripe height={18} />

        <View style={styles.footerRow}>
          <Text style={styles.versionText}>IMPOSTER v1.0.0</Text>

          <View style={styles.devLinksRow}>
            <Pressable onPress={() => router.push('/design-gallery')}>
              <Text style={styles.devLinkText}>[PRIMITIVES]</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/gallery')}>
              <Text style={styles.devLinkText}>[GALLERY]</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: tokens.shape.space.screen,
    paddingTop: 36,
    paddingBottom: 20,
    justifyContent: 'space-between',
    backgroundColor: tokens.colors.cream,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    backgroundColor: tokens.colors.paper,
  },
  profileAvatarIcon: {
    fontSize: 20,
  },
  profileNameText: {
    fontFamily: tokens.typography.fonts.bodyBlack,
    fontSize: tokens.typography.styles.label.fontSize,
    letterSpacing: 0.5,
    color: tokens.colors.ink,
  },
  heroSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  wordmark: {
    fontFamily: tokens.typography.fonts.display,
    fontSize: tokens.typography.styles.wordmark.fontSize,
    lineHeight: tokens.typography.styles.wordmark.lineHeight,
    letterSpacing: tokens.typography.styles.wordmark.letterSpacing,
    color: tokens.colors.ink,
  },
  tagline: {
    fontFamily: tokens.typography.fonts.display,
    fontSize: tokens.typography.styles.h2.fontSize,
    lineHeight: tokens.typography.styles.h2.lineHeight,
    color: tokens.colors.ink,
    marginTop: 2,
  },
  checkerWrapper: {
    marginTop: 10,
    width: '100%',
  },
  mascotSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  errorWrapper: {
    marginBottom: 16,
  },
  errorText: {
    fontFamily: tokens.typography.fonts.bodyBlack,
    fontSize: 14,
    color: tokens.colors.paper,
    marginBottom: 4,
  },
  errorDismiss: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    color: tokens.colors.cream,
  },
  actionSection: {
    gap: 16,
    marginVertical: 12,
  },
  footerSection: {
    marginTop: 20,
    gap: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  versionText: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: tokens.typography.styles.label.fontSize,
    letterSpacing: tokens.typography.styles.label.letterSpacing,
    color: tokens.colors.ink,
  },
  devLinksRow: {
    flexDirection: 'row',
    gap: 12,
  },
  devLinkText: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: tokens.colors.ink,
  },
});
