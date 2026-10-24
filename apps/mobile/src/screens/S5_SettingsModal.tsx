import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { tokens, Settings } from '@imposter/shared';
import { useGameStore } from '../store/gameStore';
import { Sheet, Chip, BrutalButton } from '../ui';

interface S5SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const S5_SettingsModal: React.FC<S5SettingsModalProps> = ({
  visible,
  onClose,
}) => {
  const stateSync = useGameStore((s) => s.stateSync);
  const setSettings = useGameStore((s) => s.setSettings);

  const currentSettings: Settings = stateSync?.settings || {
    rounds: 5,
    imposterCount: 1,
    blankImposter: 'sometimes',
    oneWordRound: 'sometimes',
    packs: ['everyday', 'animals', 'food', 'places', 'mixed'],
    difficulty: 'medium',
  };

  const [settings, setLocalSettings] = useState<Settings>(currentSettings);
  const playerCount = stateSync?.players.length || 0;

  const handleSave = () => {
    setSettings(settings);
    onClose();
  };

  const PACKS = [
    { id: 'everyday', title: 'Everyday Objects' },
    { id: 'animals', title: 'Animals' },
    { id: 'food', title: 'Food & Drinks' },
    { id: 'places', title: 'Places & Travel' },
    { id: 'mixed', title: 'Mixed Vault' },
  ];

  const togglePack = (packId: string) => {
    const exists = settings.packs.includes(packId);
    let newPacks: string[];
    if (exists) {
      if (settings.packs.length <= 1) return; // Must keep at least one
      newPacks = settings.packs.filter((p) => p !== packId);
    } else {
      newPacks = [...settings.packs, packId];
    }
    setLocalSettings({ ...settings, packs: newPacks });
  };

  return (
    <Sheet
      visible={visible}
      onClose={handleSave}
      title="GAME SETTINGS"
      subtitle="Customize rounds, roles, and modifiers"
      maxHeight="90%"
    >
      <View style={styles.sheetBody}>
        {/* Number of Rounds */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NUMBER OF ROUNDS</Text>
          <View style={styles.chipRow}>
            {[5, 8, 10, 0].map((r) => {
              const isSelected = settings.rounds === r;
              const label = r === 0 ? 'Endless' : `${r} Rounds`;
              return (
                <Chip
                  key={r}
                  label={label}
                  selected={isSelected}
                  onPress={() => setLocalSettings({ ...settings, rounds: r as any })}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Imposter Count */}
        <View style={styles.section}>
          <View style={styles.sectionTitleWithNote}>
            <Text style={styles.sectionLabel}>IMPOSTER COUNT</Text>
            {playerCount < 8 && (
              <Text style={styles.noteText}>(2 IMPOSTERS REQUIRES ≥8 PLAYERS)</Text>
            )}
          </View>
          <View style={styles.chipRow}>
            {[1, 2].map((count) => {
              const isSelected = settings.imposterCount === count;
              const disabled = count === 2 && playerCount < 8;
              return (
                <Chip
                  key={count}
                  label={count === 1 ? '1 Imposter' : '2 Imposters'}
                  selected={isSelected}
                  disabled={disabled}
                  onPress={() => {
                    if (!disabled) {
                      setLocalSettings({ ...settings, imposterCount: count as any });
                    }
                  }}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Blank Imposter Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BLANK IMPOSTER (NO WORD)</Text>
          <View style={styles.chipRow}>
            {(['off', 'sometimes', 'every'] as const).map((mode) => {
              const isSelected = settings.blankImposter === mode;
              const label =
                mode === 'off' ? 'Off' : mode === 'sometimes' ? 'Sometimes (25%)' : 'Every Round';
              return (
                <Chip
                  key={mode}
                  label={label}
                  selected={isSelected}
                  onPress={() => setLocalSettings({ ...settings, blankImposter: mode })}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />

        {/* One-Word Clue Round */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ONE-WORD CLUE ROUND</Text>
          <View style={styles.chipRow}>
            {(['off', 'sometimes', 'every'] as const).map((mode) => {
              const isSelected = settings.oneWordRound === mode;
              const label =
                mode === 'off' ? 'Off' : mode === 'sometimes' ? 'Sometimes (25%)' : 'Every Round';
              return (
                <Chip
                  key={mode}
                  label={label}
                  selected={isSelected}
                  onPress={() => setLocalSettings({ ...settings, oneWordRound: mode })}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Word Difficulty */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>WORD DIFFICULTY</Text>
          <View style={styles.chipRow}>
            {(['easy', 'medium', 'hard', 'mixed'] as const).map((diff) => {
              const isSelected = settings.difficulty === diff;
              return (
                <Chip
                  key={diff}
                  label={diff}
                  selected={isSelected}
                  onPress={() => setLocalSettings({ ...settings, difficulty: diff })}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Category Packs */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CATEGORY PACKS</Text>
          <View style={styles.chipRow}>
            {PACKS.map((pack) => {
              const isSelected = settings.packs.includes(pack.id);
              return (
                <Chip
                  key={pack.id}
                  label={pack.title}
                  selected={isSelected}
                  onPress={() => togglePack(pack.id)}
                />
              );
            })}
          </View>
        </View>

        {/* Sticky Apply Button */}
        <BrutalButton
          title="APPLY SETTINGS"
          variant="primary"
          onPress={handleSave}
          style={styles.applyButton}
        />
      </View>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  sheetBody: {
    paddingBottom: 24,
  },
  section: {
    marginVertical: 10,
  },
  sectionTitleWithNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  sectionLabel: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: tokens.typography.styles.label.fontSize,
    lineHeight: tokens.typography.styles.label.lineHeight,
    letterSpacing: tokens.typography.styles.label.letterSpacing,
    color: tokens.colors.ink,
    marginBottom: 8,
  },
  noteText: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: tokens.colors.ink,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  divider: {
    height: tokens.shape.strokeThin,
    backgroundColor: tokens.colors.ink,
    marginVertical: 14,
  },
  applyButton: {
    marginTop: 24,
  },
});
