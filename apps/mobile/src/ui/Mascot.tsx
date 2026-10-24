import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Svg, { Rect, G } from 'react-native-svg';
import { tokens } from '@imposter/shared';

export interface MascotProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Mascot — Original neo-brutalist card mascot placeholder (docs/DESIGN.md Section 6.1)
 * A rotated paper card figure with 3pt ink stroke, two square eyes,
 * a yellow masked disguise bar across them, and hard offset shadow.
 */
export const Mascot: React.FC<MascotProps> = ({ size = 160, style }) => {
  // SVG coordinates based on a 160x180 viewBox
  return (
    <View style={[styles.container, { width: size, height: size * 1.1 }, style]}>
      <Svg viewBox="0 0 160 180" width="100%" height="100%">
        <G transform="translate(10, 10)">
          {/* Hard offset black shadow behind card */}
          <Rect
            x="24"
            y="20"
            width="100"
            height="140"
            fill={tokens.colors.ink}
            transform="rotate(6, 74, 90)"
          />

          {/* Main Card Body (Paper fill, 3pt ink stroke, rotated -3 deg) */}
          <Rect
            x="18"
            y="14"
            width="100"
            height="140"
            fill={tokens.colors.paper}
            stroke={tokens.colors.ink}
            strokeWidth="3"
            transform="rotate(-3, 68, 84)"
          />

          {/* Mask / Disguise Bar across eyes (Yellow fill, 3pt stroke) */}
          <Rect
            x="22"
            y="52"
            width="92"
            height="32"
            fill={tokens.colors.yellow}
            stroke={tokens.colors.ink}
            strokeWidth="3"
            transform="rotate(-3, 68, 68)"
          />

          {/* Left Square Eye */}
          <Rect
            x="42"
            y="62"
            width="12"
            height="12"
            fill={tokens.colors.ink}
            transform="rotate(-3, 48, 68)"
          />

          {/* Right Square Eye */}
          <Rect
            x="80"
            y="60"
            width="12"
            height="12"
            fill={tokens.colors.ink}
            transform="rotate(-3, 86, 66)"
          />

          {/* Secret Word slot / card detail lines */}
          <Rect
            x="38"
            y="108"
            width="60"
            height="10"
            fill={tokens.colors.ink}
            transform="rotate(-3, 68, 113)"
          />
          <Rect
            x="48"
            y="126"
            width="40"
            height="6"
            fill={tokens.colors.yellowSoft}
            stroke={tokens.colors.ink}
            strokeWidth="2"
            transform="rotate(-3, 68, 129)"
          />
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
