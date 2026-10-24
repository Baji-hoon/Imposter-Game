import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>MONOREPO NOTICE</Text>
        </View>
        <Text style={styles.title}>IMPOSTER</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚠️ Started from Root Directory</Text>
          <Text style={styles.cardDesc}>
            Expo bundler was started from the monorepo root directory instead of the mobile workspace.
          </Text>
          <Text style={styles.sectionHeader}>To run the game properly:</Text>
          <Text style={styles.stepText}>1. In your terminal, stop the server (Ctrl + C)</Text>
          <Text style={styles.stepText}>2. Run either of these commands:</Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>npm start</Text>
          </View>
          <Text style={styles.orText}>— or —</Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>cd apps/mobile</Text>
            <Text style={styles.codeText}>npx expo start</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  badge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeText: {
    color: '#fb923c',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#38bdf8',
    letterSpacing: 3,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#151d2f',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f87171',
    marginBottom: 10,
    textAlign: 'center',
  },
  cardDesc: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  stepText: {
    fontSize: 13,
    color: '#cbd5e1',
    marginBottom: 6,
  },
  codeBlock: {
    backgroundColor: '#0b0f19',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginVertical: 4,
  },
  codeText: {
    fontFamily: 'monospace',
    color: '#34d399',
    fontSize: 14,
    fontWeight: '700',
  },
  orText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    marginVertical: 4,
  },
});
