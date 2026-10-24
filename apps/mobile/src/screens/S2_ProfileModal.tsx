import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { tokens } from '@imposter/shared';
import { useProfileStore, AVATAR_OPTIONS } from '../store/profileStore';
import { Sheet, BrutalInput, AvatarTile, BrutalButton } from '../ui';

interface S2ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export const S2_ProfileModal: React.FC<S2ProfileModalProps> = ({
  visible,
  onClose,
}) => {
  const { name, avatar, setName, setAvatar } = useProfileStore();
  const [localName, setLocalName] = useState(name || 'Player');

  useEffect(() => {
    if (visible) {
      setLocalName(name || 'Player');
    }
  }, [visible, name]);

  const handleSave = () => {
    const trimmed = localName.trim();
    setName(trimmed || 'Player');
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={handleSave}
      title="YOUR PROFILE"
      subtitle="Pick your avatar and enter your display name"
    >
      <View style={styles.container}>
        {/* Display Name Input */}
        <BrutalInput
          label="DISPLAY NAME"
          value={localName}
          onChangeText={setLocalName}
          placeholder="Enter your name..."
          maxLength={20}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />

        {/* Avatar Selection Header */}
        <View style={styles.avatarHeader}>
          <Text style={styles.sectionLabel}>CHOOSE AVATAR</Text>
        </View>

        {/* 5-Column Grid of Avatar Tiles */}
        <View style={styles.avatarGrid}>
          {AVATAR_OPTIONS.map((item) => {
            const isSelected = item === avatar;
            return (
              <View key={item} style={styles.avatarWrapper}>
                <AvatarTile
                  name=""
                  avatar={item}
                  size="mini"
                  selected={isSelected}
                  tag={isSelected ? 'YOU' : undefined}
                  onPress={() => setAvatar(item)}
                />
              </View>
            );
          })}
        </View>

        {/* Save Button */}
        <BrutalButton
          title="SAVE PROFILE"
          variant="primary"
          onPress={handleSave}
          style={styles.saveButton}
        />
      </View>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  avatarHeader: {
    marginTop: 8,
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: tokens.typography.styles.label.fontSize,
    lineHeight: tokens.typography.styles.label.lineHeight,
    letterSpacing: tokens.typography.styles.label.letterSpacing,
    color: tokens.colors.ink,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  avatarWrapper: {
    width: '18%', // 5-column layout
    alignItems: 'center',
    marginBottom: 8,
  },
  saveButton: {
    marginTop: 24,
  },
});
