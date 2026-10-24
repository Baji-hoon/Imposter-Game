import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp, TextStyle } from 'react-native';
import { tokens } from '@imposter/shared';

export interface BannerProps {
  text: string;
  color?: 'yellow' | 'orange' | 'red' | 'paper';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Banner: React.FC<BannerProps> = ({
  text,
  color = 'yellow',
  style,
  textStyle,
}) => {
  const bgMap = {
    yellow: tokens.colors.yellow,
    orange: tokens.colors.orange,
    red: tokens.colors.red,
    paper: tokens.colors.paper,
  };

  const isRed = color === 'red';
  const textColor = isRed ? tokens.colors.paper : tokens.colors.ink;

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: bgMap[color] || tokens.colors.yellow },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: textColor },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {text.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: tokens.shape.stroke,
    borderColor: tokens.colors.ink,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  text: {
    fontFamily: tokens.typography.fonts.bodyBlack,
    fontSize: tokens.typography.styles.title.fontSize,
    lineHeight: tokens.typography.styles.title.lineHeight,
    letterSpacing: 1,
    textAlign: 'center',
  },
});
