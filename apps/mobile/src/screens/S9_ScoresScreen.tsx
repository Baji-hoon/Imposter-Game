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
import { RoundMeter } from '../components/RoundMeter';

export const S9_ScoresScreen: React.FC = () => {
  const { theme } = useTheme();
  const stateSync = useGameStore((s) => s.stateSync);
  const lastVoteResult = useGameStore((s) => s.lastVoteResult);
  const playerId = useGameStore((s) => s.playerId);
  const rtt = useGameStore((s) => s.rtt);
  const nextRound = useGameStore((s) => s.nextRound);

  if (!stateSync) return null;

  const isHost = stateSync.hostId === playerId;
  const scoreDelta = lastVoteResult?.scoreDelta || {};

  // Rank players by current score descending
  const rankedPlayers = [...stateSync.players]
    .map((p) => ({
      ...p,
      score: stateSync.scores[p.id] || 0,
      delta: scoreDelta[p.id] || 0,
    }))
    .sort((a, b) => b.score - a.score);

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
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Leaderboard
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Scores after Round {stateSync.round}
          </Text>
        </View>

        {/* Leaderboard List */}
        <View style={styles.list}>
          {rankedPlayers.map((player, index) => {
            const isMe = player.id === playerId;
            const isFirst = index === 0;

            return (
              <View
                key={player.id}
                style={[
                  styles.scoreCard,
                  {
                    backgroundColor: isMe
                      ? theme.colors.surfaceCard
                      : theme.colors.surface,
                    borderColor: isMe
                      ? theme.colors.primary
                      : theme.colors.border,
                    borderWidth: isMe ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.cardLeft}>
                  <Text style={styles.rankNum}>
                    {isFirst ? '👑' : `#${index + 1}`}
                  </Text>
                  <Text style={styles.avatar}>{player.avatar}</Text>
                  <View>
                    <View style={styles.nameRow}>
                      <Text
                        style={[
                          styles.name,
                          {
                            color: theme.colors.text,
                            fontSize: theme.typography.size.base,
                          },
                        ]}
                      >
                        {player.name}
                      </Text>
                      {isMe && <Text style={styles.youBadge}> (You)</Text>}
                    </View>
                    {player.delta > 0 && (
                      <Text
                        style={[
                          styles.deltaText,
                          { color: theme.colors.success },
                        ]}
                      >
                        +{player.delta} pts this round
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.cardRight}>
                  <Text
                    style={[
                      styles.scoreNumber,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {player.score}
                  </Text>
                  <Text style={[styles.scoreLabel, { color: theme.colors.textMuted }]}>
                    PTS
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Host Action Bar */}
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
              styles.nextRoundButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={nextRound}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.nextRoundButtonText,
                { color: theme.colors.primaryText },
              ]}
            >
              {stateSync.round >= stateSync.totalRounds && stateSync.totalRounds > 0
                ? 'Final Scores & Awards ➔'
                : 'Next Round ➔'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.nonHostBox}>
            <Text style={[styles.nonHostText, { color: theme.colors.textSecondary }]}>
              Waiting for host to begin next round…
            </Text>
          </View>
        )}
      </View>
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
  header: {
    alignItems: 'center',
    marginVertical: 4,
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 16,
  },
  list: {
    gap: 10,
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 18,
    minHeight: 64, // >= 56 pt tap target
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankNum: {
    fontSize: 16,
    fontWeight: '900',
    width: 28,
    textAlign: 'center',
    color: '#94A3B8',
  },
  avatar: {
    fontSize: 34,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontWeight: '800',
  },
  youBadge: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38BDF8',
  },
  deltaText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  scoreNumber: {
    fontSize: 24,
    fontWeight: '900',
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
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
  nextRoundButton: {
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
  nextRoundButtonText: {
    fontSize: 19,
    fontWeight: '900',
  },
  nonHostBox: {
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nonHostText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
