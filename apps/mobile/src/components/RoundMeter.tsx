import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface RoundMeterProps {
  currentRound: number;
  totalRounds: number;
  rtt?: number;
}

export const RoundMeter: React.FC<RoundMeterProps> = ({
  currentRound,
  totalRounds,
  rtt = 0,
}) => {
  const { theme } = useTheme();

  // Signal dot: green < 150 ms, amber < 500 ms, red otherwise
  const getSignalColor = () => {
    if (rtt <= 0) return '#94A3B8';
    if (rtt < 150) return theme.colors.success;
    if (rtt < 500) return '#EAB308'; // Amber
    return theme.colors.danger;
  };

  const renderDots = () => {
    if (totalRounds <= 0) return null; // Endless
    const dots = [];
    const count = Math.min(totalRounds, 10);
    for (let i = 1; i <= count; i++) {
      const isCompletedOrCurrent = i <= currentRound;
      dots.push(
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: isCompletedOrCurrent
                ? theme.colors.primary
                : theme.colors.surfaceSubtle,
              borderColor: theme.colors.border,
            },
          ]}
        />
      );
    }
    return <View style={styles.dotsContainer}>{dots}</View>;
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.left}>
        <Text
          style={[
            styles.roundText,
            {
              color: theme.colors.text,
              fontSize: theme.typography.size.base,
            },
          ]}
        >
          {totalRounds > 0
            ? `Round ${currentRound} of ${totalRounds}`
            : `Round ${currentRound}`}
        </Text>
        {renderDots()}
      </View>

      <View style={styles.right}>
        <View style={[styles.signalDot, { backgroundColor: getSignalColor() }]} />
        <Text
          style={[
            styles.rttText,
            {
              color: theme.colors.textMuted,
              fontSize: theme.typography.size.xs,
            },
          ]}
        >
          {rtt > 0 ? `${rtt}ms` : 'LAN'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  left: {
    flexDirection: 'column',
    gap: 4,
  },
  roundText: {
    fontWeight: '700',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rttText: {
    fontWeight: '600',
  },
});
