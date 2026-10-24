import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  BackHandler,
  TouchableOpacity,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme/ThemeContext';
import { useGameStore } from '../src/store/gameStore';
import { useProfileStore } from '../src/store/profileStore';

// Components & Screens
import { ReconnectingPill } from '../src/components/ReconnectingPill';
import { S1_HomeScreen } from '../src/screens/S1_HomeScreen';
import { S2_ProfileModal } from '../src/screens/S2_ProfileModal';
import { S3_HostLobbyScreen } from '../src/screens/S3_HostLobbyScreen';
import { S4_JoinScreen } from '../src/screens/S4_JoinScreen';
import { S5_SettingsModal } from '../src/screens/S5_SettingsModal';
import { S6_CardScreen } from '../src/screens/S6_CardScreen';
import { S7_VoteScreen } from '../src/screens/S7_VoteScreen';
import { S8_RevealScreen } from '../src/screens/S8_RevealScreen';
import { S9_ScoresScreen } from '../src/screens/S9_ScoresScreen';
import { S10_GameOverScreen } from '../src/screens/S10_GameOverScreen';
import { KickedScreen } from '../src/screens/KickedScreen';
import { useAppStateCleanup } from '../src/hooks/useAppStateCleanup';

import { useLocalSearchParams } from 'expo-router';

export default function GameRoot() {
  const { theme } = useTheme();
  const { name, avatar } = useProfileStore();

  const stateSync = useGameStore((s) => s.stateSync);
  const isKicked = useGameStore((s) => s.isKicked);
  const startHosting = useGameStore((s) => s.startHosting);
  const joinGame = useGameStore((s) => s.joinGame);
  const leaveGame = useGameStore((s) => s.leaveGame);
  const nextRound = useGameStore((s) => s.nextRound);

  // Handle app lifecycle: resync on foreground, cleanup on background/unmount
  useAppStateCleanup();

  const [activePreGameView, setActivePreGameView] = useState<'home' | 'join'>('home');
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Universal leave handler with explicit confirmation
  const handleConfirmLeave = () => {
    const isHost = stateSync?.hostId === useGameStore.getState().playerId;
    Alert.alert(
      isHost ? 'End Lobby & Leave?' : 'Leave Game?',
      isHost
        ? 'Are you sure you want to end this game? The room will be closed for everyone.'
        : 'Are you sure you want to leave this room and return to the main menu?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: isHost ? 'End Lobby' : 'Leave', style: 'destructive', onPress: leaveGame },
      ]
    );
  };

  // Android hardware back button handler
  useEffect(() => {
    const backAction = () => {
      if (stateSync) {
        handleConfirmLeave();
        return true;
      }
      if (activePreGameView === 'join') {
        setActivePreGameView('home');
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [stateSync, activePreGameView]);

  // Auto-connect if opened via deep-link: imposter://join?h=<ip>&p=<port>&c=<roomCode>
  const params = useLocalSearchParams<{ h?: string; p?: string; c?: string }>();
  useEffect(() => {
    if (params.h && params.c && !stateSync) {
      const port = params.p ? parseInt(params.p, 10) : 47777;
      joinGame({ host: params.h, port }, params.c.toUpperCase(), name, avatar);
    }
  }, [params.h, params.c]);

  // If player was kicked
  if (isKicked) {
    return <KickedScreen onDismiss={leaveGame} />;
  }

  // PRE-GAME (Not in any room)
  if (!stateSync) {
    return (
      <SafeAreaView
        edges={['left', 'right']}
        style={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        {activePreGameView === 'home' ? (
          <S1_HomeScreen
            onHostPress={() => startHosting(name, avatar)}
            onJoinPress={() => setActivePreGameView('join')}
            onEditProfilePress={() => setShowProfileModal(true)}
          />
        ) : (
          <S4_JoinScreen onBack={() => setActivePreGameView('home')} />
        )}

        <S2_ProfileModal
          visible={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />
      </SafeAreaView>
    );
  }

  // IN-GAME (Synchronized via stateSync.phase)
  const renderInGamePhase = () => {
    switch (stateSync.phase) {
      case 'LOBBY':
        return (
          <S3_HostLobbyScreen
            onOpenSettings={() => setShowSettingsModal(true)}
            onLeave={handleConfirmLeave}
          />
        );

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
        return (
          <S10_GameOverScreen
            onOpenSettings={() => setShowSettingsModal(true)}
            onLeave={handleConfirmLeave}
          />
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <ReconnectingPill />

      {/* Floating Exit Button for In-Game Phases (except LOBBY which has its own header button) */}
      {stateSync && stateSync.phase !== 'LOBBY' && (
        <TouchableOpacity
          style={[
            styles.floatingExitBtn,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={handleConfirmLeave}
          activeOpacity={0.75}
        >
          <Text style={[styles.floatingExitText, { color: theme.colors.danger }]}>
            ✕ Leave
          </Text>
        </TouchableOpacity>
      )}

      {renderInGamePhase()}

      <S5_SettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  floatingExitBtn: {
    position: 'absolute',
    top: 14,
    right: 18,
    zIndex: 9000,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  floatingExitText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
