import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useGameStore } from '../store/gameStore';
import { RoundMeter } from '../components/RoundMeter';

export const S7_VoteScreen: React.FC = () => {
  const { theme } = useTheme();
  const stateSync = useGameStore((s) => s.stateSync);
  const playerId = useGameStore((s) => s.playerId);
  const rtt = useGameStore((s) => s.rtt);
  const voteProgress = useGameStore((s) => s.voteProgress);
  const submitVote = useGameStore((s) => s.submitVote);

  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  if (!stateSync) return null;

  // Determine current vote index (0 or 1)
  const myVotes = stateSync.me?.voted || [];
  const currentVoteIndex = myVotes.findIndex((v) => !v);
  const hasVotedThisRound = myVotes.length > 0 && currentVoteIndex === -1;
  const isMultiVote = stateSync.settings.imposterCount === 2;

  // Eligible targets: all present players who are not ghosts
  const eligibleTargets = stateSync.players.filter((p) => p.present && !p.ghost);

  // Reset selection when round or vote index changes
  React.useEffect(() => {
    setSelectedTargetId(null);
  }, [stateSync.round, currentVoteIndex]);

  const handleConfirmVote = () => {
    if (!selectedTargetId) return;
    const vIndex = currentVoteIndex >= 0 ? currentVoteIndex : 0;
    submitVote(vIndex, selectedTargetId);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <RoundMeter
        currentRound={stateSync.round}
        totalRounds={stateSync.totalRounds}
        rtt={rtt}
      />

      <ScrollView
        contentContainerStyle={styles.scrollArea}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Vote Index */}
        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Who is the Imposter?
          </Text>
          {isMultiVote && (
            <View
              style={[
                styles.voteIndexBadge,
                { backgroundColor: theme.colors.accent },
              ]}
            >
              <Text style={styles.voteIndexBadgeText}>
                {`VOTE ${Math.max(1, currentVoteIndex + 1)} OF 2`}
              </Text>
            </View>
          )}
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Select the player whose clue seemed most suspicious.
          </Text>
        </View>

        {hasVotedThisRound ? (
          /* Waiting Screen after vote submitted */
          <View
            style={[
              styles.waitingCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={styles.waitingIcon}>🗳️</Text>
            <Text
              style={[
                styles.waitingTitle,
                { color: theme.colors.text },
              ]}
            >
              Vote Submitted!
            </Text>
            <Text
              style={[
                styles.waitingBody,
                { color: theme.colors.textSecondary },
              ]}
            >
              Waiting for everyone else to vote…
            </Text>

            {voteProgress && (
              <View
                style={[
                  styles.progressBadge,
                  { backgroundColor: theme.colors.surfaceSubtle },
                ]}
              >
                <Text
                  style={[
                    styles.progressText,
                    { color: theme.colors.primary },
                  ]}
                >
                  {`${voteProgress.submitted} / ${voteProgress.total} players voted`}
                </Text>
              </View>
            )}
          </View>
        ) : (
          /* Grid of Player Avatar Targets */
          <View style={styles.grid}>
            {eligibleTargets.map((target) => {
              const isMe = target.id === playerId;
              const isSelected = selectedTargetId === target.id;

              return (
                <TouchableOpacity
                  key={target.id}
                  style={[
                    styles.targetCard,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.surfaceCard
                        : theme.colors.surface,
                      borderColor: isSelected
                        ? theme.colors.accent
                        : theme.colors.border,
                      borderWidth: isSelected ? 3 : 1.5,
                      opacity: isMe ? 0.35 : 1,
                    },
                  ]}
                  onPress={() => {
                    if (!isMe) setSelectedTargetId(target.id);
                  }}
                  disabled={isMe}
                  activeOpacity={0.7}
                >
                  <Text style={styles.targetAvatar}>{target.avatar}</Text>
                  <Text
                    style={[
                      styles.targetName,
                      { color: theme.colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {target.name}
                  </Text>
                  {isMe ? (
                    <Text style={[styles.selfTag, { color: theme.colors.textMuted }]}>
                      (You)
                    </Text>
                  ) : isSelected ? (
                    <View
                      style={[
                        styles.selectedTag,
                        { backgroundColor: theme.colors.accent },
                      ]}
                    >
                      <Text style={styles.selectedTagText}>VOTE TARGET</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Confirm Vote Bar */}
      {!hasVotedThisRound && (
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.confirmButton,
              {
                backgroundColor: selectedTargetId
                  ? theme.colors.accent
                  : theme.colors.surfaceSubtle,
                opacity: selectedTargetId ? 1 : 0.6,
              },
            ]}
            onPress={handleConfirmVote}
            disabled={!selectedTargetId}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.confirmButtonText,
                {
                  color: selectedTargetId
                    ? '#FFFFFF'
                    : theme.colors.textMuted,
                },
              ]}
            >
              {selectedTargetId ? 'Confirm Vote 🗳️' : 'Select a Player Above'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 48,
  },
  scrollArea: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 16,
  },
  headerSection: {
    alignItems: 'center',
    marginVertical: 8,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  voteIndexBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  voteIndexBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  targetCard: {
    width: '46%',
    minHeight: 110, // tap target >= 56 pt
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  targetAvatar: {
    fontSize: 42,
  },
  targetName: {
    fontWeight: '800',
    fontSize: 16,
    textAlign: 'center',
  },
  selfTag: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectedTag: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
  },
  selectedTagText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  waitingCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 24,
    borderWidth: 1.5,
    marginTop: 20,
    gap: 12,
  },
  waitingIcon: {
    fontSize: 54,
  },
  waitingTitle: {
    fontSize: 24,
    fontWeight: '900',
  },
  waitingBody: {
    fontSize: 16,
    textAlign: 'center',
  },
  progressBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    marginTop: 8,
  },
  progressText: {
    fontWeight: '800',
    fontSize: 16,
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
  confirmButton: {
    minHeight: 56, // >= 56 pt tap target
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmButtonText: {
    fontSize: 19,
    fontWeight: '900',
  },
});
