import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { tokens } from '@imposter/shared';

export interface BrutalInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  rightElement?: React.ReactNode;
}

export const BrutalInput: React.FC<BrutalInputProps> = ({
  label,
  error,
  containerStyle,
  inputStyle,
  rightElement,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label.toUpperCase()}</Text>}

      <View
        style={[
          styles.inputContainer,
          error ? styles.inputError : null,
        ]}
      >
        <TextInput
          {...props}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={tokens.colors.grey}
          style={[styles.input, inputStyle]}
        />
        {rightElement && <View style={styles.rightElement}>{rightElement}</View>}

        {/* 4pt Yellow focus bar when focused */}
        {isFocused && <View style={styles.focusBar} />}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: tokens.typography.styles.label.fontSize,
    lineHeight: tokens.typography.styles.label.lineHeight,
    letterSpacing: tokens.typography.styles.label.letterSpacing,
    color: tokens.colors.ink,
    marginBottom: 6,
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.paper,
    borderWidth: tokens.shape.stroke,
    borderColor: tokens.colors.ink,
    borderRadius: 0,
    minHeight: tokens.shape.tap,
  },
  inputError: {
    borderColor: tokens.colors.red,
  },
  input: {
    flex: 1,
    height: '100%',
    minHeight: tokens.shape.tap,
    paddingHorizontal: 16,
    fontFamily: tokens.typography.fonts.body,
    fontSize: tokens.typography.styles.body.fontSize,
    color: tokens.colors.ink,
  },
  rightElement: {
    paddingRight: 12,
  },
  focusBar: {
    position: 'absolute',
    bottom: -tokens.shape.stroke,
    left: -tokens.shape.stroke,
    right: -tokens.shape.stroke,
    height: 4,
    backgroundColor: tokens.colors.yellow,
  },
  errorText: {
    fontFamily: tokens.typography.fonts.body,
    fontSize: 12,
    color: tokens.colors.red,
    marginTop: 4,
  },
});
