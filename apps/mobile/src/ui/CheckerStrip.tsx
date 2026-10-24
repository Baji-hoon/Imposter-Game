import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { tokens } from '@imposter/shared';

export interface CheckerStripProps {
  height?: number;
  width?: number | string;
  squareSize?: number;
  colorA?: string;
  colorB?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * CheckerStrip — black/white 8pt squares, 16pt tall
 * Static SVG pattern, pointerEvents="none"
 */
export const CheckerStrip: React.FC<CheckerStripProps> = ({
  height = 16,
  width = '100%',
  squareSize = 8,
  colorA = tokens.colors.ink,
  colorB = tokens.colors.paper,
  style,
}) => {
  const patternSize = squareSize * 2;

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
            id="checker-pattern"
            width={patternSize}
            height={patternSize}
            patternUnits="userSpaceOnUse"
          >
            <Rect x={0} y={0} width={squareSize} height={squareSize} fill={colorA} />
            <Rect x={squareSize} y={0} width={squareSize} height={squareSize} fill={colorB} />
            <Rect x={0} y={squareSize} width={squareSize} height={squareSize} fill={colorB} />
            <Rect x={squareSize} y={squareSize} width={squareSize} height={squareSize} fill={colorA} />
          </Pattern>
        </Defs>
        <Rect width="100%" height={height} fill="url(#checker-pattern)" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: tokens.colors.ink,
  },
});
