import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { tokens } from '@imposter/shared';

export interface DotGridProps {
  rows?: number;
  cols?: number;
  dotSize?: number;
  spacing?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * DotGrid — 6x6 halftone ink dots in a 56x56 block
 * Static SVG, pointerEvents="none"
 */
export const DotGrid: React.FC<DotGridProps> = ({
  rows = 6,
  cols = 6,
  dotSize = 3,
  spacing = 9,
  color = tokens.colors.ink,
  style,
}) => {
  const width = cols * spacing;
  const height = rows * spacing;

  const dots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push(
        <Circle
          key={`${r}-${c}`}
          cx={c * spacing + spacing / 2}
          cy={r * spacing + spacing / 2}
          r={dotSize / 2}
          fill={color}
        />
      );
    }
  }

  return (
    <View
      style={[
        styles.container,
        { width, height },
        style,
      ]}
      pointerEvents="none"
    >
      <Svg width={width} height={height}>
        {dots}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
