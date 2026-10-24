import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { tokens } from '@imposter/shared';

export interface RoundMeterProps {
  currentRound: number;
  totalRounds: number;
  style?: StyleProp<ViewStyle>;
}

export const RoundMeter: React.FC<RoundMeterProps> = ({
  currentRound,
  totalRounds,
  style,
}) => {
  // Generate square segments
  const segments = Array.from({ length: Math.max(totalRounds, 1) }, (_, i) => i + 1);

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>
        {`ROUND ${currentRound} OF ${totalRounds}`.toUpperCase()}
      </Text>

      <View style={styles.segmentsRow}>
        {segments.map((roundNum) => {
          const isPassed = roundNum < currentRound;
          const isCurrent = roundNum === currentRound;

          return (
            <View
              key={roundNum}
              style={[
                styles.segment,
                isPassed && styles.passedSegment,
                isCurrent && styles.currentSegment,
                !isPassed && !isCurrent && styles.futureSegment,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: tokens.typography.styles.label.fontSize,
    lineHeight: tokens.typography.styles.label.lineHeight,
    letterSpacing: tokens.typography.styles.label.letterSpacing,
    color: tokens.colors.ink,
    marginBottom: 8,
  },
  segmentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  segment: {
    width: 20,
    height: 20,
    borderWidth: tokens.shape.strokeThin,
    borderColor: tokens.colors.ink,
    borderRadius: 0,
  },
  passedSegment: {
    backgroundColor: tokens.colors.ink,
  },
  currentSegment: {
    backgroundColor: tokens.colors.orange,
  },
  futureSegment: {
    backgroundColor: tokens.colors.paper,
  },
});
