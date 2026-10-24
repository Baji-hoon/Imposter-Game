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

interface S10GameOverScreenProps {
  onOpenSettings: () => void;
  onLeave: () => void;
}

export const S10_GameOverScreen: React.FC<S10GameOverScreenProps> = ({
  onOpenSettings,
  onLeave,
}) => {
  const { theme } = useTheme();
  const stateSync = useGameStore((s) => s.stateSync);
  const lastGameOver = useGameStore((s) => s.lastGameOver);
  const playerId = useGameStore((s) => s.playerId);
  const playAgain = useGameStore((s) => s.playAgain);

  if (!stateSync) return null;

  const isHost = stateSync.hostId === playerId;
  const finalScores = lastGameOver?.finalScores || stateSync.scores || {};
  const awards = lastGameOver?.awards || [];

  const rankedPlayers = [...stateSync.players]
    .map((p) => ({
      ...p,
      score: finalScores[p.id] || 0,
    }))
    .sort((a, b) => b.score - a.score);

  const winner = rankedPlayers[0];

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
      bounces={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.trophyIcon}>🏆</Text>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Game Complete!
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          All rounds finished. Here are the champions:
        </Text>
      </View>

      {/* Winner Spotlight Podium */}
      {winner && (
        <View
          style={[
            styles.podiumCard,
            {
              backgroundColor: theme.colors.surfaceCard,
              borderColor: '#F59E0B', // Gold
            },
          ]}
        >
          <Text style={styles.crown}>👑</Text>
          <Text style={styles.winnerAvatar}>{winner.avatar}</Text>
          <Text
            style={[
              styles.winnerName,
              { color: theme.colors.text, fontSize: theme.typography.size.xxl },
            ]}
          >
            {winner.name}
          </Text>
          <View style={styles.goldBadge}>
            <Text style={styles.goldBadgeText}>{winner.score} POINTS • 1ST PLACE</Text>
          </View>
        </View>
      )}

      {/* Fun Awards Showcase */}
      {awards.length > 0 && (
        <View style={styles.awardsSection}>
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.textMuted },
            ]}
          >
            PARTY AWARDS
          </Text>
          <View style={styles.awardsList}>
            {awards.map((award, i) => {
              const recipient = stateSync.players.find((p) => p.id === award.playerId);
              return (
                <View
                  key={i}
                  style={[
                    styles.awardCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text style={styles.awardRecipientAvatar}>
                    {recipient?.avatar || '🌟'}
                  </Text>
                  <View style={styles.awardTextCol}>
                    <Text
                      style={[
                        styles.awardTitle,
                        { color: theme.colors.primary },
                      ]}
                    >
                      {award.title}
                    </Text>
                    <Text
                      style={[
                        styles.awardRecipientName,
                        { color: theme.colors.text },
                      ]}
                    >
                      {recipient?.name || 'Player'}
                    </Text>
                    <Text
                      style={[
                        styles.awardDesc,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {award.desc}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Final Standings Table */}
      <View style={styles.standingsSection}>
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.textMuted },
          ]}
        >
          FINAL STANDINGS
        </Text>
        <View style={styles.standingsList}>
          {rankedPlayers.map((p, rank) => (
            <View
              key={p.id}
              style={[
                styles.standingRow,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.standingLeft}>
                <Text style={styles.rankNum}>#{rank + 1}</Text>
                <Text style={styles.standingAvatar}>{p.avatar}</Text>
                <Text
                  style={[
                    styles.standingName,
                    { color: theme.colors.text },
                  ]}
                >
                  {p.name}
                </Text>
              </View>
              <Text
                style={[
                  styles.standingScore,
                  { color: theme.colors.primary },
                ]}
              >
                {p.score} pts
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {isHost ? (
          <>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={playAgain}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.primaryBtnText,
                  { color: theme.colors.primaryText },
                ]}
              >
                🔄 Play Again (Same Players)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={onOpenSettings}
              activeOpacity={0.8}
            >
              <Text style={[styles.secondaryBtnText, { color: theme.colors.text }]}>
                ⚙️ Change Settings
              </Text>
            </TouchableOpacity>
          </>
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
              Waiting for host to start a new game…
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.leaveBtn,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.danger,
            },
          ]}
          onPress={onLeave}
          activeOpacity={0.7}
        >
          <Text style={[styles.leaveBtnText, { color: theme.colors.danger }]}>
            🚪 Leave Game
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 40,
    gap: 20,
  },
  header: {
    alignItems: 'center',
    gap: 6,
  },
  trophyIcon: {
    fontSize: 54,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  podiumCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    borderWidth: 2,
    gap: 8,
  },
  crown: {
    fontSize: 32,
  },
  winnerAvatar: {
    fontSize: 60,
  },
  winnerName: {
    fontWeight: '900',
    textAlign: 'center',
  },
  goldBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 4,
  },
  goldBadgeText: {
    color: '#0B0F19',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1,
  },
  awardsSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  awardsList: {
    gap: 10,
  },
  awardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  awardRecipientAvatar: {
    fontSize: 38,
  },
  awardTextCol: {
    flex: 1,
    gap: 2,
  },
  awardTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  awardRecipientName: {
    fontSize: 17,
    fontWeight: '800',
  },
  awardDesc: {
    fontSize: 13,
  },
  standingsSection: {
    gap: 10,
  },
  standingsList: {
    gap: 6,
  },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  standingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankNum: {
    fontSize: 15,
    fontWeight: '900',
    color: '#94A3B8',
    width: 24,
  },
  standingAvatar: {
    fontSize: 26,
  },
  standingName: {
    fontWeight: '700',
    fontSize: 15,
  },
  standingScore: {
    fontWeight: '900',
    fontSize: 17,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  primaryBtn: {
    minHeight: 56, // >= 56 pt tap target
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 18,
    fontWeight: '800',
  },
  secondaryBtn: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 17,
    fontWeight: '700',
  },
  leaveBtn: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaveBtnText: {
    fontSize: 17,
    fontWeight: '800',
  },
  waitingBox: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  waitingText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
