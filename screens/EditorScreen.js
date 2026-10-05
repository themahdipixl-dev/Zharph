import React, { useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const TOOLS = [
  ['layers-outline', 'Depth'],
  ['blur', 'Blur'],
  ['crop', 'Crop'],
  ['tune-variant', 'Adjust'],
];

export default function EditorScreen({ imageUri, onBack, theme }) {
  const [activeTool, setActiveTool] = useState('Depth');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.button}>
          <MaterialCommunityIcons name="arrow-left" size={25} color={theme.onSurface} />
        </Pressable>
        <Text style={[styles.title, { color: theme.onSurface }]}>Edit wallpaper</Text>
        <Pressable style={styles.button}>
          <MaterialCommunityIcons name="check" size={25} color={theme.primary} />
        </Pressable>
      </View>

      <View style={styles.previewArea}>
        <View style={[styles.preview, { backgroundColor: theme.surface }]}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
          <View style={styles.lockScreen}>
            <Text style={styles.clock}>09:41</Text>
            <Text style={styles.date}>Monday, October 5</Text>
          </View>
        </View>
      </View>

      <View style={styles.toolsArea}>
        <Text style={[styles.heading, { color: theme.onSurface }]}>Customize</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tools}>
          {TOOLS.map(([icon, label]) => {
            const selected = activeTool === label;
            return (
              <Pressable key={label} onPress={() => setActiveTool(label)} style={styles.tool}>
                <View style={[styles.toolIcon, { backgroundColor: selected ? theme.primary : theme.surface }]}>
                  <MaterialCommunityIcons name={icon} size={23} color={selected ? theme.onPrimary : theme.onSurfaceVariant} />
                </View>
                <Text style={[styles.toolLabel, { color: selected ? theme.primary : theme.onSurfaceVariant }]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingTop: 28,
  },
  header: { height: 66, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  button: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontWeight: '700' },
  previewArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  preview: { width: '100%', maxWidth: 360, aspectRatio: 9 / 16, borderRadius: 34, overflow: 'hidden', elevation: 10, shadowOpacity: 0.2, shadowRadius: 22, shadowOffset: { width: 0, height: 12 } },
  previewImage: { width: '100%', height: '100%' },
  lockScreen: { position: 'absolute', top: 42, left: 0, right: 0, alignItems: 'center' },
  clock: { color: '#fff', fontSize: 52, fontWeight: '300', letterSpacing: -2 },
  date: { color: '#fff', fontSize: 14, fontWeight: '500', marginTop: 2 },
  toolsArea: { paddingTop: 12, paddingBottom: 22 },
  heading: { paddingHorizontal: 20, fontSize: 17, fontWeight: '700', marginBottom: 10 },
  tools: { paddingHorizontal: 18, gap: 14 },
  tool: { width: 68, alignItems: 'center' },
  toolIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  toolLabel: { fontSize: 11, fontWeight: '600', marginTop: 6 },
});
