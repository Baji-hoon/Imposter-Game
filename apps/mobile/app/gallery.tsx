import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme/ThemeContext';
import { useGameStore } from '../src/store/gameStore';

// Screen Components
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

export type ScreenId =
  | 's1_home'
  | 's2_profile'
  | 's3_lobby'
  | 's4_join'
  | 's5_settings'
  | 's6_civilian'
  | 's6_imposter'
  | 's6_blank'
  | 's6_oneword'
  | 's7_vote'
  | 's8_reveal_busted'
  | 's8_reveal_escaped'
  | 's9_scores'
  | 's10_gameover'
  | 'kicked';

interface ScreenOption {
  id: ScreenId;
  label: string;
  badge?: string;
}

const SCREENS: ScreenOption[] = [
  { id: 's1_home', label: '🏠 S1: Home' },
  { id: 's2_profile', label: '👤 S2: Profile Modal' },
  { id: 's3_lobby', label: '👑 S3: Host Lobby' },
  { id: 's4_join', label: '🎟️ S4: Join Screen' },
  { id: 's5_settings', label: '⚙️ S5: Settings Modal' },
  { id: 's6_civilian', label: '🃏 S6: Card (Civilian)' },
  { id: 's6_imposter', label: '🎭 S6: Card (Imposter)' },
  { id: 's6_blank', label: '❓ S6: Card (Blank)' },
  { id: 's6_oneword', label: '⚡ S6: Card (1-Word Mod)' },
  { id: 's7_vote', label: '🗳️ S7: Vote Screen' },
  { id: 's8_reveal_busted', label: '💥 S8: Reveal (Busted)' },
  { id: 's8_reveal_escaped', label: '🏆 S8: Reveal (Escaped)' },
  { id: 's9_scores', label: '📊 S9: Scores Leaderboard' },
  { id: 's10_gameover', label: '🎉 S10: Game Over Podium' },
  { id: 'kicked', label: '🚫 Kicked Screen' },
];

const MOCK_PLAYERS = [
  { id: 'p1', name: 'Alex (You)', avatar: '👑', present: true },
  { id: 'p2', name: 'Clever Fox', avatar: '🦊', present: true },
  { id: 'p3', name: 'Sneaky Panda', avatar: '🐼', present: true },
  { id: 'p4', name: 'Cool Koala', avatar: '🐨', present: false },
];

export default function ScreenGallery() {
  const router = useRouter();
  const { theme, mode, toggleTheme } = useTheme();
  const [selectedScreen, setSelectedScreen] = useState<ScreenId>('s1_home');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Apply high-fidelity mock data whenever screen selection changes
  useEffect(() => {
    switch (selectedScreen) {
      case 's1_home':
        useGameStore.setState({ stateSync: null, isKicked: false });
        setShowProfileModal(false);
        setShowSettingsModal(false);
        break;

      case 's2_profile':
        useGameStore.setState({ stateSync: null, isKicked: false });
        setShowProfileModal(true);
        setShowSettingsModal(false);
        break;

      case 's3_lobby':
        useGameStore.setState({
          playerId: 'p1',
          roomCode: 'WXYZ',
          hostIp: '192.168.0.109',
          rtt: 16,
          isKicked: false,
          stateSync: {
            v: 1,
            phase: 'LOBBY',
            room: 'WXYZ',
            hostId: 'p1',
            round: 1,
            totalRounds: 3,
            scores: { p1: 0, p2: 0, p3: 0, p4: 0 },
            players: MOCK_PLAYERS,
            settings: {
              rounds: 3,
              imposterCount: 1,
              blankImposter: 'sometimes',
              oneWordRound: 'sometimes',
              packs: ['everyday', 'animals', 'food'],
              difficulty: 'medium',
            },
          } as any,
        });
        setShowProfileModal(false);
        setShowSettingsModal(false);
        break;

      case 's4_join':
        useGameStore.setState({ stateSync: null, isKicked: false });
        setShowProfileModal(false);
        setShowSettingsModal(false);
        break;

      case 's5_settings':
        useGameStore.setState({
          playerId: 'p1',
          stateSync: {
            v: 1,
            phase: 'LOBBY',
            room: 'WXYZ',
            hostId: 'p1',
            round: 1,
            totalRounds: 3,
            scores: {},
            players: MOCK_PLAYERS,
          } as any,
        });
        setShowSettingsModal(true);
        setShowProfileModal(false);
        break;

      case 's6_civilian':
        useGameStore.setState({
          playerId: 'p1',
          rtt: 18,
          isKicked: false,
          stateSync: {
            v: 1,
            phase: 'TALKING',
            room: 'WXYZ',
            hostId: 'p1',
            round: 1,
            totalRounds: 3,
            scores: { p1: 0, p2: 0, p3: 0, p4: 0 },
            players: MOCK_PLAYERS,
            me: { role: 'civilian', hasWord: true, word: 'MOUNTAIN' },
          } as any,
        });
        setShowProfileModal(false);
        setShowSettingsModal(false);
        break;

      case 's6_imposter':
        useGameStore.setState({
          playerId: 'p1',
          rtt: 22,
          isKicked: false,
          stateSync: {
            v: 1,
            phase: 'TALKING',
            room: 'WXYZ',
            hostId: 'p1',
            round: 1,
            totalRounds: 3,
            scores: { p1: 0, p2: 0, p3: 0, p4: 0 },
            players: MOCK_PLAYERS,
            me: { role: 'imposter', hasWord: true, word: 'VOLCANO' },
          } as any,
        });
        setShowProfileModal(false);
        setShowSettingsModal(false);
        break;

      case 's6_blank':
        useGameStore.setState({
          playerId: 'p1',
          rtt: 15,
          isKicked: false,
          stateSync: {
            v: 1,
            phase: 'TALKING',
            room: 'WXYZ',
            hostId: 'p1',
            round: 1,
            totalRounds: 3,
            scores: { p1: 0, p2: 0, p3: 0, p4: 0 },
            players: MOCK_PLAYERS,
            me: { role: 'imposter', hasWord: true, word: null },
          } as any,
        });
        setShowProfileModal(false);
        setShowSettingsModal(false);
        break;

      case 's6_oneword':
        useGameStore.setState({
          playerId: 'p1',
          rtt: 24,
          isKicked: false,
          stateSync: {
            v: 1,
            phase: 'TALKING',
            room: 'WXYZ',
            hostId: 'p1',
            round: 2,
            totalRounds: 3,
            modifiers: { oneWord: true },
            scores: { p1: 0, p2: 0, p3: 0, p4: 0 },
            players: MOCK_PLAYERS,
            me: { role: 'civilian', hasWord: true, word: 'ROLLER COASTER' },
          } as any,
        });
        setShowProfileModal(false);
        setShowSettingsModal(false);
        break;

      case 's7_vote':
        useGameStore.setState({
          playerId: 'p1',
          rtt: 18,
          isKicked: false,
          myLastVoteTargetId: 'p2',
          voteProgress: { v: 1, t: 'vote_progress', submitted: 3, total: 4 },
          stateSync: {
            v: 1,
            phase: 'VOTING',
            room: 'WXYZ',
            hostId: 'p1',
            round: 1,
            totalRounds: 3,
            scores: { p1: 0, p2: 0, p3: 0, p4: 0 },
            players: MOCK_PLAYERS.map((p) => ({ ...p, present: true })),
          } as any,
        });
        setShowProfileModal(false);
        setShowSettingsModal(false);
        break;

      case 's8_reveal_busted':
        useGameStore.setState({
          playerId: 'p1',
          isKicked: false,
          stateSync: {
            v: 1,
            phase: 'REVEAL',
            room: 'WXYZ',
            hostId: 'p1',
            round: 1,
            totalRounds: 3,
            scores: { p1: 100, p2: 0, p3: 100, p4: 100 },
            players: MOCK_PLAYERS,
            me: { role: 'civilian', hasWord: true, word: 'MOUNTAIN' },
          } as any,
          lastVoteResult: {
            v: 1,
            t: 'vote_result',
            round: 1,
            removedId: 'p2',
            removedRole: 'imposter',
            civilianWon: true,
            tie: false,
            words: { civilian: 'MOUNTAIN', imposter: 'VOLCANO' },
            scores: { p1: 100, p2: 0, p3: 100, p4: 100 },
            scoreDelta: { p1: 100, p2: 0, p3: 100, p4: 100 },
          } as any,
        });
        setShowProfileModal(false);
        setShowSettingsModal(false);
        break;

      case 's8_reveal_escaped':
        useGameStore.setState({
          playerId: 'p1',
          isKicked: false,
          stateSync: {
            v: 1,
            phase: 'REVEAL',
            room: 'WXYZ',
            hostId: 'p1',
            round: 2,
            totalRounds: 3,
            scores: { p1: 100, p2: 200, p3: 100, p4: 100 },
            players: MOCK_PLAYERS,
            me: { role: 'imposter', hasWord: true, word: 'VOLCANO' },
          } as any,
          lastVoteResult: {
            v: 1,
            t: 'vote_result',
            round: 2,
            removedId: 'p3',
            removedRole: 'civilian',
            civilianWon: false,
            tie: false,
            words: { civilian: 'MOUNTAIN', imposter: 'VOLCANO' },
            scores: { p1: 100, p2: 200, p3: 100, p4: 100 },
            scoreDelta: { p1: 0, p2: 200, p3: 0, p4: 0 },
          } as any,
        });
        setShowProfileModal(false);
        setShowSettingsModal(false);
        break;

      case 's9_scores':
        useGameStore.setState({
          playerId: 'p1',
          rtt: 12,
          isKicked: false,
          stateSync: {
            v: 1,
            phase: 'SCORES',
            room: 'WXYZ',
            hostId: 'p1',
            round: 2,
            totalRounds: 3,
            scores: { p2: 300, p1: 200, p3: 100, p4: 50 },
            players: MOCK_PLAYERS,
          } as any,
          lastVoteResult: {
            scoreDelta: { p2: 200, p1: 0, p3: 0, p4: 50 },
          } as any,
        });
        setShowProfileModal(false);
        setShowSettingsModal(false);
        break;

      case 's10_gameover':
        useGameStore.setState({
          playerId: 'p1',
          isKicked: false,
          stateSync: {
            v: 1,
            phase: 'GAME_OVER',
            room: 'WXYZ',
            hostId: 'p1',
            round: 3,
            totalRounds: 3,
            scores: { p2: 450, p1: 300, p3: 200, p4: 100 },
            players: MOCK_PLAYERS,
          } as any,
          lastGameOver: {
            v: 1,
            t: 'game_over',
            finalScores: { p2: 450, p1: 300, p3: 200, p4: 100 },
            awards: [
              { playerId: 'p2', award: 'MASTERMIND', title: 'Master of Deception' },
              { playerId: 'p1', award: 'SHERLOCK', title: 'Top Detective' },
            ],
          } as any,
        });
        setShowProfileModal(false);
        setShowSettingsModal(false);
        break;

      case 'kicked':
        useGameStore.setState({ isKicked: true });
        setShowProfileModal(false);
        setShowSettingsModal(false);
        break;
    }
  }, [selectedScreen]);

  // Clean up mock state on unmount
  useEffect(() => {
    return () => {
      useGameStore.setState({
        stateSync: null,
        isKicked: false,
        lastVoteResult: null,
        lastGameOver: null,
      });
    };
  }, []);

  const handleExit = () => {
    useGameStore.setState({
      stateSync: null,
      isKicked: false,
      lastVoteResult: null,
      lastGameOver: null,
    });
    router.replace('/');
  };

  const renderActiveScreen = () => {
    switch (selectedScreen) {
      case 's1_home':
        return (
          <S1_HomeScreen
            onHostPress={() => setSelectedScreen('s3_lobby')}
            onJoinPress={() => setSelectedScreen('s4_join')}
            onEditProfilePress={() => setShowProfileModal(true)}
          />
        );

      case 's2_profile':
        return (
          <View style={styles.modalBackdropPreview}>
            <Text style={[styles.previewNotice, { color: theme.colors.textMuted }]}>
              (S2 Profile Modal opened on screen)
            </Text>
            <S2_ProfileModal visible={showProfileModal} onClose={() => setShowProfileModal(false)} />
          </View>
        );

      case 's3_lobby':
        return (
          <S3_HostLobbyScreen
            onOpenSettings={() => setShowSettingsModal(true)}
            onLeave={() => setSelectedScreen('s1_home')}
          />
        );

      case 's4_join':
        return <S4_JoinScreen onBack={() => setSelectedScreen('s1_home')} />;

      case 's5_settings':
        return (
          <View style={styles.modalBackdropPreview}>
            <Text style={[styles.previewNotice, { color: theme.colors.textMuted }]}>
              (S5 Settings Modal opened on screen)
            </Text>
            <S5_SettingsModal visible={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
          </View>
        );

      case 's6_civilian':
      case 's6_imposter':
      case 's6_blank':
      case 's6_oneword':
        return <S6_CardScreen />;

      case 's7_vote':
        return <S7_VoteScreen />;

      case 's8_reveal_busted':
      case 's8_reveal_escaped':
        return <S8_RevealScreen onContinue={() => setSelectedScreen('s9_scores')} />;

      case 's9_scores':
        return <S9_ScoresScreen />;

      case 's10_gameover':
        return (
          <S10_GameOverScreen
            onOpenSettings={() => setShowSettingsModal(true)}
            onLeave={() => setSelectedScreen('s1_home')}
          />
        );

      case 'kicked':
        return <KickedScreen onDismiss={() => setSelectedScreen('s1_home')} />;

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Top Gallery Toolbar */}
      <View
        style={[
          styles.toolbar,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity style={styles.exitBtn} onPress={handleExit} activeOpacity={0.7}>
          <Text style={[styles.exitBtnText, { color: theme.colors.danger }]}>✕ Exit Gallery</Text>
        </TouchableOpacity>

        <View style={styles.toolbarCenter}>
          <Text style={[styles.toolbarTitle, { color: theme.colors.text }]}>🎨 UI STUDIO</Text>
          <Text style={[styles.toolbarSubtitle, { color: theme.colors.textMuted }]}>
            Previewing All Screens
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.themeBtn, { backgroundColor: '#FF5A00' }]}
          onPress={() => router.push('/design-gallery')}
          activeOpacity={0.7}
        >
          <Text style={[styles.themeBtnText, { color: '#111111', fontWeight: '800' }]}>📐 Primitives</Text>
        </TouchableOpacity>
      </View>

      {/* Screen Selector Pills Carousel */}
      <View
        style={[
          styles.pillContainer,
          {
            backgroundColor: theme.colors.surfaceSubtle,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillScroll}
        >
          {SCREENS.map((sc) => {
            const isSelected = selectedScreen === sc.id;
            return (
              <TouchableOpacity
                key={sc.id}
                style={[
                  styles.pill,
                  {
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setSelectedScreen(sc.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pillText,
                    {
                      color: isSelected ? '#FFFFFF' : theme.colors.text,
                      fontWeight: isSelected ? '800' : '600',
                    },
                  ]}
                >
                  {sc.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Screen Display Area */}
      <View style={styles.contentArea}>
        {renderActiveScreen()}

        {/* Global Modals for S2 / S5 */}
        <S2_ProfileModal visible={showProfileModal} onClose={() => setShowProfileModal(false)} />
        <S5_SettingsModal visible={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  exitBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exitBtnText: {
    fontWeight: '800',
    fontSize: 14,
  },
  toolbarCenter: {
    alignItems: 'center',
  },
  toolbarTitle: {
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1,
  },
  toolbarSubtitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  themeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  themeBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pillContainer: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  pillScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
  },
  contentArea: {
    flex: 1,
  },
  modalBackdropPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  previewNotice: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
