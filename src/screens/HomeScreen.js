import React, { useMemo, useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CATEGORIES, WALLPAPERS } from '../data/wallpapers';

function WallpaperCard({ item, width, onPress }) {
  return (
    <Pressable onPress={() => onPress(item.uri)} style={({ pressed }) => [styles.card, { width, opacity: pressed ? 0.82 : 1 }]}>
      <Image source={{ uri: item.uri }} style={styles.image} />
    </Pressable>
  );
}

export default function HomeScreen({ onOpenEditor, theme }) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const { width } = useWindowDimensions();
  const gap = 10;
  const side = 16;
  const cardWidth = (width - side * 2 - gap * 2) / 3;

  const wallpapers = useMemo(
    () => WALLPAPERS.filter((item) => item.category === category),
    [category],
  );

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      onOpenEditor(result.assets[0].uri);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.logo, { color: theme.onSurface }]}>Zharph</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {CATEGORIES.map((name) => {
          const selected = name === category;
          return (
            <Pressable key={name} onPress={() => setCategory(name)} style={[styles.tab, { backgroundColor: selected ? theme.primary : theme.surface }]}>
              <Text style={[styles.tabText, { color: selected ? theme.onPrimary : theme.onSurfaceVariant }]}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
        <Pressable
          onPress={pickImage}
          style={({ pressed }) => [
            styles.card,
            styles.addCard,
            { width: cardWidth, backgroundColor: theme.surfaceHigh, opacity: pressed ? 0.78 : 1 },
          ]}
        >
          <View style={[styles.addCircle, { backgroundColor: theme.primary }]}>
            <MaterialCommunityIcons name="plus" size={30} color={theme.onPrimary} />
          </View>
          <Text style={[styles.addText, { color: theme.onSurface }]}>Your photo</Text>
        </Pressable>

        {wallpapers.map((item) => (
          <WallpaperCard key={item.id} item={item} width={cardWidth} onPress={onOpenEditor} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { height: 82, justifyContent: 'flex-end', paddingHorizontal: 20, paddingBottom: 14 },
  logo: { fontSize: 29, fontWeight: '700', letterSpacing: -0.8 },
  tabs: { paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  tab: { height: 40, paddingHorizontal: 17, borderRadius: 20, justifyContent: 'center' },
  tabText: { fontSize: 14, fontWeight: '600' },
  grid: { paddingHorizontal: 16, paddingBottom: 112, gap: 10, flexDirection: 'row', flexWrap: 'wrap' },
  card: { height: 184, borderRadius: 22, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  addCard: { alignItems: 'center', justifyContent: 'center' },
  addCircle: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  addText: { fontSize: 13, fontWeight: '600' },
});
