import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Svg, { Defs, Pattern, Rect, Line } from 'react-native-svg';
import { tokens } from '@imposter/shared';

export interface StripeProps {
  height?: number;
  width?: number | string;
  stripeColor?: string;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Hazard Stripe — Neo-Brutalist diagonal ink/cream (or ink/yellow) stripes
 * Static SVG pattern, pointerEvents="none"
 */
export const Stripe: React.FC<StripeProps> = ({
  height = 20,
  width = '100%',
  stripeColor = tokens.colors.ink,
  backgroundColor = tokens.colors.cream,
  style,
}) => {
  return (
    <View
      style={[
        styles.container,
        { height, width: width as any },
        style,
      ]}
      pointerEvents="none"
    >
      <Svg width="100%" height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern
            id="hazard-pattern"
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <Rect width="8" height="16" fill={stripeColor} />
            <Rect x="8" width="8" height="16" fill={backgroundColor} />
          </Pattern>
        </Defs>
        <Rect width="100%" height={height} fill="url(#hazard-pattern)" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
