import React, { useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { tokens } from '@imposter/shared';

export interface AvatarTileProps {
  name: string;
  avatar: string;
  selected?: boolean;
  tag?: string;             // e.g. "VOTE", "HOST", "YOU"
  isSelf?: boolean;         // Hatched diagonal lines
  disabled?: boolean;
  size?: 'normal' | 'mini'; // normal (80x80 or responsive) or mini (48x48)
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const AvatarTile: React.FC<AvatarTileProps> = ({
  name,
  avatar,
  selected = false,
  tag,
  isSelf = false,
  disabled = false,
  size = 'normal',
  onPress,
  style,
}) => {
  const isMini = size === 'mini';
  const shadowOffset = tokens.shape.shadow;
  const pressAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    if (disabled || isSelf) return;
    Animated.timing(pressAnim, {
      toValue: selected ? shadowOffset : 2,
      duration: tokens.motion.pressDuration,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || isSelf) return;
    Animated.timing(pressAnim, {
      toValue: 0,
      duration: tokens.motion.pressDuration,
      useNativeDriver: true,
    }).start();
  };

  const content = (
    <Animated.View
      style={[
        styles.tile,
        isMini ? styles.miniTile : styles.normalTile,
        selected ? styles.selectedTile : styles.defaultTile,
        (disabled && !isSelf) ? styles.disabledTile : null,
        {
          transform: [
            { translateX: pressAnim },
            { translateY: pressAnim },
          ],
        },
      ]}
    >
      {/* Hatch pattern for isSelf / disabled-self */}
      {isSelf && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Line x1="0" y1="20" x2="20" y2="0" stroke={tokens.colors.ink} strokeWidth="2" />
            <Line x1="0" y1="40" x2="40" y2="0" stroke={tokens.colors.ink} strokeWidth="2" />
            <Line x1="0" y1="60" x2="60" y2="0" stroke={tokens.colors.ink} strokeWidth="2" />
            <Line x1="0" y1="80" x2="80" y2="0" stroke={tokens.colors.ink} strokeWidth="2" />
            <Line x1="20" y1="80" x2="80" y2="20" stroke={tokens.colors.ink} strokeWidth="2" />
            <Line x1="40" y1="80" x2="80" y2="40" stroke={tokens.colors.ink} strokeWidth="2" />
            <Line x1="60" y1="80" x2="80" y2="60" stroke={tokens.colors.ink} strokeWidth="2" />
          </Svg>
        </View>
      )}

      {/* Top Tag e.g. "VOTE", "HOST", "YOU" */}
      {(tag || isSelf) && (
        <View
          style={[
            styles.tag,
            tag === 'HOST' ? styles.hostTag : styles.defaultTag,
          ]}
        >
          <Text style={styles.tagText}>
            {(tag || (isSelf ? 'YOU' : '')).toUpperCase()}
          </Text>
        </View>
      )}

      {/* Emoji Avatar */}
      <Text style={isMini ? styles.miniAvatarEmoji : styles.avatarEmoji}>
        {avatar}
      </Text>

      {/* Name below in label style */}
      {!isMini && (
        <Text style={styles.nameText} numberOfLines={1}>
          {name.toUpperCase()}
        </Text>
      )}
    </Animated.View>
  );

  // If selected, show hard offset shadow
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
          disabled={disabled || isSelf}
        >
          {content}
        </Pressable>
      </View>
    );
  }

  if (onPress && !disabled && !isSelf) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={style}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={style}>{content}</View>;
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
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: tokens.shape.stroke,
    borderColor: tokens.colors.ink,
    borderRadius: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  normalTile: {
    width: 84,
    height: 84,
    padding: 4,
  },
  miniTile: {
    width: 48,
    height: 48,
    padding: 2,
  },
  defaultTile: {
    backgroundColor: tokens.colors.paper,
  },
  selectedTile: {
    backgroundColor: tokens.colors.yellow,
  },
  disabledTile: {
    backgroundColor: tokens.colors.cream,
    borderColor: tokens.colors.grey,
  },
  tag: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderBottomLeftRadius: 0,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: tokens.colors.ink,
    zIndex: 2,
  },
  defaultTag: {
    backgroundColor: tokens.colors.ink,
  },
  hostTag: {
    backgroundColor: tokens.colors.orange,
  },
  tagText: {
    fontFamily: tokens.typography.fonts.bodyBlack,
    fontSize: 9,
    letterSpacing: 0.5,
    color: tokens.colors.cream,
  },
  avatarEmoji: {
    fontSize: 32,
    textAlign: 'center',
  },
  miniAvatarEmoji: {
    fontSize: 22,
    textAlign: 'center',
  },
  nameText: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: tokens.colors.ink,
    textAlign: 'center',
    marginTop: 2,
  },
});
