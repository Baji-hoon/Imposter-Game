import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useGameStore } from '../store/gameStore';
import { RoundMeter } from '../components/RoundMeter';
import { CardFlip } from '../components/CardFlip';

export const S6_CardScreen: React.FC = () => {
  const { theme } = useTheme();
  const stateSync = useGameStore((s) => s.stateSync);
  const playerId = useGameStore((s) => s.playerId);
  const rtt = useGameStore((s) => s.rtt);
  const openVote = useGameStore((s) => s.openVote);

  const [showScoresModal, setShowScoresModal] = useState<boolean>(false);

  if (!stateSync) return null;

  const isHost = stateSync.hostId === playerId;
  const isOneWord = stateSync.modifiers?.oneWord || false;
  const myWord = stateSync.me?.word ?? null;
  const hasWord = stateSync.me?.hasWord ?? false;

  const handleOpenVotePress = () => {
    Alert.alert(
      'Open Voting?',
      'Has everyone in the circle shared their clue?',
      [
        { text: 'Keep Talking', style: 'cancel' },
        { text: 'Yes, Open Vote', style: 'default', onPress: () => openVote() },
      ]
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      {/* Round Meter with Signal Dot */}
      <RoundMeter
        currentRound={stateSync.round}
        totalRounds={stateSync.totalRounds}
        rtt={rtt}
      />

      {/* One-Word Round Banner Strip */}
      {isOneWord && (
        <View
          style={[
            styles.oneWordBanner,
            { backgroundColor: theme.colors.accent },
          ]}
        >
          <Text style={styles.oneWordBannerText}>
            ⚡ ONE-WORD ROUND: Speak ONLY a single word clue!
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollArea}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Core Playing Card */}
        <CardFlip
          word={myWord}
          hasWord={hasWord}
          roundId={`r-${stateSync.round}`}
          isOneWord={isOneWord}
        />

        {/* Spoken Discussion Prompt */}
        <View
          style={[
            styles.discussionCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={styles.discussionIcon}>🗣️</Text>
          <Text
            style={[
              styles.discussionTitle,
              { color: theme.colors.text },
            ]}
          >
            Spoken Clues in the Circle
          </Text>
          <Text
            style={[
              styles.discussionBody,
              { color: theme.colors.textSecondary },
            ]}
          >
            Take turns saying one subtle clue out loud. No timers. Look each other in the eye!
          </Text>
        </View>

        {/* View Scores button */}
        <TouchableOpacity
          style={[
            styles.scoresLinkButton,
            {
              backgroundColor: theme.colors.surfaceSubtle,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() => setShowScoresModal(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.scoresLinkText, { color: theme.colors.text }]}>
            📊 View Leaderboard
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        {isHost ? (
          <TouchableOpacity
            style={[
              styles.openVoteButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={handleOpenVotePress}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.openVoteButtonText,
                { color: theme.colors.primaryText },
              ]}
            >
              🗳️ Open Vote
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.nonHostStatus}>
            <Text style={[styles.nonHostText, { color: theme.colors.textMuted }]}>
              Host will open voting when discussion is done…
            </Text>
          </View>
        )}
      </View>

      {/* Leaderboard Modal */}
      <Modal visible={showScoresModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: theme.colors.text },
                ]}
              >
                Current Standings
              </Text>
              <TouchableOpacity
                onPress={() => setShowScoresModal(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={[styles.modalCloseText, { color: theme.colors.textMuted }]}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.leaderboardScroll}>
              {stateSync.players
                .map((p) => ({
                  ...p,
                  score: stateSync.scores[p.id] || 0,
                }))
                .sort((a, b) => b.score - a.score)
                .map((p, rank) => (
                  <View
                    key={p.id}
                    style={[
                      styles.scoreRow,
                      {
                        backgroundColor: theme.colors.surfaceSubtle,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.scoreRowLeft}>
                      <Text style={styles.rankBadge}>#{rank + 1}</Text>
                      <Text style={styles.scoreAvatar}>{p.avatar}</Text>
                      <Text
                        style={[
                          styles.scoreName,
                          { color: theme.colors.text },
                        ]}
                      >
                        {p.name}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.scorePoints,
                        { color: theme.colors.primary },
                      ]}
                    >
                      {p.score} pts
                    </Text>
                  </View>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 48,
  },
  oneWordBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  oneWordBannerText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  scrollArea: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 90,
  },
  discussionCard: {
    width: '100%',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  discussionIcon: {
    fontSize: 32,
  },
  discussionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  discussionBody: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  scoresLinkButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoresLinkText: {
    fontWeight: '700',
    fontSize: 15,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  openVoteButton: {
    minHeight: 56, // >= 56 pt tap target
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  openVoteButtonText: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  nonHostStatus: {
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nonHostText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  modalCloseBtn: {
    padding: 8,
    minHeight: 44,
  },
  modalCloseText: {
    fontSize: 20,
    fontWeight: '700',
  },
  leaderboardScroll: {
    maxHeight: 400,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  scoreRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankBadge: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94A3B8',
    width: 28,
  },
  scoreAvatar: {
    fontSize: 28,
  },
  scoreName: {
    fontSize: 16,
    fontWeight: '700',
  },
  scorePoints: {
    fontSize: 18,
    fontWeight: '900',
  },
});
