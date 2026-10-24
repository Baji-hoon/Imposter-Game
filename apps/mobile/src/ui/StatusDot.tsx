import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { tokens } from '@imposter/shared';

export type StatusDotState = 'present' | 'reconnecting' | 'offline';

export interface StatusDotProps {
  status: StatusDotState;
  rttMs?: number | null;
  showPill?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  status,
  rttMs,
  showPill = false,
  label,
  style,
}) => {
  const [showDebug, setShowDebug] = useState(false);

  const getBackgroundColor = () => {
    switch (status) {
      case 'present':
        return tokens.colors.green;
      case 'reconnecting':
        return tokens.colors.yellow;
      case 'offline':
        return tokens.colors.red;
    }
  };

  const dot = (
    <View
      style={[
        styles.dot,
        { backgroundColor: getBackgroundColor() },
      ]}
    >
      {status === 'reconnecting' && (
        <Svg width="10" height="10" style={StyleSheet.absoluteFill}>
          <Line x1="0" y1="10" x2="10" y2="0" stroke={tokens.colors.ink} strokeWidth="2" />
        </Svg>
      )}
    </View>
  );

  if (showPill || label) {
    return (
      <Pressable
        onLongPress={() => setShowDebug((prev) => !prev)}
        style={[styles.pill, style]}
        accessibilityRole="text"
        accessibilityLabel={`Status: ${status}${rttMs ? `, ${rttMs}ms` : ''}`}
      >
        {dot}
        {label && <Text style={styles.pillText}>{label.toUpperCase()}</Text>}
        {showDebug && rttMs !== undefined && rttMs !== null && (
          <Text style={styles.debugText}>{`${rttMs}ms`}</Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onLongPress={() => setShowDebug((prev) => !prev)}
      style={[styles.dotWrapper, style]}
      accessibilityRole="text"
    >
      {dot}
      {showDebug && rttMs !== undefined && rttMs !== null && (
        <View style={styles.debugTooltip}>
          <Text style={styles.debugTooltipText}>{`${rttMs}ms`}</Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  dotWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderWidth: 2,
    borderColor: tokens.colors.ink,
    borderRadius: 0,
    overflow: 'hidden',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: tokens.colors.paper,
    borderWidth: tokens.shape.strokeThin,
    borderColor: tokens.colors.ink,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
  },
  pillText: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: tokens.colors.ink,
  },
  debugText: {
    fontFamily: tokens.typography.fonts.body,
    fontSize: 10,
    color: tokens.colors.ink,
    marginLeft: 4,
  },
  debugTooltip: {
    position: 'absolute',
    top: 14,
    backgroundColor: tokens.colors.ink,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 0,
    zIndex: 10,
  },
  debugTooltipText: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: 9,
    color: tokens.colors.cream,
  },
});
