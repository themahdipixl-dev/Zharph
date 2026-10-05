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
const PADDING = 18;
const GAP = 9;
const CARD_WIDTH = (width - PADDING * 2 - GAP * 2) / 3;

const TABS = ['All', 'Nature', 'Abstract', 'Architecture'];

const DEFAULT_WALLPAPERS = [
  { id: '1', title: 'Aurora', category: 'Nature', colors: ['#405A63', '#11191D'], icon: '✦' },
  { id: '2', title: 'Summit', category: 'Nature', colors: ['#71808A', '#202B31'], icon: '⌁' },
  { id: '3', title: 'Lunar', category: 'Abstract', colors: ['#4A4750', '#141419'], icon: '○' },
  { id: '4', title: 'Tide', category: 'Nature', colors: ['#397181', '#102A31'], icon: '≈' },
  { id: '5', title: 'Noir', category: 'Abstract', colors: ['#56515B', '#17151A'], icon: '◐' },
  { id: '6', title: 'Haze', category: 'Abstract', colors: ['#7A7B78', '#292B2B'], icon: '◌' },
  { id: '7', title: 'Dune', category: 'Nature', colors: ['#806B58', '#2B211A'], icon: '◇' },
  { id: '8', title: 'Pine', category: 'Nature', colors: ['#486252', '#14201A'], icon: '♧' },
  { id: '9', title: 'Grid', category: 'Architecture', colors: ['#59636A', '#1C2226'], icon: '＋' },
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

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>ZHARPH</Text>
              <Text style={styles.title}>Find your depth.</Text>
            </View>
            <Pressable style={styles.headerButton} onPress={pickWallpaper}>
              <Text style={styles.headerButtonText}>＋</Text>
            </Pressable>
          </View>

          <Text style={styles.intro}>
            Wallpapers designed to become something deeper.
          </Text>

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
                  style={styles.tab}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {tab}
                  </Text>
                  {active && <View style={styles.tabLine} />}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {activeTab === 'All' ? 'Curated wallpapers' : activeTab}
            </Text>
            <Text style={styles.sectionCount}>{wallpapers.length} works</Text>
          </View>

          <View style={styles.grid}>
            <Pressable style={styles.addCard} onPress={pickWallpaper}>
              <View style={styles.addInner}>
                <Text style={styles.addPlus}>＋</Text>
                <Text style={styles.addTitle}>Your photo</Text>
                <Text style={styles.addCaption}>Create from gallery</Text>
              </View>
            </Pressable>

            {wallpapers.map((wallpaper) => (
              <Pressable
                key={wallpaper.id}
                onPress={() => openDefaultWallpaper(wallpaper)}
                style={styles.card}
              >
                <LinearGradient colors={wallpaper.colors} style={styles.cardArt}>
                  <Text style={styles.artIcon}>{wallpaper.icon}</Text>
                  <View style={styles.cardBottom}>
                    <Text style={styles.cardTitle}>{wallpaper.title}</Text>
                    <Text style={styles.cardCategory}>{wallpaper.category}</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={styles.bottomNav}>
          <NavButton icon="⌂" label="Explore" active />
          <NavButton icon="◒" label="Create" />
          <NavButton icon="♡" label="Saved" />
          <NavButton icon="⋯" label="More" />
        </View>
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
      <StatusBar style="light" />
      <SafeAreaView style={styles.editorSafe}>
        <View style={styles.editorHeader}>
          <Pressable onPress={onClose} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View>
            <Text style={styles.editorKicker}>EDITOR</Text>
            <Text style={styles.editorTitle}>{wallpaper.title}</Text>
          </View>
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
              colors={['rgba(0,0,0,0.08)', 'transparent', 'rgba(0,0,0,0.45)']}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.editorClock}>
              <Text style={styles.editorTime}>10:42</Text>
              <Text style={styles.editorDate}>Monday, October 5</Text>
            </View>
          </View>
        </View>

        <View style={styles.editorPanel}>
          <View style={styles.panelHeading}>
            <View>
              <Text style={styles.panelKicker}>LAYOUT</Text>
              <Text style={styles.panelTitle}>Make it yours.</Text>
            </View>
            <Text style={styles.panelStep}>01</Text>
          </View>

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
      <Text style={[styles.controlLabel, active && styles.controlLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  safe: {
    flex: 1,
  },
  content: {
    paddingHorizontal: PADDING,
    paddingTop: 12,
    paddingBottom: 112,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  kicker: {
    color: '#7E8A8F',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 8,
  },
  title: {
    color: '#F4F3EF',
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -1.4,
  },
  intro: {
    color: '#777878',
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 300,
    marginTop: 12,
  },
  headerButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#4E5355',
  },
  headerButtonText: {
    color: '#F4F3EF',
    fontSize: 27,
    fontWeight: '300',
    marginTop: -2,
  },
  tabs: {
    gap: 23,
    paddingTop: 30,
    paddingBottom: 17,
  },
  tab: {
    paddingVertical: 5,
    position: 'relative',
  },
  tabText: {
    color: '#606263',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#F4F3EF',
  },
  tabLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: '#E7E5DE',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#D8D7D1',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  sectionCount: {
    color: '#555758',
    fontSize: 10,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.48,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#161717',
  },
  cardArt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artIcon: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 40,
    fontWeight: '200',
  },
  cardBottom: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 9,
  },
  cardTitle: {
    color: '#F4F3EF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardCategory: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 8,
    marginTop: 2,
  },
  addCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.48,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#414445',
    backgroundColor: '#0E0F0F',
  },
  addInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPlus: {
    color: '#D9D8D2',
    fontSize: 28,
    fontWeight: '200',
  },
  addTitle: {
    color: '#D9D8D2',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 9,
  },
  addCaption: {
    color: '#555758',
    fontSize: 8,
    marginTop: 3,
  },
  bottomNav: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 10,
    height: 58,
    backgroundColor: '#111212',
    borderTopWidth: 1,
    borderTopColor: '#2C2E2F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  navIcon: {
    color: '#555758',
    fontSize: 18,
  },
  navIconActive: {
    color: '#F4F3EF',
  },
  navLabel: {
    color: '#555758',
    fontSize: 8,
    fontWeight: '600',
  },
  navLabelActive: {
    color: '#F4F3EF',
  },
  editorOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: '#0A0A0A',
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backText: {
    color: '#F4F3EF',
    fontSize: 35,
    fontWeight: '200',
    marginTop: -5,
  },
  editorKicker: {
    color: '#666A6A',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
  },
  editorTitle: {
    color: '#F4F3EF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  editorPreviewWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorPreview: {
    width: width - 58,
    height: Math.min(width * 1.42, 570),
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#181818',
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
    paddingTop: 17,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#2B2D2E',
  },
  panelHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  panelKicker: {
    color: '#6B7070',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 2,
  },
  panelTitle: {
    color: '#E4E3DD',
    fontSize: 19,
    fontWeight: '700',
    marginTop: 3,
  },
  panelStep: {
    color: '#555858',
    fontSize: 11,
    fontWeight: '700',
  },
  controlRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 13,
  },
  controlChip: {
    flex: 1,
    height: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2C2F30',
    backgroundColor: '#111212',
  },
  controlChipActive: {
    borderColor: '#858B8B',
    backgroundColor: '#1A1C1C',
  },
  controlLabel: {
    color: '#626565',
    fontSize: 10,
    fontWeight: '600',
  },
  controlLabelActive: {
    color: '#F4F3EF',
  },
  continueButton: {
    height: 46,
    marginTop: 9,
    backgroundColor: '#E8E6DE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    color: '#111212',
    fontSize: 12,
    fontWeight: '800',
  },
  continueArrow: {
    color: '#111212',
    fontSize: 17,
    marginLeft: 10,
    marginTop: -1,
  },
});