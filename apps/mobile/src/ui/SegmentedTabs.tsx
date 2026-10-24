import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { tokens } from '@imposter/shared';

export interface TabOption<T extends string = string> {
  key: T;
  label: string;
}

export interface SegmentedTabsProps<T extends string = string> {
  options: TabOption<T>[];
  selectedKey: T;
  onSelect: (key: T) => void;
  style?: StyleProp<ViewStyle>;
}

export const SegmentedTabs = <T extends string = string>({
  options,
  selectedKey,
  onSelect,
  style,
}: SegmentedTabsProps<T>) => {
  return (
    <View style={[styles.container, style]}>
      {options.map((option, index) => {
        const isSelected = option.key === selectedKey;
        const isLast = index === options.length - 1;

        return (
          <Pressable
            key={option.key}
            onPress={() => onSelect(option.key)}
            style={[
              styles.tab,
              isSelected ? styles.selectedTab : styles.unselectedTab,
              !isLast && styles.tabDivider,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
          >
            <Text
              style={[
                styles.tabText,
                isSelected ? styles.selectedTabText : styles.unselectedTabText,
              ]}
              numberOfLines={1}
            >
              {option.label.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
    borderWidth: tokens.shape.stroke,
    borderColor: tokens.colors.ink,
    borderRadius: 0,
    backgroundColor: tokens.colors.paper,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  tabDivider: {
    borderRightWidth: tokens.shape.stroke,
    borderRightColor: tokens.colors.ink,
  },
  unselectedTab: {
    backgroundColor: tokens.colors.paper,
  },
  selectedTab: {
    backgroundColor: tokens.colors.ink,
  },
  tabText: {
    fontFamily: tokens.typography.fonts.bodyBlack,
    fontSize: tokens.typography.styles.label.fontSize,
    letterSpacing: 1,
    textAlign: 'center',
  },
  unselectedTabText: {
    color: tokens.colors.ink,
  },
  selectedTabText: {
    color: tokens.colors.cream,
  },
});
