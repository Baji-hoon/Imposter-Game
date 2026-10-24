import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useGameStore } from '../store/gameStore';

interface S8RevealScreenProps {
  onContinue: () => void;
}

export const S8_RevealScreen: React.FC<S8RevealScreenProps> = ({ onContinue }) => {
  const { theme } = useTheme();
  const stateSync = useGameStore((s) => s.stateSync);
  const lastVoteResult = useGameStore((s) => s.lastVoteResult);
  const playerId = useGameStore((s) => s.playerId);
  const myLastVoteTargetId = useGameStore((s) => s.myLastVoteTargetId);

  if (!stateSync || !lastVoteResult) return null;

  const isHost = stateSync.hostId === playerId;
  const removedPlayer = lastVoteResult.removedId
    ? stateSync.players.find((p) => p.id === lastVoteResult.removedId)
    : null;

  const myRole = (playerId && lastVoteResult.roles[playerId]) || 'civilian';
  const myScoreDelta = (playerId && lastVoteResult.scoreDelta[playerId]) || 0;
  const wasIEliminated = lastVoteResult.removedId === playerId;
  const myTargetPlayer = myLastVoteTargetId
    ? stateSync.players.find((p) => p.id === myLastVoteTargetId)
    : null;
  const myTargetRole = myLastVoteTargetId
    ? lastVoteResult.roles[myLastVoteTargetId]
    : null;

  // Classify players by role
  const imposters = stateSync.players.filter(
    (p) => lastVoteResult.roles[p.id] === 'imposter'
  );
  const civilians = stateSync.players.filter(
    (p) => lastVoteResult.roles[p.id] === 'civilian'
  );

  // Determine personal outcome details
  let outcomeIcon = '🛡️';
  let outcomeBadge = 'SURVIVED';
  let outcomeBadgeBg = theme.colors.primary;
  let outcomeTitle = 'Round Complete';
  let outcomeDesc = 'The votes have been counted.';

  if (wasIEliminated) {
    outcomeIcon = '👻';
    outcomeBadge = 'ELIMINATED (+0 PTS)';
    outcomeBadgeBg = theme.colors.danger;
    outcomeTitle = 'You Were Voted Out!';
    outcomeDesc = 'The group cast the most votes for you this round.';
  } else if (myRole === 'civilian') {
    if (myScoreDelta > 0) {
      outcomeIcon = '🎯';
      outcomeBadge = `SPOT ON! (+${myScoreDelta} PT)`;
      outcomeBadgeBg = theme.colors.success;
      outcomeTitle = 'You Caught the Imposter!';
      outcomeDesc = `You voted for ${myTargetPlayer?.name || 'the imposter'}, and they were eliminated!`;
    } else if (myTargetPlayer) {
      outcomeIcon = '❌';
      outcomeBadge = 'WRONG GUESS (+0 PTS)';
      outcomeBadgeBg = '#EAB308';
      outcomeTitle = 'Misdirection!';
      outcomeDesc = `You voted for ${myTargetPlayer.name}, but they were a Civilian.`;
    } else {
      outcomeIcon = '🛡️';
      outcomeBadge = 'SURVIVED (+0 PTS)';
      outcomeBadgeBg = theme.colors.primary;
      outcomeTitle = 'Civilian Safe';
      outcomeDesc = 'You stayed safe through this round of voting.';
    }
  } else if (myRole === 'imposter') {
    if (myScoreDelta > 0) {
      outcomeIcon = '🎭';
      outcomeBadge = `BLUFF SUCCESSFUL (+${myScoreDelta} PTS)`;
      outcomeBadgeBg = theme.colors.success;
      outcomeTitle = 'Master of Deception!';
      outcomeDesc = 'You fooled the circle and survived without being caught!';
    } else {
      outcomeIcon = '🚨';
      outcomeBadge = 'BUSTED (+0 PTS)';
      outcomeBadgeBg = theme.colors.danger;
      outcomeTitle = 'You Were Caught!';
      outcomeDesc = 'The circle uncovered your secret word.';
    }
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
      bounces={false}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          The Truth Revealed
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Round {stateSync.round} is finished
        </Text>
      </View>

      {/* 1. PERSONAL HERO OUTCOME CARD */}
      <View
        style={[
          styles.heroOutcomeCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: outcomeBadgeBg,
          },
        ]}
      >
        <Text style={styles.heroOutcomeIcon}>{outcomeIcon}</Text>
        <View style={[styles.heroOutcomeBadge, { backgroundColor: outcomeBadgeBg }]}>
          <Text style={styles.heroOutcomeBadgeText}>{outcomeBadge}</Text>
        </View>
        <Text style={[styles.heroOutcomeTitle, { color: theme.colors.text }]}>
          {outcomeTitle}
        </Text>
        <Text style={[styles.heroOutcomeDesc, { color: theme.colors.textSecondary }]}>
          {outcomeDesc}
        </Text>
      </View>

      {/* 2. ROLES REVEALED (Explicit Imposters vs Civilians) */}
      <View
        style={[
          styles.cardBox,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.sectionHeading, { color: theme.colors.textMuted }]}>
          PLAYER ROLES
        </Text>

        {/* Imposter Section */}
        <View style={styles.roleGroup}>
          <View style={styles.roleGroupHeader}>
            <Text style={[styles.roleGroupTitle, { color: theme.colors.danger }]}>
              🚨 IMPOSTER{imposters.length > 1 ? 'S' : ''}
            </Text>
          </View>
          <View style={styles.roleChipRow}>
            {imposters.map((p) => {
              const isMe = p.id === playerId;
              const isEliminated = p.id === lastVoteResult.removedId;
              return (
                <View
                  key={p.id}
                  style={[
                    styles.roleChip,
                    {
                      backgroundColor: theme.colors.danger + '18',
                      borderColor: theme.colors.danger,
                    },
                  ]}
                >
                  <Text style={styles.chipAvatar}>{p.avatar}</Text>
                  <Text style={[styles.chipName, { color: theme.colors.text }]}>
                    {p.name} {isMe ? '(You)' : ''}
                  </Text>
                  <Text
                    style={[
                      styles.chipStatus,
                      { color: isEliminated ? theme.colors.danger : theme.colors.success },
                    ]}
                  >
                    {isEliminated ? '✕ Eliminated' : '✓ Survived'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Civilian Section */}
        <View style={styles.roleGroup}>
          <View style={styles.roleGroupHeader}>
            <Text style={[styles.roleGroupTitle, { color: theme.colors.primary }]}>
              🛡️ CIVILIANS
            </Text>
          </View>
          <View style={styles.roleChipRow}>
            {civilians.map((p) => {
              const isMe = p.id === playerId;
              const isEliminated = p.id === lastVoteResult.removedId;
              return (
                <View
                  key={p.id}
                  style={[
                    styles.roleChip,
                    {
                      backgroundColor: theme.colors.surfaceSubtle,
                      borderColor: isMe ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <Text style={styles.chipAvatar}>{p.avatar}</Text>
                  <Text style={[styles.chipName, { color: theme.colors.text }]}>
                    {p.name} {isMe ? '(You)' : ''}
                  </Text>
                  {isEliminated && (
                    <Text style={[styles.chipStatus, { color: theme.colors.danger }]}>
                      ✕ Voted Out
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* 3. SECRET WORDS SIDE-BY-SIDE */}
      <View
        style={[
          styles.cardBox,
          {
            backgroundColor: theme.colors.surfaceCard,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.sectionHeading, { color: theme.colors.textMuted }]}>
          THE SECRET WORDS
        </Text>
        <View style={styles.wordsRow}>
          <View style={styles.wordBox}>
            <Text style={[styles.wordRoleLabel, { color: theme.colors.primary }]}>
              CIVILIAN
            </Text>
            <Text style={[styles.wordValue, { color: theme.colors.text }]}>
              {lastVoteResult.words.civilian.toUpperCase()}
            </Text>
            {myRole === 'civilian' && (
              <Text style={[styles.yourWordTag, { color: theme.colors.primary }]}>
                (Your Word)
              </Text>
            )}
          </View>

          <View style={[styles.wordDivider, { backgroundColor: theme.colors.border }]} />

          <View style={styles.wordBox}>
            <Text style={[styles.wordRoleLabel, { color: theme.colors.danger }]}>
              IMPOSTER
            </Text>
            <Text style={[styles.wordValue, { color: theme.colors.text }]}>
              {lastVoteResult.words.imposter
                ? lastVoteResult.words.imposter.toUpperCase()
                : '— BLANK —'}
            </Text>
            {myRole === 'imposter' && (
              <Text style={[styles.yourWordTag, { color: theme.colors.danger }]}>
                (Your Word)
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* 4. VOTE TALLIES SUMMARY */}
      <View
        style={[
          styles.cardBox,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.sectionHeading, { color: theme.colors.textMuted }]}>
          VOTE TALLIES
        </Text>
        <View style={styles.talliesList}>
          {stateSync.players.map((p) => {
            const count = lastVoteResult.tallies[p.id] || 0;
            const isEliminated = p.id === lastVoteResult.removedId;
            const isMe = p.id === playerId;

            return (
              <View
                key={p.id}
                style={[
                  styles.tallyRow,
                  {
                    backgroundColor: isEliminated
                      ? theme.colors.danger + '12'
                      : theme.colors.surfaceSubtle,
                    borderColor: isEliminated
                      ? theme.colors.danger
                      : isMe
                      ? theme.colors.primary
                      : theme.colors.border,
                  },
                ]}
              >
                <View style={styles.tallyLeft}>
                  <Text style={styles.tallyAvatar}>{p.avatar}</Text>
                  <Text style={[styles.tallyName, { color: theme.colors.text }]}>
                    {p.name} {isMe ? '(You)' : ''}
                  </Text>
                </View>

                <View style={styles.tallyRight}>
                  {isEliminated && (
                    <Text style={[styles.eliminatedBadge, { color: theme.colors.danger }]}>
                      Eliminated
                    </Text>
                  )}
                  <View
                    style={[
                      styles.tallyPill,
                      {
                        backgroundColor:
                          count > 0 ? theme.colors.accent : theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tallyCount,
                        { color: count > 0 ? '#FFFFFF' : theme.colors.textMuted },
                      ]}
                    >
                      {count} {count === 1 ? 'vote' : 'votes'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* 5. CONTINUE ACTION */}
      {isHost ? (
        <TouchableOpacity
          style={[
            styles.continueButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={onContinue}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.continueButtonText,
              { color: theme.colors.primaryText },
            ]}
          >
            View Scores ➔
          </Text>
        </TouchableOpacity>
      ) : (
        <View
          style={[
            styles.waitingBox,
            {
              backgroundColor: theme.colors.surfaceSubtle,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.waitingText, { color: theme.colors.textSecondary }]}>
            Waiting for host to advance to scoreboard…
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  heroOutcomeCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    borderWidth: 2,
    gap: 8,
    marginVertical: 4,
  },
  heroOutcomeIcon: {
    fontSize: 52,
    marginBottom: 4,
  },
  heroOutcomeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
  },
  heroOutcomeBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1,
  },
  heroOutcomeTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 4,
  },
  heroOutcomeDesc: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 12,
    lineHeight: 20,
  },
  cardBox: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
  },
  roleGroup: {
    gap: 6,
  },
  roleGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleGroupTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  roleChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  chipAvatar: {
    fontSize: 18,
  },
  chipName: {
    fontSize: 14,
    fontWeight: '700',
  },
  chipStatus: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4,
  },
  wordsRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
  },
  wordBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  wordRoleLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  wordValue: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  yourWordTag: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  wordDivider: {
    width: 1,
    height: 48,
  },
  talliesList: {
    gap: 6,
  },
  tallyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 48,
  },
  tallyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tallyAvatar: {
    fontSize: 22,
  },
  tallyName: {
    fontWeight: '700',
    fontSize: 15,
  },
  tallyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eliminatedBadge: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tallyPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tallyCount: {
    fontSize: 13,
    fontWeight: '800',
  },
  continueButton: {
    minHeight: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '800',
  },
  waitingBox: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
  },
  waitingText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
