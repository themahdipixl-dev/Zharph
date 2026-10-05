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
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const COLORS = {
  background: '#111318',
  surface: '#1B1B20',
  surfaceVariant: '#24242B',
  primary: '#BFC6FF',
  onPrimary: '#272D55',
  secondaryContainer: '#41465F',
  onSecondaryContainer: '#E1E3FF',
  onSurface: '#E5E1E9',
  onSurfaceVariant: '#C6C5CE',
  outline: '#46464F',
};

const PADDING = 20;
const GAP = 10;
const CARD_WIDTH = (width - PADDING * 2 - GAP * 2) / 3;

const TABS = ['All', 'Nature', 'Abstract', 'Architecture'];

const DEFAULT_WALLPAPERS = [
  { id: '1', title: 'Aurora', category: 'Nature', colors: ['#607D88', '#18262D'], icon: '✦' },
  { id: '2', title: 'Summit', category: 'Nature', colors: ['#7B858A', '#293439'], icon: '⌁' },
  { id: '3', title: 'Lunar', category: 'Abstract', colors: ['#686675', '#1F1E28'], icon: '○' },
  { id: '4', title: 'Tide', category: 'Nature', colors: ['#4E8190', '#173039'], icon: '≈' },
  { id: '5', title: 'Noir', category: 'Abstract', colors: ['#706A77', '#242128'], icon: '◐' },
  { id: '6', title: 'Haze', category: 'Abstract', colors: ['#898A90', '#36373D'], icon: '◌' },
  { id: '7', title: 'Dune', category: 'Nature', colors: ['#927A64', '#392A20'], icon: '◇' },
  { id: '8', title: 'Pine', category: 'Nature', colors: ['#5A755F', '#1C2D23'], icon: '♧' },
  { id: '9', title: 'Grid', category: 'Architecture', colors: ['#6D777E', '#272F34'], icon: '＋' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('All');
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
      setSelectedWallpaper({ id: 'custom', title: 'Your photo', custom: true });
    }
  }

  function openDefaultWallpaper(wallpaper) {
    setImageUri(null);
    setSelectedWallpaper(wallpaper);
  }

  const wallpapers =
    activeTab === 'All'
      ? DEFAULT_WALLPAPERS
      : DEFAULT_WALLPAPERS.filter((item) => item.category === activeTab);

  if (selectedWallpaper) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <EditorScreen
          imageUri={imageUri}
          wallpaper={selectedWallpaper}
          onClose={() => {
            setSelectedWallpaper(null);
            setImageUri(null);
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.logo}>Zharph</Text>

            <Pressable onPress={pickWallpaper} style={styles.topAction}>
              <Text style={styles.topActionIcon}>＋</Text>
            </Pressable>
          </View>

          <View style={styles.tabsContainer}>
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
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {activeTab === 'All' ? 'Wallpapers' : activeTab}
            </Text>
            <Text style={styles.sectionCount}>{wallpapers.length}</Text>
          </View>

          <View style={styles.grid}>
            <Pressable onPress={pickWallpaper} style={styles.cardPressable}>
              <View style={[styles.wallpaperCard, styles.addCard]}>
                <View style={styles.addIcon}>
                  <Text style={styles.addPlus}>＋</Text>
                </View>
                <Text style={styles.addTitle}>Your photo</Text>
              </View>
            </Pressable>

            {wallpapers.map((wallpaper) => (
              <Pressable
                key={wallpaper.id}
                onPress={() => openDefaultWallpaper(wallpaper)}
                style={styles.cardPressable}
              >
                <View style={styles.wallpaperCard}>
                  <LinearGradient colors={wallpaper.colors} style={styles.cardArt}>
                    <Text style={styles.artIcon}>{wallpaper.icon}</Text>
                    <View style={styles.cardBottom}>
                      <Text style={styles.cardTitle}>{wallpaper.title}</Text>
                      <Text style={styles.cardCategory}>{wallpaper.category}</Text>
                    </View>
                  </LinearGradient>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={styles.bottomNav}>
          <NavButton icon="⌂" label="Home" active />
          <NavButton icon="◒" label="Create" />
          <NavButton icon="♡" label="Saved" />
          <NavButton icon="⋯" label="More" />
        </View>
      </SafeAreaView>
    </View>
  );
}

function NavButton({ icon, label, active }) {
  return (
    <Pressable style={styles.navButton}>
      <View style={[styles.navIndicator, active && styles.navIndicatorActive]}>
        <Text style={[styles.navIcon, active && styles.navIconActive]}>{icon}</Text>
      </View>
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function EditorScreen({ imageUri, wallpaper, onClose }) {
  return (
    <View style={styles.editor}>
      <SafeAreaView style={styles.editorSafe}>
        <View style={styles.editorHeader}>
          <Pressable onPress={onClose} style={styles.iconButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <Text style={styles.editorTitle}>{wallpaper.title}</Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.editorPreviewWrap}>
          <View style={styles.editorPreview}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.editorImage} resizeMode="cover" />
            ) : (
              <LinearGradient colors={wallpaper.colors} style={styles.editorImage}>
                <Text style={styles.editorArt}>{wallpaper.icon}</Text>
              </LinearGradient>
            )}

            <LinearGradient
              pointerEvents="none"
              colors={['rgba(0,0,0,0.05)', 'transparent', 'rgba(0,0,0,0.45)']}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.editorClock}>
              <Text style={styles.editorTime}>10:42</Text>
              <Text style={styles.editorDate}>Monday, October 5</Text>
            </View>
          </View>
        </View>

        <View style={styles.editorPanel}>
          <Text style={styles.panelTitle}>Edit wallpaper</Text>

          <View style={styles.controlRow}>
            <ControlChip label="Depth" active />
            <ControlChip label="Position" />
            <ControlChip label="Clock" />
          </View>

          <Pressable style={styles.continueButton}>
            <Text style={styles.continueText}>Continue</Text>
            <Text style={styles.continueArrow}>→</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function ControlChip({ label, active }) {
  return (
    <Pressable style={[styles.controlChip, active && styles.controlChipActive]}>
      <Text style={[styles.controlLabel, active && styles.controlLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safe: {
    flex: 1,
  },
  content: {
    paddingHorizontal: PADDING,
    paddingTop: 12,
    paddingBottom: 108,
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    color: COLORS.onSurface,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  topAction: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActionIcon: {
    color: COLORS.onSurface,
    fontSize: 26,
    fontWeight: '300',
    marginTop: -2,
  },
  tabsContainer: {
    marginTop: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 4,
  },
  tabs: {
    gap: 4,
  },
  tab: {
    minWidth: 72,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.onPrimary,
    fontWeight: '700',
  },
  sectionHeader: {
    marginTop: 22,
    marginBottom: 12,
    paddingHorizontal: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: COLORS.onSurface,
    fontSize: 17,
    fontWeight: '700',
  },
  sectionCount: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  cardPressable: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.48,
  },
  wallpaperCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  addCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceVariant,
  },
  addIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPlus: {
    color: COLORS.onPrimary,
    fontSize: 27,
    fontWeight: '300',
    marginTop: -2,
  },
  addTitle: {
    color: COLORS.onSurface,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
  },
  cardArt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artIcon: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 39,
    fontWeight: '200',
  },
  cardBottom: {
    position: 'absolute',
    left: 11,
    right: 11,
    bottom: 10,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardCategory: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 8,
    marginTop: 2,
  },
  bottomNav: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 10,
    height: 72,
    borderRadius: 28,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 5,
  },
  navButton: {
    flex: 1,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  navIndicator: {
    width: 64,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIndicatorActive: {
    backgroundColor: COLORS.primary,
  },
  navIcon: {
    color: COLORS.onSurfaceVariant,
    fontSize: 19,
  },
  navIconActive: {
    color: COLORS.onPrimary,
  },
  navLabel: {
    color: COLORS.onSurfaceVariant,
    fontSize: 9,
    fontWeight: '600',
  },
  navLabelActive: {
    color: COLORS.onSurface,
    fontWeight: '700',
  },
  editor: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  editorSafe: {
    flex: 1,
    paddingHorizontal: 18,
  },
  editorHeader: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: COLORS.onSurface,
    fontSize: 34,
    fontWeight: '300',
    marginTop: -5,
  },
  editorTitle: {
    color: COLORS.onSurface,
    fontSize: 16,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 48,
  },
  editorPreviewWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorPreview: {
    width: width - 58,
    height: Math.min(width * 1.42, 570),
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  editorImage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorArt: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 80,
  },
  editorClock: {
    position: 'absolute',
    top: 34,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  editorTime: {
    color: '#FFFFFF',
    fontSize: 63,
    lineHeight: 68,
    fontWeight: '300',
    letterSpacing: -3,
  },
  editorDate: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  editorPanel: {
    borderRadius: 28,
    padding: 17,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  panelTitle: {
    color: COLORS.onSurface,
    fontSize: 18,
    fontWeight: '700',
  },
  controlRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 13,
  },
  controlChip: {
    flex: 1,
    height: 45,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceVariant,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  controlChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  controlLabel: {
    color: COLORS.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '600',
  },
  controlLabelActive: {
    color: COLORS.onPrimary,
    fontWeight: '700',
  },
  continueButton: {
    height: 48,
    borderRadius: 17,
    marginTop: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  continueText: {
    color: COLORS.onPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  continueArrow: {
    color: COLORS.onPrimary,
    fontSize: 17,
    marginLeft: 10,
    marginTop: -1,
  },
});