import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { tokens } from '@imposter/shared';

export interface BrutalBoxProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  hasShadow?: boolean;
  shadowOffset?: number;
  pressable?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  accessibilityLabel?: string;
}

/**
 * BrutalBox — Base Neo-Brutalist container
 * - 0 radius everywhere
 * - 3pt stroke solid ink
 * - Hard shadow rendered via an offset black View behind the element (never elevation or shadow* props)
 * - Pressable translates by the shadow offset (4,4) on press over 80 ms
 */
export const BrutalBox: React.FC<BrutalBoxProps> = ({
  children,
  style,
  contentStyle,
  backgroundColor = tokens.colors.paper,
  borderColor = tokens.colors.ink,
  borderWidth = tokens.shape.stroke,
  hasShadow = false,
  shadowOffset = tokens.shape.shadow,
  pressable = false,
  disabled = false,
  onPress,
  onPressIn,
  onPressOut,
  accessibilityLabel,
}) => {
  const pressAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    if (disabled || !pressable) return;
    Animated.timing(pressAnim, {
      toValue: shadowOffset,
      duration: tokens.motion.pressDuration,
      useNativeDriver: true,
    }).start();
    onPressIn?.();
  };

  const handlePressOut = () => {
    if (disabled || !pressable) return;
    Animated.timing(pressAnim, {
      toValue: 0,
      duration: tokens.motion.pressDuration,
      useNativeDriver: true,
    }).start();
    onPressOut?.();
  };

  const effectiveOffset = hasShadow && !disabled ? shadowOffset : 0;

  const foregroundStyle: StyleProp<ViewStyle> = [
    styles.foreground,
    {
      backgroundColor: disabled ? tokens.colors.cream : backgroundColor,
      borderColor: disabled ? tokens.colors.grey : borderColor,
      borderWidth,
      borderStyle: disabled ? 'dashed' : 'solid',
    },
    pressable && hasShadow && !disabled
      ? {
          transform: [
            { translateX: pressAnim },
            { translateY: pressAnim },
          ],
        }
      : null,
    contentStyle,
  ];

  if (!hasShadow || disabled) {
    if (pressable) {
      return (
        <Pressable
          onPress={disabled ? undefined : onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityLabel={accessibilityLabel}
          disabled={disabled}
          style={style}
        >
          <Animated.View style={foregroundStyle}>{children}</Animated.View>
        </Pressable>
      );
    }
    return (
      <View style={[style, foregroundStyle]} accessibilityLabel={accessibilityLabel}>
        {children}
      </View>
    );
  }

  // With hard offset shadow
  return (
    <View
      style={[
        styles.container,
        {
          paddingRight: effectiveOffset,
          paddingBottom: effectiveOffset,
        },
        style,
      ]}
    >
      {/* Hard offset black shadow behind element */}
      <View
        style={[
          styles.shadow,
          {
            top: effectiveOffset,
            left: effectiveOffset,
            backgroundColor: tokens.colors.ink,
          },
        ]}
        pointerEvents="none"
      />

      {pressable ? (
        <Pressable
          onPress={disabled ? undefined : onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityLabel={accessibilityLabel}
          disabled={disabled}
          style={styles.fullWidth}
        >
          <Animated.View style={foregroundStyle}>{children}</Animated.View>
        </Pressable>
      ) : (
        <Animated.View style={foregroundStyle}>{children}</Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  foreground: {
    borderRadius: 0,
  },
  shadow: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderRadius: 0,
  },
  fullWidth: {
    width: '100%',
  },
});
