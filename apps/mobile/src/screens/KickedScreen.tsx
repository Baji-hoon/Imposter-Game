import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface KickedScreenProps {
  onDismiss: () => void;
}

export const KickedScreen: React.FC<KickedScreenProps> = ({ onDismiss }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.danger,
          },
        ]}
      >
        <Text style={styles.icon}>🚫</Text>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Removed from Game
        </Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          You have been removed from this room by the host.
        </Text>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={onDismiss}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.buttonText,
              { color: theme.colors.primaryText },
            ]}
          >
            Return to Home
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    padding: 32,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    gap: 16,
  },
  icon: {
    fontSize: 54,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    minHeight: 56,
    width: '100%',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '800',
  },
});
