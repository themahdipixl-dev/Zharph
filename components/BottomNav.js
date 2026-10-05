import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ITEMS = [
  ['home-variant-outline', 'Home'],
  ['heart-outline', 'Saved'],
  ['palette-outline', 'Styles'],
  ['cog-outline', 'Settings'],
];

export default function BottomNav({ active, onChange, theme }) {
  return (
    <View style={[styles.bar, { backgroundColor: theme.surface }]}>
      {ITEMS.map(([icon, label]) => {
        const selected = active === label;
        return (
          <Pressable key={label} onPress={() => onChange(label)} style={styles.item}>
            <View
              style={[
                styles.iconPill,
                { backgroundColor: selected ? theme.primaryContainer : 'transparent' },
              ]}
            >
              <MaterialCommunityIcons
                name={icon}
                size={22}
                color={selected ? theme.primary : theme.onSurfaceVariant}
              />
            </View>
            <Text style={[styles.label, { color: selected ? theme.onSurface : theme.onSurfaceVariant }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    height: 74,
    borderRadius: 28,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  item: {
    minWidth: 68,
    alignItems: 'center',
  },
  iconPill: {
    width: 52,
    height: 32,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  label: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
  },
});
