import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');
const GAP = 10;
const HORIZONTAL_PADDING = 16;
const CARD_SIZE = (width - HORIZONTAL_PADDING * 2 - GAP * 2) / 3;

const TABS = ['Featured', 'Nature', 'Cities', 'Minimal'];

const DEFAULT_WALLPAPERS = [
  { id: '1', title: 'Aurora', colors: ['#23354D', '#101A2B'], icon: '✦' },
  { id: '2', title: 'Mountain', colors: ['#52677C', '#1D2935'], icon: '⌁' },
  { id: '3', title: 'Moon', colors: ['#3A3A46', '#121218'], icon: '☾' },
  { id: '4', title: 'Ocean', colors: ['#245B6C', '#102B38'], icon: '≈' },
  { id: '5', title: 'Dusk', colors: ['#684F63', '#211B2A'], icon: '◐' },
  { id: '6', title: 'Mist', colors: ['#69737A', '#252B30'], icon: '◌' },
  { id: '7', title: 'Desert', colors: ['#80674D', '#30251D'], icon: '◇' },
  { id: '8', title: 'Forest', colors: ['#3B5948', '#14231C'], icon: '♧' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [selectedWallpaper, setSelectedWallpaper] = useState(null);
  const [imageUri, setImageUri] = useState(null);

  async function pickWallpaper() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setImageUri(result.assets[0].uri);
      setSelectedWallpaper({ id: 'custom', title: 'My photo', custom: true });
    }
  }

  function openDefaultWallpaper(wallpaper) {
    setImageUri(null);
    setSelectedWallpaper(wallpaper);
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#151518', '#0C0C0E', '#070708']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>ZHARPH</Text>
            <Text style={styles.title}>Give your wallpaper{'
'}some depth.</Text>
            <Text style={styles.description}>
              Choose a wallpaper and turn it into a layered lock-screen experience.
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabs}
          >
            {TABS.map((tab) => {
              const active = tab === activeTab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tab, active && styles.tabActive]}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {tab}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.grid}>
            <Pressable style={styles.addCard} onPress={pickWallpaper}>
              <BlurView intensity={24} tint="dark" style={styles.addBlur}>
                <View style={styles.plusCircle}>
                  <Text style={styles.plus}>＋</Text>
                </View>
                <Text style={styles.addTitle}>Your photo</Text>
                <Text style={styles.addCaption}>Choose from gallery</Text>
              </BlurView>
            </Pressable>

            {DEFAULT_WALLPAPERS.map((wallpaper) => (
              <Pressable
                key={wallpaper.id}
                onPress={() => openDefaultWallpaper(wallpaper)}
                style={styles.card}
              >
                <LinearGradient colors={wallpaper.colors} style={styles.cardImage}>
                  <View style={styles.art}>
                    <Text style={styles.artIcon}>{wallpaper.icon}</Text>
                  </View>
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.60)']}
                    style={styles.cardShade}
                  />
                  <Text style={styles.cardTitle}>{wallpaper.title}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <BlurView intensity={42} tint="dark" style={styles.bottomNav}>
          <NavButton icon="⌂" label="Home" active />
          <NavButton icon="✦" label="Depth" />
          <NavButton icon="♡" label="Saved" />
          <NavButton icon="⚙" label="Settings" />
        </BlurView>
      </SafeAreaView>

      {selectedWallpaper && (
        <EditorScreen
          imageUri={imageUri}
          wallpaper={selectedWallpaper}
          onClose={() => {
            setSelectedWallpaper(null);
            setImageUri(null);
          }}
        />
      )}
    </View>
  );
}

function NavButton({ icon, label, active }) {
  return (
    <Pressable style={styles.navButton}>
      <Text style={[styles.navIcon, active && styles.navIconActive]}>{icon}</Text>
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function EditorScreen({ imageUri, wallpaper, onClose }) {
  return (
    <View style={styles.editorOverlay}>
      <LinearGradient
        colors={['#17171A', '#09090A']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.editorSafe}>
        <View style={styles.editorHeader}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>‹</Text>
          </Pressable>
          <Text style={styles.editorTitle}>Edit wallpaper</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.editorPreviewWrap}>
          <View style={styles.editorPreview}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.editorImage} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={wallpaper.colors}
                style={styles.editorImage}
              >
                <Text style={styles.editorArt}>{wallpaper.icon}</Text>
              </LinearGradient>
            )}

            <LinearGradient
              pointerEvents="none"
              colors={['rgba(0,0,0,0.20)', 'transparent', 'rgba(0,0,0,0.48)']}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.editorClock}>
              <Text style={styles.editorTime}>10:42</Text>
              <Text style={styles.editorDate}>Monday, October 5</Text>
            </View>
          </View>
        </View>

        <BlurView intensity={40} tint="dark" style={styles.editorControls}>
          <Text style={styles.controlsTitle}>Depth</Text>
          <Text style={styles.controlsCaption}>
            These controls only appear after you choose a wallpaper.
          </Text>

          <View style={styles.controlRow}>
            <ControlChip icon="✦" label="Depth" active />
            <ControlChip icon="⌁" label="Position" />
            <ControlChip icon="◒" label="Clock" />
          </View>

          <Pressable style={styles.applyButton}>
            <LinearGradient colors={['#FFFFFF', '#DCDCDC']} style={styles.applyGradient}>
              <Text style={styles.applyText}>Continue</Text>
            </LinearGradient>
          </Pressable>
        </BlurView>
      </SafeAreaView>
    </View>
  );
}

function ControlChip({ icon, label, active }) {
  return (
    <Pressable style={[styles.controlChip, active && styles.controlChipActive]}>
      <Text style={styles.controlIcon}>{icon}</Text>
      <Text style={styles.controlLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080809' },
  safe: { flex: 1 },
  content: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 18,
    paddingBottom: 110,
  },
  hero: {
    paddingHorizontal: 3,
    paddingTop: 8,
    paddingBottom: 22,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.2,
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -1.2,
  },
  description: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
    maxWidth: 330,
  },
  tabs: { gap: 8, paddingBottom: 18 },
  tab: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.20)',
  },
  tabText: { color: 'rgba(255,255,255,0.48)', fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE * 1.34,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: '#151517',
  },
  cardImage: { flex: 1, justifyContent: 'flex-end', overflow: 'hidden' },
  cardShade: { ...StyleSheet.absoluteFillObject },
  art: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  artIcon: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 42,
    fontWeight: '300',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '650',
    padding: 11,
    zIndex: 2,
  },
  addCard: {
    width: CARD_SIZE,
    height: CARD_SIZE * 1.34,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
  addBlur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  plusCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  plus: { color: '#FFFFFF', fontSize: 29, fontWeight: '300', marginTop: -2 },
  addTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '650', marginTop: 10 },
  addCaption: {
    color: 'rgba(255,255,255,0.40)',
    fontSize: 9,
    marginTop: 4,
    textAlign: 'center',
  },
  bottomNav: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
    height: 68,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    backgroundColor: 'rgba(255,255,255,0.075)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  navIcon: { color: 'rgba(255,255,255,0.42)', fontSize: 20 },
  navIconActive: { color: '#FFFFFF' },
  navLabel: { color: 'rgba(255,255,255,0.40)', fontSize: 9, fontWeight: '600' },
  navLabelActive: { color: '#FFFFFF' },
  editorOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: '#09090A',
  },
  editorSafe: { flex: 1, paddingHorizontal: 16 },
  editorHeader: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  closeText: { color: '#FFFFFF', fontSize: 32, lineHeight: 34, fontWeight: '200', marginTop: -4 },
  editorTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  headerSpacer: { width: 40 },
  editorPreviewWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  editorPreview: {
    width: width - 48,
    height: Math.min(width * 1.35, 560),
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: '#18181A',
  },
  editorImage: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  editorArt: { color: 'rgba(255,255,255,0.58)', fontSize: 80 },
  editorClock: {
    position: 'absolute',
    top: 38,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  editorTime: {
    color: '#FFFFFF',
    fontSize: 65,
    lineHeight: 70,
    fontWeight: '300',
    letterSpacing: -3,
  },
  editorDate: {
    color: 'rgba(255,255,255,0.90)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 3,
  },
  editorControls: {
    borderRadius: 27,
    overflow: 'hidden',
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  controlsTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  controlsCaption: {
    color: 'rgba(255,255,255,0.44)',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  controlRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  controlChip: {
    flex: 1,
    minHeight: 54,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  controlChipActive: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.20)',
  },
  controlIcon: { color: '#FFFFFF', fontSize: 17 },
  controlLabel: {
    color: 'rgba(255,255,255,0.60)',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 3,
  },
  applyButton: {
    height: 48,
    borderRadius: 17,
    overflow: 'hidden',
    marginTop: 10,
  },
  applyGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  applyText: { color: '#101012', fontSize: 13, fontWeight: '750' },
});
