import React, { useRef } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  Animated,
  ViewStyle,
  StyleProp,
  TextStyle,
} from 'react-native';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { tokens } from '@imposter/shared';

export type BrutalButtonVariant = 'primary' | 'secondary' | 'neutral' | 'tile' | 'danger';

export interface BrutalButtonProps {
  title?: string;
  onPress?: () => void;
  variant?: BrutalButtonVariant;
  disabled?: boolean;
  disabledText?: string;
  icon?: string;                     // FontAwesome5 solid icon name
  tileColor?: 'orange' | 'yellow';    // Color of the left icon block for 'tile' variant
  hasArrow?: boolean;                 // Right-side black arrow block variant
  square?: boolean;                   // Square icon-only button (56x56)
  shadowOffset?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

export const BrutalButton: React.FC<BrutalButtonProps> = ({
  title = '',
  onPress,
  variant = 'primary',
  disabled = false,
  disabledText,
  icon,
  tileColor = 'orange',
  hasArrow = false,
  square = false,
  shadowOffset = tokens.shape.shadow,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const pressAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.timing(pressAnim, {
      toValue: shadowOffset,
      duration: tokens.motion.pressDuration,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.timing(pressAnim, {
      toValue: 0,
      duration: tokens.motion.pressDuration,
      useNativeDriver: true,
    }).start();
  };

  // Variant fill colors
  let backgroundColor: string = tokens.colors.paper;
  let textColor: string = tokens.colors.ink;

  if (variant === 'primary') {
    backgroundColor = tokens.colors.orange;
    textColor = tokens.colors.ink;
  } else if (variant === 'secondary') {
    backgroundColor = tokens.colors.yellow;
    textColor = tokens.colors.ink;
  } else if (variant === 'neutral') {
    backgroundColor = tokens.colors.paper;
    textColor = tokens.colors.ink;
  } else if (variant === 'danger') {
    backgroundColor = tokens.colors.red;
    textColor = tokens.colors.paper;
  } else if (variant === 'tile') {
    backgroundColor = tokens.colors.paper;
    textColor = tokens.colors.ink;
  }

  const effectiveOffset = disabled ? 0 : shadowOffset;
  const displayTitle = disabled && disabledText ? disabledText : title;
  const isSquare = square || (!displayTitle && Boolean(icon));

  // Render disabled state
  if (disabled) {
    return (
      <View
        style={[
          styles.container,
          isSquare && styles.squareBox,
          styles.disabledBox,
          style,
        ]}
        accessibilityLabel={accessibilityLabel || displayTitle}
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
      >
        {isSquare && icon ? (
          <FontAwesome5 name={icon} size={24} color={tokens.colors.grey} solid />
        ) : (
          <Text
            style={[styles.disabledText, { flexShrink: 0 }, textStyle]}
            numberOfLines={1}
          >
            {displayTitle.toUpperCase()}
          </Text>
        )}
      </View>
    );
  }

  // Active pressable state with hard offset shadow View
  return (
    <View
      style={[
        isSquare
          ? [
              styles.squareOuterContainer,
              {
                width: tokens.shape.tap + effectiveOffset,
                height: tokens.shape.tap + effectiveOffset,
              },
            ]
          : [
              styles.outerContainer,
              {
                paddingRight: effectiveOffset,
                paddingBottom: effectiveOffset,
              },
            ],
        style,
      ]}
    >
      {/* Hard offset black shadow behind button */}
      <View
        style={[
          styles.shadow,
          {
            top: effectiveOffset,
            left: effectiveOffset,
            width: isSquare ? tokens.shape.tap : undefined,
            height: isSquare ? tokens.shape.tap : undefined,
            right: isSquare ? undefined : 0,
            bottom: isSquare ? undefined : 0,
            backgroundColor: tokens.colors.ink,
          },
        ]}
        pointerEvents="none"
      />

      {/* Interactive foreground button */}
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || displayTitle}
        style={isSquare ? styles.squarePressable : styles.fullWidth}
      >
        <Animated.View
          style={[
            isSquare ? styles.squareForeground : styles.foreground,
            {
              backgroundColor,
              transform: [
                { translateX: pressAnim },
                { translateY: pressAnim },
              ],
            },
          ]}
        >
          {/* Square icon-only button */}
          {isSquare && icon && (
            <FontAwesome5 name={icon} size={24} color={textColor} solid />
          )}

          {/* Tile variant with left square icon block */}
          {!isSquare && variant === 'tile' && icon && (
            <View
              style={[
                styles.iconTile,
                {
                  backgroundColor:
                    tileColor === 'orange' ? tokens.colors.orange : tokens.colors.yellow,
                },
              ]}
            >
              <FontAwesome5 name={icon} size={24} color={tokens.colors.ink} solid />
            </View>
          )}

          {/* Standard left icon if not tile and not square */}
          {!isSquare && variant !== 'tile' && icon && (
            <View style={styles.leftIconContainer}>
              <FontAwesome5 name={icon} size={20} color={textColor} solid />
            </View>
          )}

          {/* Button label: numberOfLines={1} and flexShrink: 0 so it never wraps */}
          {!isSquare && Boolean(displayTitle) && (
            <View style={styles.labelWrapper}>
              <Text
                style={[
                  styles.buttonText,
                  { color: textColor, flexShrink: 0 },
                  textStyle,
                ]}
                numberOfLines={1}
              >
                {displayTitle.toUpperCase()}
              </Text>
            </View>
          )}

          {/* Right-side black arrow block variant */}
          {!isSquare && hasArrow && (
            <View style={styles.arrowBlock}>
              <FontAwesome5 name="arrow-right" size={18} color={tokens.colors.cream} solid />
            </View>
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'relative',
    width: '100%',
  },
  squareOuterContainer: {
    position: 'relative',
    width: tokens.shape.tap,
    height: tokens.shape.tap,
  },
  container: {
    width: '100%',
    minHeight: tokens.shape.tap,
  },
  squareBox: {
    width: tokens.shape.tap,
    height: tokens.shape.tap,
    minHeight: tokens.shape.tap,
    paddingHorizontal: 0,
  },
  fullWidth: {
    width: '100%',
  },
  squarePressable: {
    width: tokens.shape.tap,
    height: tokens.shape.tap,
  },
  shadow: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderRadius: 0,
  },
  foreground: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: tokens.shape.tap,
    borderWidth: tokens.shape.stroke,
    borderColor: tokens.colors.ink,
    borderRadius: 0,
    overflow: 'hidden',
  },
  squareForeground: {
    width: tokens.shape.tap,
    height: tokens.shape.tap,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: tokens.shape.stroke,
    borderColor: tokens.colors.ink,
    borderRadius: 0,
    overflow: 'hidden',
  },
  iconTile: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: tokens.shape.stroke,
    borderRightColor: tokens.colors.ink,
  },
  leftIconContainer: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  labelWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  buttonText: {
    fontFamily: tokens.typography.fonts.bodyBlack,
    fontSize: tokens.typography.styles.title.fontSize,
    lineHeight: tokens.typography.styles.title.lineHeight,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  arrowBlock: {
    width: 56,
    height: 56,
    backgroundColor: tokens.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: tokens.shape.stroke,
    borderLeftColor: tokens.colors.ink,
  },
  disabledBox: {
    backgroundColor: tokens.colors.cream,
    borderWidth: tokens.shape.stroke,
    borderColor: tokens.colors.grey,
    borderStyle: 'dashed',
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  disabledText: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: 14,
    color: tokens.colors.grey,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
