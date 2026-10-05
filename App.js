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
const GAP = 10;
const CARD_WIDTH = (width - PADDING * 2 - GAP * 2) / 3;

const TABS = ['All', 'Nature', 'Abstract', 'Architecture'];

const DEFAULT_WALLPAPERS = [
  { id: '1', title: 'Aurora', category: 'Nature', colors: ['#536D73', '#182326'], icon: '✦' },
  { id: '2', title: 'Summit', category: 'Nature', colors: ['#78878E', '#29353A'], icon: '⌁' },
  { id: '3', title: 'Lunar', category: 'Abstract', colors: ['#57545E', '#1D1B22'], icon: '○' },
  { id: '4', title: 'Tide', category: 'Nature', colors: ['#467D8A', '#172F35'], icon: '≈' },
  { id: '5', title: 'Noir', category: 'Abstract', colors: ['#655F69', '#211F25'], icon: '◐' },
  { id: '6', title: 'Haze', category: 'Abstract', colors: ['#838481', '#343535'], icon: '◌' },
  { id: '7', title: 'Dune', category: 'Nature', colors: ['#88715D', '#35281E'], icon: '◇' },
  { id: '8', title: 'Pine', category: 'Nature', colors: ['#526E5B', '#1B2B22'], icon: '♧' },
  { id: '9', title: 'Grid', category: 'Architecture', colors: ['#69747A', '#252D31'], icon: '＋' },
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

            <Pressable onPress={pickWallpaper} style={styles.neoButton}>
              <View style={styles.neoButtonHighlight} />
              <Text style={styles.headerPlus}>＋</Text>
            </Pressable>
          </View>

          <Text style={styles.intro}>
            A softer way to make your screen feel deeper.
          </Text>

          <View style={styles.tabsTrack}>
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
            <Text style={styles.sectionCount}>{wallpapers.length} available</Text>
          </View>

          <View style={styles.grid}>
            <Pressable onPress={pickWallpaper} style={styles.cardShadow}>
              <View style={[styles.neoCard, styles.addCard]}>
                <View style={styles.addHighlight} />
                <View style={styles.addInner}>
                  <View style={styles.plusWell}>
                    <Text style={styles.addPlus}>＋</Text>
                  </View>
                  <Text style={styles.addTitle}>Your photo</Text>
                  <Text style={styles.addCaption}>Choose from gallery</Text>
                </View>
              </View>
            </Pressable>

            {wallpapers.map((wallpaper) => (
              <Pressable
                key={wallpaper.id}
                onPress={() => openDefaultWallpaper(wallpaper)}
                style={styles.cardShadow}
              >
                <View style={styles.neoCard}>
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

        <View style={styles.navShadow}>
          <View style={styles.bottomNav}>
            <NavButton icon="⌂" label="Home" active />
            <NavButton icon="◒" label="Create" />
            <NavButton icon="♡" label="Saved" />
            <NavButton icon="⋯" label="More" />
          </View>
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
    <Pressable style={[styles.navButton, active && styles.navButtonActive]}>
      {active && <View style={styles.navActiveHighlight} />}
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

          <View style={styles.editorHeaderCenter}>
            <Text style={styles.editorKicker}>EDIT</Text>
            <Text style={styles.editorTitle}>{wallpaper.title}</Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.editorPreviewWrap}>
          <View style={styles.previewShadow}>
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
                colors={['rgba(255,255,255,0.05)', 'transparent', 'rgba(0,0,0,0.42)']}
                style={StyleSheet.absoluteFill}
              />

              <View style={styles.editorClock}>
                <Text style={styles.editorTime}>10:42</Text>
                <Text style={styles.editorDate}>Monday, October 5</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.editorPanelShadow}>
          <View style={styles.editorPanel}>
            <View style={styles.panelHeading}>
              <View>
                <Text style={styles.panelKicker}>DEPTH CONTROLS</Text>
                <Text style={styles.panelTitle}>Shape the layer.</Text>
              </View>
              <Text style={styles.panelStep}>01</Text>
            </View>

            <View style={styles.controlRow}>
              <ControlChip label="Depth" active />
              <ControlChip label="Position" />
              <ControlChip label="Clock" />
            </View>

            <Pressable style={styles.continueShadow}>
              <View style={styles.continueButton}>
                <Text style={styles.continueText}>Continue</Text>
                <Text style={styles.continueArrow}>→</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function ControlChip({ label, active }) {
  return (
    <Pressable style={styles.chipShadow}>
      <View style={[styles.controlChip, active && styles.controlChipActive]}>
        <Text style={[styles.controlLabel, active && styles.controlLabelActive]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#202426',
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
    paddingTop: 9,
  },
  kicker: {
    color: '#899296',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 8,
  },
  title: {
    color: '#E8ECEC',
    fontSize: 32,
    lineHeight: 37,
    fontWeight: '700',
    letterSpacing: -1.1,
  },
  intro: {
    color: '#899194',
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 310,
    marginTop: 11,
  },
  neoButton: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#202426',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#090A0B',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.8,
    shadowRadius: 7,
  },
  neoButtonHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  headerPlus: {
    color: '#DCE1E1',
    fontSize: 27,
    fontWeight: '300',
    marginTop: -2,
  },
  tabsTrack: {
    marginTop: 27,
    marginBottom: 19,
    borderRadius: 17,
    backgroundColor: '#1B1F21',
    padding: 5,
    elevation: 5,
    shadowColor: '#0B0D0E',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  tabs: {
    gap: 4,
  },
  tab: {
    height: 39,
    paddingHorizontal: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#282E30',
    elevation: 3,
    shadowColor: '#0C0D0E',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  tabText: {
    color: '#697174',
    fontSize: 12,
    fontWeight: '650',
  },
  tabTextActive: {
    color: '#E3E8E8',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: '#C9CECE',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionCount: {
    color: '#687174',
    fontSize: 10,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  cardShadow: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.48,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#090B0C',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
  },
  neoCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#24292B',
  },
  addCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.035)',
  },
  addHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    pointerEvents: 'none',
  },
  addInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusWell: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E2224',
    elevation: 4,
    shadowColor: '#0A0B0C',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  addPlus: {
    color: '#DCE1E1',
    fontSize: 28,
    fontWeight: '200',
    marginTop: -2,
  },
  addTitle: {
    color: '#C9CECE',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
  },
  addCaption: {
    color: '#697174',
    fontSize: 8,
    marginTop: 4,
  },
  cardArt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artIcon: {
    color: 'rgba(255,255,255,0.46)',
    fontSize: 38,
    fontWeight: '200',
  },
  cardBottom: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 9,
  },
  cardTitle: {
    color: '#F0F3F3',
    fontSize: 11,
    fontWeight: '700',
  },
  cardCategory: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 8,
    marginTop: 2,
  },
  navShadow: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 10,
    height: 60,
    borderRadius: 19,
    elevation: 10,
    shadowColor: '#080A0B',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.9,
    shadowRadius: 9,
  },
  bottomNav: {
    flex: 1,
    borderRadius: 19,
    backgroundColor: '#24292B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  navButton: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 15,
    marginHorizontal: 3,
  },
  navButtonActive: {
    backgroundColor: '#1E2224',
    elevation: 3,
    shadowColor: '#0B0D0E',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.75,
    shadowRadius: 3,
  },
  navActiveHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 15,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  navIcon: {
    color: '#667073',
    fontSize: 18,
  },
  navIconActive: {
    color: '#E6EBEB',
  },
  navLabel: {
    color: '#626B6E',
    fontSize: 8,
    fontWeight: '650',
  },
  navLabelActive: {
    color: '#DDE2E2',
  },
  editorOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: '#202426',
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
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#202426',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 7,
    shadowColor: '#090A0B',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  backText: {
    color: '#E7ECEC',
    fontSize: 35,
    fontWeight: '200',
    marginTop: -5,
  },
  editorHeaderCenter: {
    alignItems: 'center',
  },
  editorKicker: {
    color: '#727B7E',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 2,
  },
  editorTitle: {
    color: '#E5EAEA',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  headerSpacer: {
    width: 43,
  },
  editorPreviewWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewShadow: {
    width: width - 58,
    height: Math.min(width * 1.42, 570),
    borderRadius: 24,
    elevation: 10,
    shadowColor: '#080A0B',
    shadowOffset: { width: 7, height: 7 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  editorPreview: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#282D2F',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  editorImage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorArt: {
    color: 'rgba(255,255,255,0.48)',
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
  editorPanelShadow: {
    borderRadius: 22,
    marginBottom: 12,
    elevation: 8,
    shadowColor: '#090B0C',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  editorPanel: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: '#24292B',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  panelHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  panelKicker: {
    color: '#727B7E',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 2,
  },
  panelTitle: {
    color: '#E5EAEA',
    fontSize: 19,
    fontWeight: '700',
    marginTop: 3,
  },
  panelStep: {
    color: '#687174',
    fontSize: 11,
    fontWeight: '700',
  },
  controlRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 13,
  },
  chipShadow: {
    flex: 1,
    borderRadius: 14,
    elevation: 4,
    shadowColor: '#0A0B0C',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  controlChip: {
    height: 43,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#202426',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: 'rgba(255,255,255,0.055)',
  },
  controlChipActive: {
    backgroundColor: '#2B3133',
    borderColor: 'rgba(255,255,255,0.13)',
  },
  controlLabel: {
    color: '#727B7E',
    fontSize: 10,
    fontWeight: '650',
  },
  controlLabelActive: {
    color: '#E8EDED',
  },
  continueShadow: {
    marginTop: 10,
    borderRadius: 14,
    elevation: 5,
    shadowColor: '#0A0B0C',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  continueButton: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#DDE3E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    color: '#1B2021',
    fontSize: 12,
    fontWeight: '800',
  },
  continueArrow: {
    color: '#1B2021',
    fontSize: 17,
    marginLeft: 10,
    marginTop: -1,
  },
});