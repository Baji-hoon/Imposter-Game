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
import { tokens } from '@imposter/shared';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  style,
  textStyle,
  disabled = false,
}) => {
  const shadowOffset = tokens.shape.shadow;
  const pressAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.timing(pressAnim, {
      toValue: selected ? shadowOffset : 2,
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

  if (selected && !disabled) {
    return (
      <View
        style={[
          styles.shadowContainer,
          {
            paddingRight: shadowOffset,
            paddingBottom: shadowOffset,
          },
          style,
        ]}
      >
        {/* Hard offset black shadow */}
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

        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: true }}
        >
          <Animated.View
            style={[
              styles.chip,
              styles.selectedChip,
              {
                transform: [
                  { translateX: pressAnim },
                  { translateY: pressAnim },
                ],
              },
            ]}
          >
            <Text style={[styles.selectedLabel, { flexShrink: 0 }, textStyle]} numberOfLines={1}>
              {label.toUpperCase()}
            </Text>
          </Animated.View>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: false }}
    >
      <Animated.View
        style={[
          styles.chip,
          styles.unselectedChip,
          disabled && styles.disabledChip,
          {
            transform: [
              { translateX: pressAnim },
              { translateY: pressAnim },
            ],
          },
          style,
        ]}
      >
        <Text
          style={[
            styles.unselectedLabel,
            disabled && styles.disabledLabel,
            { flexShrink: 0 },
            textStyle,
          ]}
          numberOfLines={1}
        >
          {label.toUpperCase()}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  shadowContainer: {
    position: 'relative',
  },
  shadow: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderRadius: 0,
  },
  chip: {
    height: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: tokens.shape.stroke,
    borderColor: tokens.colors.ink,
    borderRadius: 0,
  },
  unselectedChip: {
    backgroundColor: tokens.colors.paper,
  },
  selectedChip: {
    backgroundColor: tokens.colors.orange,
  },
  disabledChip: {
    backgroundColor: tokens.colors.cream,
    borderColor: tokens.colors.grey,
    borderStyle: 'dashed',
  },
  unselectedLabel: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: tokens.typography.styles.label.fontSize,
    lineHeight: tokens.typography.styles.label.lineHeight,
    letterSpacing: tokens.typography.styles.label.letterSpacing,
    color: tokens.colors.ink,
  },
  selectedLabel: {
    fontFamily: tokens.typography.fonts.bodyBlack,
    fontSize: tokens.typography.styles.label.fontSize,
    lineHeight: tokens.typography.styles.label.lineHeight,
    letterSpacing: tokens.typography.styles.label.letterSpacing,
    color: tokens.colors.ink,
  },
  disabledLabel: {
    color: tokens.colors.grey,
  },
});
