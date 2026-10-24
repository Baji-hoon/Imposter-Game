import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../src/theme/ThemeContext';
import { useGameStore } from '../src/store/gameStore.web';
import { useProfileStore, AVATAR_OPTIONS, generateFunnyName } from '../src/store/profileStore';
import { ReconnectingPill } from '../src/components/ReconnectingPill';
import { S6_CardScreen } from '../src/screens/S6_CardScreen';
import { S7_VoteScreen } from '../src/screens/S7_VoteScreen';
import { S8_RevealScreen } from '../src/screens/S8_RevealScreen';
import { S9_ScoresScreen } from '../src/screens/S9_ScoresScreen';
import { S10_GameOverScreen } from '../src/screens/S10_GameOverScreen';
import { KickedScreen } from '../src/screens/KickedScreen';
import { useAppStateCleanup } from '../src/hooks/useAppStateCleanup.web';
import { useNoSleep } from '../src/hooks/useNoSleep.web';
import { parseRoomCodeFromUrl } from '@imposter/shared';

export default function WebGameRoot() {
  const router = useRouter();
  const { theme, mode, toggleTheme } = useTheme();
  const { name, avatar, setName, setAvatar } = useProfileStore();

  const stateSync = useGameStore((s) => s.stateSync);
  const status = useGameStore((s) => s.status);
  const isKicked = useGameStore((s) => s.isKicked);
  const lastError = useGameStore((s) => s.lastError);
  const clearError = useGameStore((s) => s.clearError);
  const protocolMismatch = useGameStore((s) => s.protocolMismatch);
  const joinGame = useGameStore((s) => s.joinGame);
  const leaveGame = useGameStore((s) => s.leaveGame);
  const nextRound = useGameStore((s) => s.nextRound);

  // Keep screen awake using NoSleep video technique for iOS Safari over HTTP
  useNoSleep();

  // Handle visibilitychange auto-resume & card hiding
  useAppStateCleanup();

  // 1. Read room code from URL query parameter (?room=CODE or ?c=CODE)
  const routerParams = useLocalSearchParams<{ room?: string; c?: string }>();
  const storeRoomCode = useGameStore((s) => s.roomCode);
  const [roomInput, setRoomInput] = useState<string>('');

  useEffect(() => {
    let parsedCode = parseRoomCodeFromUrl(window.location.search);
    if (!parsedCode && (routerParams.room || routerParams.c)) {
      parsedCode = parseRoomCodeFromUrl(`?room=${routerParams.room || routerParams.c}`);
    }
    if (parsedCode) {
      setRoomInput(parsedCode);
    }
  }, [routerParams.room, routerParams.c]);

  // Keep room input synchronized if the store switches rooms automatically
  useEffect(() => {
    if (storeRoomCode && storeRoomCode.length === 4) {
      setRoomInput(storeRoomCode);
    }
  }, [storeRoomCode]);

  // Handle auto-name generation on initial load if default 'Player'
  useEffect(() => {
    if (!name || name === 'Player') {
      setName(generateFunnyName());
    }
  }, []);

  const handleRerollName = () => {
    setName(generateFunnyName());
  };

  const handleJoinPress = async () => {
    const code = roomInput.trim().toUpperCase();
    if (!code || code.length !== 4) return;

    const hostname = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
    const port = typeof window !== 'undefined' && window.location.port ? parseInt(window.location.port, 10) : 47777;

    const trimmedName = (name || '').trim();
    const effectiveName = trimmedName || generateFunnyName();
    if (!trimmedName) {
      setName(effectiveName);
    }

    await joinGame(
      { host: hostname, port },
      code,
      effectiveName,
      avatar || '📱'
    );
  };

  // Protocol version mismatch warning banner
  if (protocolMismatch || lastError?.code === 'PROTOCOL_MISMATCH') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={styles.errorCenterBox}>
          <Text style={styles.errorBigIcon}>⚠️</Text>
          <Text style={[styles.errorTitle, { color: theme.colors.danger }]}>
            Ask the host to update the app
          </Text>
          <Text style={[styles.errorSubtitle, { color: theme.colors.textSecondary }]}>
            The Android host is running an incompatible protocol version. Please ask the host to update their Imposter app.
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => window.location.reload()}
          >
            <Text style={[styles.retryButtonText, { color: theme.colors.primary }]}>↻ Reload Page</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // If player was kicked by host
  if (isKicked) {
    return <KickedScreen onDismiss={leaveGame} />;
  }

  // PRE-GAME VIEW: Streamlined iPhone Web Join Flow
  // Hide Host and Scan-QR buttons on web (browsers can only join).
  // Shows room code, profile picker (emoji + auto name, no typing required), and Join.
  if (!stateSync) {
    const isConnecting = status === 'connecting';
    const canJoin = roomInput.trim().length === 4 && !isConnecting;

    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.joinContainer}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with Theme Toggle */}
          <View style={styles.topRow}>
            <View style={styles.brandRow}>
              <Text style={styles.brandLogo}>🎭</Text>
              <Text style={[styles.brandTitle, { color: theme.colors.text }]}>IMPOSTER</Text>
              <View style={styles.webBadge}>
                <Text style={styles.webBadgeText}>SAFARI</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                style={[styles.galleryBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => router.push('/gallery')}
                activeOpacity={0.7}
              >
                <Text style={[styles.galleryBtnText, { color: theme.colors.primary }]}>🎨 Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.themeBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={toggleTheme}
              >
                <Text style={styles.themeBtnText}>{mode === 'sun' ? '🌙' : '☀️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Error Banner if any */}
          {lastError && (
            <TouchableOpacity
              style={[styles.errorBanner, { backgroundColor: theme.colors.danger + '22', borderColor: theme.colors.danger }]}
              onPress={clearError}
            >
              <Text style={[styles.errorBannerText, { color: theme.colors.danger }]}>
                ⚠️ {lastError.message || lastError.code}
              </Text>
            </TouchableOpacity>
          )}

          {/* Room Code Card */}
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardLabel, { color: theme.colors.textMuted }]}>ROOM CODE</Text>
            <TextInput
              style={[styles.roomInput, { color: theme.colors.primary, borderColor: theme.colors.border }]}
              value={roomInput}
              onChangeText={(t) => setRoomInput(t.toUpperCase().slice(0, 4))}
              placeholder="ABCD"
              placeholderTextColor={theme.colors.textMuted}
              maxLength={4}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Text style={[styles.cardHint, { color: theme.colors.textSecondary }]}>
              {roomInput.length === 4 ? '✓ Room code detected from invite link' : 'Enter 4-letter room code from the host screen'}
            </Text>
          </View>

          {/* Profile Picker (Emoji + Custom Name Input + Reroll Button) */}
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardLabel, { color: theme.colors.textMuted }]}>YOUR PROFILE</Text>

            {/* Current Selected Avatar & Name Input with Reroll Button */}
            <View style={styles.profileHeaderRow}>
              <View style={styles.avatarBigBubble}>
                <Text style={styles.avatarBigText}>{avatar || '📱'}</Text>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.nameInputRow}>
                  <TextInput
                    style={[
                      styles.nameInput,
                      {
                        color: theme.colors.text,
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.surfaceSubtle,
                      },
                    ]}
                    value={name}
                    onChangeText={(val) => setName(val.slice(0, 16))}
                    placeholder="Enter your name"
                    placeholderTextColor={theme.colors.textMuted}
                    maxLength={16}
                    autoCorrect={false}
                    autoCapitalize="words"
                  />
                  <TouchableOpacity
                    style={[
                      styles.rerollBtn,
                      {
                        backgroundColor: theme.colors.surfaceSubtle,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={handleRerollName}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.rerollBtnIcon}>🎲</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.nameHintText, { color: theme.colors.textMuted }]}>
                  Type your name or tap 🎲 for random
                </Text>
              </View>
            </View>

            {/* Emoji Avatar Selector Grid */}
            <Text style={[styles.avatarSectionLabel, { color: theme.colors.textMuted }]}>
              Choose Your Secret Agent:
            </Text>
            <View style={styles.avatarGrid}>
              {AVATAR_OPTIONS.map((em) => {
                const isSelected = avatar === em;
                return (
                  <TouchableOpacity
                    key={em}
                    style={[
                      styles.avatarGridItem,
                      isSelected && {
                        backgroundColor: theme.colors.primary + '33',
                        borderColor: theme.colors.primary,
                        transform: [{ scale: 1.15 }],
                      },
                    ]}
                    onPress={() => setAvatar(em)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.avatarGridText}>{em}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Primary Join Button */}
          <TouchableOpacity
            style={[
              styles.joinButton,
              {
                backgroundColor: canJoin ? theme.colors.primary : theme.colors.surfaceSubtle,
                opacity: canJoin ? 1 : 0.6,
              },
            ]}
            onPress={handleJoinPress}
            disabled={!canJoin}
            activeOpacity={0.85}
          >
            {isConnecting ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={[styles.joinButtonText, { color: '#FFFFFF' }]}>Connecting to Host...</Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.joinButtonText,
                  { color: canJoin ? theme.colors.primaryText : theme.colors.textMuted },
                ]}
              >
                🚀 Join Room {roomInput || '----'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Neo-Brutalist Design Gallery */}
          <TouchableOpacity
            style={[
              styles.galleryLinkBtn,
              {
                backgroundColor: '#FF5A00',
                borderColor: '#111111',
                borderWidth: 2,
                marginTop: 10,
              },
            ]}
            onPress={() => router.push('/design-gallery')}
            activeOpacity={0.7}
          >
            <Text style={[styles.galleryLinkText, { color: '#111111', fontWeight: '800' }]}>
              📐 Neo-Brutalist Design Gallery (/design-gallery)
            </Text>
          </TouchableOpacity>

          {/* UI Gallery Preview Button */}
          <TouchableOpacity
            style={[
              styles.galleryLinkBtn,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                marginTop: 8,
              },
            ]}
            onPress={() => router.push('/gallery')}
            activeOpacity={0.7}
          >
            <Text style={[styles.galleryLinkText, { color: theme.colors.primary }]}>
              🎨 Preview All Game Screens & UI States
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // IN-GAME PHASES (Synchronized via authoritative stateSync)
  const renderGamePhase = () => {
    switch (stateSync.phase) {
      case 'LOBBY': {
        const players = stateSync.players || [];
        return (
          <View style={styles.inGameContainer}>
            {/* Lobby Header */}
            <View style={[styles.lobbyHeader, { borderBottomColor: theme.colors.border }]}>
              <View>
                <Text style={[styles.cardLabel, { color: theme.colors.textMuted }]}>ROOM</Text>
                <Text style={[styles.lobbyRoomCode, { color: theme.colors.primary }]}>{stateSync.room}</Text>
              </View>
              <TouchableOpacity
                style={[styles.leaveBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.danger }]}
                onPress={() => {
                  if (confirm('Leave this game?')) leaveGame();
                }}
              >
                <Text style={{ color: theme.colors.danger, fontWeight: '700', fontSize: 13 }}>✕ Leave</Text>
              </TouchableOpacity>
            </View>

            {/* Players in Lobby */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }}>
              <Text style={[styles.cardLabel, { color: theme.colors.textMuted }]}>
                PLAYERS IN LOBBY ({players.length}/10)
              </Text>
              {players.map((p) => {
                const isHostPlayer = p.id === stateSync.hostId;
                const isMe = p.id === useGameStore.getState().playerId;

                return (
                  <View
                    key={p.id}
                    style={[
                      styles.playerRow,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: isMe ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.playerRowLeft}>
                      <Text style={{ fontSize: 28 }}>{p.avatar || '👤'}</Text>
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.playerName, { color: theme.colors.text }]}>{p.name}</Text>
                          {isHostPlayer && <Text style={{ fontSize: 12, color: '#F59E0B', fontWeight: '800' }}>👑 HOST</Text>}
                          {isMe && <Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: '700' }}>(You)</Text>}
                        </View>
                        <Text style={{ fontSize: 11, color: p.present ? theme.colors.success : theme.colors.accent, fontWeight: '600' }}>
                          {p.present ? '● Present' : '○ Away / Reconnecting'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Non-host waiting status bar */}
            <View style={[styles.waitingBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
              <ActivityIndicator color={theme.colors.primary} size="small" />
              <Text style={[styles.waitingBarText, { color: theme.colors.text }]}>
                Waiting for the host to start the game…
              </Text>
            </View>
          </View>
        );
      }

      case 'DEALING':
      case 'TALKING':
        return <S6_CardScreen />;

      case 'VOTING':
        return <S7_VoteScreen />;

      case 'REVEAL':
        return <S8_RevealScreen onContinue={nextRound} />;

      case 'SCORES':
        return <S9_ScoresScreen />;

      case 'GAME_OVER':
        return <S10_GameOverScreen onLeave={() => leaveGame()} onOpenSettings={() => {}} />;

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {renderGamePhase()}
      {/* Non-blocking Reconnecting Pill */}
      <ReconnectingPill />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    minHeight: '100dvh' as any,
  },
  joinContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' as any,
    gap: 16,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    fontSize: 26,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  webBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  webBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  themeBtn: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeBtnText: {
    fontSize: 16,
  },
  galleryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  galleryBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  galleryLinkBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  galleryLinkText: {
    fontSize: 14,
    fontWeight: '800',
  },
  card: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardHint: {
    fontSize: 12,
    fontWeight: '600',
  },
  roomInput: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 8,
    textAlign: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarBigBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  avatarBigText: {
    fontSize: 34,
  },
  nameInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  rerollBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rerollBtnIcon: {
    fontSize: 20,
  },
  nameHintText: {
    fontSize: 11,
    fontWeight: '600',
  },
  avatarSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  avatarGridItem: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  avatarGridText: {
    fontSize: 22,
  },
  joinButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  errorCenterBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  errorBigIcon: {
    fontSize: 56,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  inGameContainer: {
    flex: 1,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  lobbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  lobbyRoomCode: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 4,
  },
  leaveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  playerRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '800',
  },
  waitingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 18,
    borderTopWidth: 1,
  },
  waitingBarText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
