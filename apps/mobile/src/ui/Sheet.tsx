import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { tokens } from '@imposter/shared';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  maxHeight?: number | string;
}

export const Sheet: React.FC<SheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  contentStyle,
  maxHeight = '85%',
}) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 20);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Scrim: ink at 50% opacity */}
        <Pressable
          style={styles.scrim}
          onPress={onClose}
          accessibilityLabel="Close sheet"
        />

        {/* Bottom Sheet Box */}
        <View
          style={[
            styles.sheetContainer,
            { maxHeight: maxHeight as any, paddingBottom: bottomPadding },
          ]}
        >
          {/* Grab Bar: 4pt ink bar */}
          <View style={styles.grabBarContainer}>
            <View style={styles.grabBar} />
          </View>

          {/* Header */}
          {(title || subtitle) && (
            <View style={styles.header}>
              <View style={styles.titleWrapper}>
                {title && <Text style={styles.title}>{title.toUpperCase()}</Text>}
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>

              <Pressable
                onPress={onClose}
                style={styles.closeButton}
                accessibilityLabel="Close modal"
              >
                <FontAwesome5 name="times" size={18} color={tokens.colors.ink} solid />
              </Pressable>
            </View>
          )}

          {/* Content */}
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFill as any,
    backgroundColor: 'rgba(17, 17, 17, 0.5)',
  },
  sheetContainer: {
    backgroundColor: tokens.colors.cream,
    borderTopWidth: tokens.shape.stroke,
    borderLeftWidth: tokens.shape.stroke,
    borderRightWidth: tokens.shape.stroke,
    borderColor: tokens.colors.ink,
    borderRadius: 0,
    width: '100%',
  },
  grabBarContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  grabBar: {
    width: 48,
    height: 4,
    backgroundColor: tokens.colors.ink,
    borderRadius: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: tokens.shape.strokeThin,
    borderBottomColor: tokens.colors.ink,
  },
  titleWrapper: {
    flex: 1,
  },
  title: {
    fontFamily: tokens.typography.fonts.display,
    fontSize: tokens.typography.styles.h2.fontSize,
    lineHeight: tokens.typography.styles.h2.lineHeight,
    color: tokens.colors.ink,
  },
  subtitle: {
    fontFamily: tokens.typography.fonts.body,
    fontSize: 14,
    color: tokens.colors.ink,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderWidth: tokens.shape.strokeThin,
    borderColor: tokens.colors.ink,
    backgroundColor: tokens.colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    borderRadius: 0,
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
});
