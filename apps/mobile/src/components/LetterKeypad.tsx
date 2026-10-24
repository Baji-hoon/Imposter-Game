import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface LetterKeypadProps {
  onKeyPress: (char: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  disabled?: boolean;
}

const KEYPAD_ROWS = [
  ['A', 'B', 'C', 'D', 'E', 'F'],
  ['G', 'H', 'J', 'K', 'L', 'M'],
  ['N', 'P', 'Q', 'R', 'S', 'T'],
  ['U', 'V', 'W', 'X', 'Y', 'Z'],
];

export const LetterKeypad: React.FC<LetterKeypadProps> = ({
  onKeyPress,
  onBackspace,
  onClear,
  disabled = false,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {KEYPAD_ROWS.map((row, rIndex) => (
        <View key={rIndex} style={styles.row}>
          {row.map((char) => (
            <TouchableOpacity
              key={char}
              style={[
                styles.key,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => onKeyPress(char)}
              disabled={disabled}
              activeOpacity={0.65}
            >
              <Text
                style={[
                  styles.keyText,
                  {
                    color: theme.colors.text,
                    fontSize: theme.typography.size.lg,
                  },
                ]}
              >
                {char}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {/* Action Row */}
      <View style={styles.row}>
        <TouchableOpacity
          style={[
            styles.actionKey,
            {
              backgroundColor: theme.colors.surfaceSubtle,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={onClear}
          disabled={disabled}
          activeOpacity={0.65}
        >
          <Text
            style={[
              styles.actionKeyText,
              {
                color: theme.colors.textMuted,
                fontSize: theme.typography.size.sm,
              },
            ]}
          >
            CLEAR
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionKey,
            {
              backgroundColor: theme.colors.surfaceSubtle,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={onBackspace}
          disabled={disabled}
          activeOpacity={0.65}
        >
          <Text
            style={[
              styles.actionKeyText,
              {
                color: theme.colors.danger,
                fontSize: theme.typography.size.base,
              },
            ]}
          >
            ⌫ DELETE
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 8,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  key: {
    flex: 1,
    minHeight: 56, // >= 56 pt tap target per spec
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontWeight: '800',
  },
  actionKey: {
    flex: 1,
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionKeyText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
