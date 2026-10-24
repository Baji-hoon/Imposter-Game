import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { useTheme } from '../theme/ThemeContext';

export const ReconnectingPill: React.FC = () => {
  const status = useGameStore((s) => s.status);
  const leaveGame = useGameStore((s) => s.leaveGame);
  const { theme } = useTheme();

  if (status === 'open') {
    return null;
  }

  const isReconnecting = status === 'reconnecting';
  const label = isReconnecting ? 'Reconnecting…' : 'Connecting to host…';

  return (
    <View style={styles.outerContainer} pointerEvents="box-none">
      <View
        style={[
          styles.pill,
          {
            backgroundColor: isReconnecting ? '#B45309' : '#0369A1', // Amber/Blue
            borderColor: isReconnecting ? '#FBBF24' : '#38BDF8',
          },
        ]}
      >
        <ActivityIndicator size="small" color="#FFFFFF" style={styles.spinner} />
        <Text style={styles.text}>{label}</Text>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => leaveGame()}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelBtnText}>✕ Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  spinner: {
    marginRight: 8,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelBtn: {
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
