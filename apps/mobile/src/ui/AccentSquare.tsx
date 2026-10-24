import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { tokens } from '@imposter/shared';

export interface AccentSquareProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * AccentSquare — 24x24 orange square with 3pt ink stroke
 * Top-right detail on hero screens
 */
export const AccentSquare: React.FC<AccentSquareProps> = ({
  size = 24,
  color = tokens.colors.orange,
  style,
}) => {
  return (
    <View
      style={[
        styles.square,
        {
          width: size,
          height: size,
          backgroundColor: color,
        },
        style,
      ]}
      pointerEvents="none"
    />
  );
};

const styles = StyleSheet.create({
  square: {
    borderWidth: tokens.shape.stroke,
    borderColor: tokens.colors.ink,
    borderRadius: 0,
  },
});
