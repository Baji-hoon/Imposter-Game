import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp, TextStyle } from 'react-native';
import { tokens } from '@imposter/shared';

export type BrutalCardColor = 'paper' | 'yellow' | 'yellowSoft' | 'red' | 'cream';

export interface BrutalCardProps {
  children?: React.ReactNode;
  color?: BrutalCardColor;
  shadowOffset?: number;
  title?: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  headerRight?: React.ReactNode;
}

export const BrutalCard: React.FC<BrutalCardProps> = ({
  children,
  color = 'paper',
  shadowOffset = tokens.shape.shadowLarge, // Default 6 for cards
  title,
  subtitle,
  style,
  contentStyle,
  titleStyle,
  headerRight,
}) => {
  const bgMap: Record<BrutalCardColor, string> = {
    paper: tokens.colors.paper,
    yellow: tokens.colors.yellow,
    yellowSoft: tokens.colors.yellowSoft,
    red: tokens.colors.red,
    cream: tokens.colors.cream,
  };

  const backgroundColor = bgMap[color] || tokens.colors.paper;
  const isRed = color === 'red';
  const textColor = isRed ? tokens.colors.paper : tokens.colors.ink;

  return (
    <View
      style={[
        styles.outerContainer,
        {
          paddingRight: shadowOffset,
          paddingBottom: shadowOffset,
        },
        style,
      ]}
    >
      {/* Solid ink offset shadow */}
      <View
        style={[
          styles.shadow,
          {
            top: shadowOffset,
            left: shadowOffset,
            backgroundColor: tokens.colors.ink,
          },
        ]}
        pointerEvents="none"
      />

      {/* Card Foreground */}
      <View
        style={[
          styles.foreground,
          {
            backgroundColor,
          },
        ]}
      >
        {/* Optional Header Bar */}
        {(title || headerRight) && (
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {title && (
                <Text
                  style={[
                    styles.headerTitle,
                    { color: textColor },
                    titleStyle,
                  ]}
                >
                  {title.toUpperCase()}
                </Text>
              )}
              {subtitle && (
                <Text style={[styles.headerSubtitle, { color: textColor }]}>
                  {subtitle}
                </Text>
              )}
            </View>
            {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
          </View>
        )}

        {/* Card Content */}
        <View style={[styles.content, contentStyle]}>{children}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'relative',
    width: '100%',
  },
  shadow: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderRadius: 0,
  },
  foreground: {
    borderWidth: tokens.shape.stroke,
    borderColor: tokens.colors.ink,
    borderRadius: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: tokens.shape.stroke,
    borderBottomColor: tokens.colors.ink,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: tokens.typography.fonts.bodyBlack,
    fontSize: tokens.typography.styles.title.fontSize,
    lineHeight: tokens.typography.styles.title.lineHeight,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontFamily: tokens.typography.fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    marginLeft: 12,
  },
  content: {
    padding: 16,
  },
});
