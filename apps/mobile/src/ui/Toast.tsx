import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { tokens } from '@imposter/shared';
import { Stripe } from './Stripe';

export interface ToastProps {
  message?: string;
  visible?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Toast: React.FC<ToastProps> = ({
  message = 'RECONNECTING...',
  visible = true,
  style,
}) => {
  if (!visible) return null;

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <View style={styles.toastBox}>
        {/* Hazard stripe accent strip */}
        <View style={styles.stripeWrapper}>
          <Stripe height={8} stripeColor={tokens.colors.ink} backgroundColor={tokens.colors.yellow} />
        </View>

        <View style={styles.textRow}>
          <View style={styles.dot} />
          <Text style={styles.messageText}>{message.toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastBox: {
    backgroundColor: tokens.colors.yellow,
    borderWidth: tokens.shape.stroke,
    borderColor: tokens.colors.ink,
    borderRadius: 0,
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
  },
  stripeWrapper: {
    width: '100%',
    height: 8,
    borderBottomWidth: tokens.shape.strokeThin,
    borderBottomColor: tokens.colors.ink,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    backgroundColor: tokens.colors.ink,
    borderRadius: 0,
  },
  messageText: {
    fontFamily: tokens.typography.fonts.bodyBlack,
    fontSize: tokens.typography.styles.label.fontSize,
    letterSpacing: 1,
    color: tokens.colors.ink,
  },
});
