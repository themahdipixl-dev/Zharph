import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  Modal,
  Platform,
  PlatformColor,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const WALLPAPERS = [
  {
    id: 'mountain',
    title: 'Quiet Peaks',
    type: 'Depth',
    category: 'Nature',
    uri: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=85',
  },
  {
    id: 'city',
    title: 'Neon Rain',
    type: 'Parallax',
    category: 'City',
    uri: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1200&q=85',
  },
  {
    id: 'forest',
    title: 'Misty Forest',
    type: 'Depth',
    category: 'Nature',
    uri: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&q=85',
  },
  {
    id: 'ocean',
    title: 'Open Water',
    type: 'Parallax',
    category: 'Abstract',
    uri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85',
  },
];

const CATEGORIES = ['All', 'Depth', 'Parallax', 'Nature', 'City', 'Abstract'];

function dynamicColor(androidName, fallback) {
  if (Platform.OS === 'android' && Platform.Version >= 31) {
    return PlatformColor(androidName);
  }
  return fallback;
}

function makeTheme() {
  const primary = dynamicColor('@android:color/system_accent1_600', '#B9C7FF');
  const onPrimary = dynamicColor('@android:color/system_accent1_0', '#17213A');
  const bg = dynamicColor('@android:color/system_neutral1_900', '#101114');
  const surface = dynamicColor('@android:color/system_neutral1_800', '#1A1B20');
  const surfaceContainer = dynamicColor('@android:color/system_neutral1_700', '#202127');
  const outline = dynamicColor('@android:color/system_neutral2_500', '#8F9099');
  const onSurface = dynamicColor('@android:color/system_neutral1_0', '#E5E1E9');
  const onSurfaceVariant = dynamicColor('@android:color/system_neutral2_100', '#C4C5CF');

  return {
    primary,
    onPrimary,
    bg,
    surface,
    surfaceContainer,
    outline,
    onSurface,
    onSurfaceVariant,
    scrim: '#000000',
  };
}

const theme = makeTheme();

function Icon({ symbol, size = 24, color = theme.onSurface }) {
  return <Text style={{ fontSize: size, lineHeight: size + 2, color, fontWeight: '500' }}>{symbol}</Text>;
}

function SectionTitle({ children, action, onAction }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionHeading}>{children}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={12}>
          <Text style={styles.textButton}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function WallpaperCard({ item, onPress, compact = false }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wallpaperCard, compact && styles.compactCard, pressed && styles.pressed]}
    >
      <ImageBackground source={{ uri: item.uri }} style={styles.wallpaperImage} imageStyle={styles.wallpaperImageRadius}>
        <View style={styles.imageShade} />
        <View style={styles.cardTop}>
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>{item.type}</Text>
          </View>
          <View style={styles.favoriteDot}><Icon symbol="♡" size={18} /></View>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.wallpaperTitle}>{item.title}</Text>
          <Text style={styles.wallpaperMeta}>{item.category}</Text>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

function BottomNav({ active, onChange }) {
  const tabs = [
    ['home', '⌂', 'Home'],
    ['depth', '◫', 'Depth'],
    ['saved', '♡', 'Saved'],
    ['settings', '⚙', 'Settings'],
  ];

  return (
    <View style={styles.bottomNav}>
      {tabs.map(([key, icon, label]) => {
        const selected = active === key;
        return (
          <Pressable key={key} onPress={() => onChange(key)} style={styles.navItem}>
            <View style={[styles.navIndicator, selected && styles.navIndicatorSelected]}>
              <Icon symbol={icon} size={22} color={selected ? theme.onPrimary : theme.onSurfaceVariant} />
            </View>
            <Text style={[styles.navLabel, selected && styles.navLabelSelected]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Home({ onOpenEditor, onOpenWallpaper, onChangeTab }) {
  const [category, setCategory] = useState('All');
  const filtered = useMemo(
    () => category === 'All' ? WALLPAPERS : WALLPAPERS.filter(x => x.type === category || x.category === category),
    [category]
  );

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.heroHeader}>
        <View>
          <Text style={styles.eyebrow}>WALLPAPER STUDIO</Text>
          <Text style={styles.brand}>Zharph</Text>
        </View>
        <Pressable onPress={onOpenEditor} style={styles.headerFab} accessibilityLabel="Create wallpaper">
          <Icon symbol="＋" size={26} color={theme.onPrimary} />
        </Pressable>
      </View>

      <View style={styles.heroCopy}>
        <Text style={styles.heroTitle}>Make your screen{\"\\n\"}feel alive.</Text>
        <Text style={styles.heroBody}>Create depth and motion from the photos you already love.</Text>
      </View>

      <Pressable onPress={onOpenEditor} style={({ pressed }) => [styles.createCard, pressed && styles.pressed]}>
        <View style={styles.createIcon}><Icon symbol="✦" size={25} color={theme.primary} /></View>
        <View style={styles.createText}>
          <Text style={styles.createTitle}>Create a wallpaper</Text>
          <Text style={styles.createSubtitle}>Start with a photo from your gallery</Text>
        </View>
        <Icon symbol="›" size={30} color={theme.onSurfaceVariant} />
      </Pressable>

      <SectionTitle action="See all" onAction={() => onChangeTab('depth')}>Featured</SectionTitle>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
        {WALLPAPERS.slice(0, 3).map(item => (
          <WallpaperCard key={item.id} item={item} compact onPress={() => onOpenWallpaper(item)} />
        ))}
      </ScrollView>

      <SectionTitle>Explore</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
        {CATEGORIES.map(item => {
          const selected = category === item;
          return (
            <Pressable key={item} onPress={() => setCategory(item)} style={[styles.categoryChip, selected && styles.categoryChipSelected]}>
              <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>{item}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.grid}>
        {filtered.map(item => <WallpaperCard key={item.id} item={item} onPress={() => onOpenWallpaper(item)} />)}
      </View>
    </ScrollView>
  );
}

function DepthScreen({ onOpenEditor, onOpenWallpaper }) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.screenTitle}>Depth</Text>
      <Text style={styles.screenSubtitle}>Wallpapers with a sense of space.</Text>

      <View style={styles.featurePreview}>
        <ImageBackground source={{ uri: WALLPAPERS[0].uri }} style={styles.previewImage} imageStyle={styles.previewRadius}>
          <View style={styles.previewDepthLayer} />
          <View style={styles.previewTextBlock}>
            <Text style={styles.previewKicker}>DEPTH EFFECT</Text>
            <Text style={styles.previewBig}>Quiet Peaks</Text>
            <Text style={styles.previewSmall}>Subject separation · Dynamic depth</Text>
          </View>
        </ImageBackground>
      </View>

      <Pressable onPress={onOpenEditor} style={styles.primaryButton}>
        <Icon symbol="✦" size={20} color={theme.onPrimary} />
        <Text style={styles.primaryButtonText}>Create Depth Wallpaper</Text>
      </Pressable>

      <SectionTitle>Discover</SectionTitle>
      <View style={styles.grid}>
        {WALLPAPERS.filter(x => x.type === 'Depth').map(item => (
          <WallpaperCard key={item.id} item={item} onPress={() => onOpenWallpaper(item)} />
        ))}
      </View>
    </ScrollView>
  );
}

function SavedScreen({ saved, onOpenWallpaper, onOpenEditor }) {
  const items = WALLPAPERS.filter(x => saved.includes(x.id));
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.screenTitle}>Saved</Text>
      <Text style={styles.screenSubtitle}>Your personal wallpaper collection.</Text>
      {items.length ? (
        <View style={styles.grid}>{items.map(item => <WallpaperCard key={item.id} item={item} onPress={() => onOpenWallpaper(item)} />)}</View>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}><Icon symbol="♡" size={32} color={theme.primary} /></View>
          <Text style={styles.emptyTitle}>Nothing saved yet</Text>
          <Text style={styles.emptyBody}>Save wallpapers while browsing and they will appear here.</Text>
          <Pressable onPress={onOpenEditor} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Create one</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function SettingsScreen() {
  const [motion, setMotion] = useState(true);
  const [dark, setDark] = useState(true);
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.screenTitle}>Settings</Text>
      <Text style={styles.screenSubtitle}>Shape Zharph around your phone.</Text>

      <View style={styles.settingsGroup}>
        <Text style={styles.groupLabel}>APPEARANCE</Text>
        <SettingRow icon="◐" title="Dynamic Color" subtitle="Follow your Android system palette" trailing={<View style={styles.dynamicDot} />} />
        <SettingRow icon="☾" title="Dark appearance" subtitle="Optimized for AMOLED displays" trailing={<Switch value={dark} onValueChange={setDark} trackColor={{ false: theme.surfaceContainer, true: theme.primary }} thumbColor={dark ? theme.onPrimary : theme.outline} />} />
      </View>

      <View style={styles.settingsGroup}>
        <Text style={styles.groupLabel}>MOTION</Text>
        <SettingRow icon="↗" title="Parallax motion" subtitle="Use device movement for depth" trailing={<Switch value={motion} onValueChange={setMotion} trackColor={{ false: theme.surfaceContainer, true: theme.primary }} thumbColor={motion ? theme.onPrimary : theme.outline} />} />
        <SettingRow icon="⌁" title="Motion intensity" subtitle="Balanced" trailing={<Text style={styles.trailingText}>Medium</Text>} />
      </View>

      <View style={styles.aboutBlock}>
        <Text style={styles.aboutBrand}>Zharph</Text>
        <Text style={styles.aboutText}>Material You wallpaper studio</Text>
        <Text style={styles.version}>Version 1.0.0 · Expo SDK 55</Text>
      </View>
    </ScrollView>
  );
}

function SettingRow({ icon, title, subtitle, trailing }) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}><Icon symbol={icon} size={22} color={theme.primary} /></View>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      {trailing}
    </View>
  );
}

function Editor({ initial, onClose, onSave }) {
  const [image, setImage] = useState(initial?.uri || null);
  const [mode, setMode] = useState(initial?.type || 'Depth');
  const [intensity, setIntensity] = useState(65);
  const [clock, setClock] = useState(true);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to choose a wallpaper.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: true,
      aspect: [9, 16],
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.editorRoot}>
        <StatusBar barStyle="light-content" />
        <View style={styles.editorTopBar}>
          <Pressable onPress={onClose} style={styles.iconButton}><Icon symbol="×" size={28} /></Pressable>
          <Text style={styles.editorTitle}>Editor</Text>
          <Pressable onPress={() => onSave({ uri: image, type: mode })} style={styles.saveTextButton}>
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>

        <View style={styles.editorCanvas}>
          {image ? (
            <Image source={{ uri: image }} style={styles.editorImage} resizeMode="cover" />
          ) : (
            <Pressable onPress={pickImage} style={styles.pickPlaceholder}>
              <View style={styles.emptyIcon}><Icon symbol="＋" size={30} color={theme.primary} /></View>
              <Text style={styles.placeholderTitle}>Choose a photo</Text>
              <Text style={styles.placeholderBody}>Use an image from your gallery</Text>
            </Pressable>
          )}
          {image && (
            <>
              {mode === 'Depth' && <View style={[styles.depthCutout, { transform: [{ translateX: (intensity - 50) * 0.3 }] }]} />}
              {clock && <Text style={styles.mockClock}>09:41</Text>}
              <View style={styles.previewGlass}>
                <Text style={styles.previewGlassTitle}>{mode === 'Depth' ? 'Depth' : 'Parallax'}</Text>
                <Text style={styles.previewGlassSub}>{intensity}% intensity</Text>
              </View>
            </>
          )}
        </View>

        <ScrollView style={styles.editorControls} contentContainerStyle={styles.editorControlsContent}>
          <Pressable onPress={pickImage} style={styles.controlRow}>
            <View style={styles.controlIcon}><Icon symbol="▧" size={21} color={theme.primary} /></View>
            <View style={styles.controlCopy}><Text style={styles.controlTitle}>Photo</Text><Text style={styles.controlSub}>{image ? 'Change source image' : 'Choose from gallery'}</Text></View>
            <Icon symbol="›" size={28} color={theme.onSurfaceVariant} />
          </Pressable>

          <Text style={styles.controlLabel}>EFFECT</Text>
          <View style={styles.segmented}>
            {['Depth', 'Parallax'].map(item => (
              <Pressable key={item} onPress={() => setMode(item)} style={[styles.segment, mode === item && styles.segmentSelected]}>
                <Text style={[styles.segmentText, mode === item && styles.segmentTextSelected]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.controlLabel}>INTENSITY</Text>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: `${intensity}%` }]} />
            {[25, 50, 65, 80].map(v => (
              <Pressable key={v} onPress={() => setIntensity(v)} style={[styles.sliderStop, { left: `${v}%` }]} />
            ))}
          </View>
          <View style={styles.sliderLabels}><Text style={styles.sliderLabel}>Subtle</Text><Text style={styles.sliderValue}>{intensity}%</Text><Text style={styles.sliderLabel}>Strong</Text></View>

          <View style={styles.controlRow}>
            <View style={styles.controlIcon}><Icon symbol="◷" size={21} color={theme.primary} /></View>
            <View style={styles.controlCopy}><Text style={styles.controlTitle}>Lock screen clock</Text><Text style={styles.controlSub}>Preview system clock placement</Text></View>
            <Switch value={clock} onValueChange={setClock} trackColor={{ false: theme.surfaceContainer, true: theme.primary }} thumbColor={clock ? theme.onPrimary : theme.outline} />
          </View>

          <Text style={styles.editorHint}>The editor is intentionally lightweight for Expo Go. Native wallpaper application can be added later without changing this design system.</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function App() {
  const [tab, setTab] = useState('home');
  const [editor, setEditor] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saved, setSaved] = useState([]);

  const openWallpaper = item => setSelected(item);
  const saveWallpaper = item => {
    if (item?.id && !saved.includes(item.id)) setSaved(prev => [...prev, item.id]);
  };

  const renderScreen = () => {
    if (tab === 'depth') return <DepthScreen onOpenEditor={() => setEditor({})} onOpenWallpaper={openWallpaper} />;
    if (tab === 'saved') return <SavedScreen saved={saved} onOpenWallpaper={openWallpaper} onOpenEditor={() => setEditor({})} />;
    if (tab === 'settings') return <SettingsScreen />;
    return <Home onOpenEditor={() => setEditor({})} onOpenWallpaper={openWallpaper} onChangeTab={setTab} />;
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
      <View style={styles.screen}>{renderScreen()}</View>
      <BottomNav active={tab} onChange={setTab} />

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        {selected && (
          <View style={styles.detailBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
            <View style={styles.detailSheet}>
              <Image source={{ uri: selected.uri }} style={styles.detailImage} />
              <View style={styles.detailBody}>
                <View style={styles.detailTitleRow}>
                  <View><Text style={styles.detailTitle}>{selected.title}</Text><Text style={styles.detailMeta}>{selected.type} · {selected.category}</Text></View>
                  <Pressable onPress={() => saveWallpaper(selected)} style={styles.favoriteButton}><Icon symbol={saved.includes(selected.id) ? '♥' : '♡'} size={24} color={theme.primary} /></Pressable>
                </View>
                <View style={styles.detailActions}>
                  <Pressable onPress={() => { setSelected(null); setEditor(selected); }} style={styles.primaryButtonSmall}><Text style={styles.primaryButtonText}>Edit</Text></Pressable>
                  <Pressable onPress={() => { saveWallpaper(selected); setSelected(null); }} style={styles.secondaryButtonSmall}><Text style={styles.secondaryButtonText}>{saved.includes(selected.id) ? 'Saved' : 'Save'}</Text></Pressable>
                </View>
              </View>
            </View>
          </View>
        )}
      </Modal>

      {editor && (
        <Editor
          initial={editor}
          onClose={() => setEditor(null)}
          onSave={item => {
            if (item?.uri) {
              const custom = { ...item, id: 'custom-' + Date.now(), title: 'My Wallpaper', category: 'Custom' };
              setSaved(prev => [...prev, custom.id]);
            }
            setEditor(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  screen: { flex: 1 },
  scrollContent: { paddingTop: 24, paddingHorizontal: 20, paddingBottom: 112 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 34 },
  eyebrow: { color: theme.primary, fontSize: 11, letterSpacing: 1.5, fontWeight: '700', marginBottom: 4 },
  brand: { color: theme.onSurface, fontSize: 32, fontWeight: '700', letterSpacing: -1 },
  headerFab: { width: 52, height: 52, borderRadius: 18, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { marginBottom: 24 },
  heroTitle: { color: theme.onSurface, fontSize: 38, lineHeight: 42, fontWeight: '700', letterSpacing: -1.3 },
  heroBody: { color: theme.onSurfaceVariant, fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 320 },
  createCard: { minHeight: 86, borderRadius: 28, backgroundColor: theme.surfaceContainer, flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 32 },
  createIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  createText: { flex: 1, marginLeft: 14 },
  createTitle: { color: theme.onSurface, fontSize: 16, fontWeight: '700' },
  createSubtitle: { color: theme.onSurfaceVariant, fontSize: 13, marginTop: 4 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, marginTop: 4 },
  sectionHeading: { color: theme.onSurface, fontSize: 21, fontWeight: '700', letterSpacing: -0.3 },
  textButton: { color: theme.primary, fontSize: 14, fontWeight: '700' },
  horizontalList: { gap: 12, paddingBottom: 30 },
  wallpaperCard: { width: '48%', aspectRatio: 0.67, borderRadius: 25, overflow: 'hidden', backgroundColor: theme.surfaceContainer, marginBottom: 12 },
  compactCard: { width: 178, aspectRatio: 0.72, marginBottom: 0 },
  wallpaperImage: { flex: 1, justifyContent: 'space-between' },
  wallpaperImageRadius: { borderRadius: 25 },
  imageShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.12)' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', padding: 11 },
  typePill: { backgroundColor: 'rgba(0,0,0,0.38)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 50 },
  typePillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  favoriteDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.38)', alignItems: 'center', justifyContent: 'center' },
  cardBottom: { padding: 14 },
  wallpaperTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  wallpaperMeta: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 3 },
  categoryList: { gap: 8, paddingBottom: 22 },
  categoryChip: { borderRadius: 50, paddingHorizontal: 17, paddingVertical: 10, backgroundColor: theme.surfaceContainer },
  categoryChipSelected: { backgroundColor: theme.primary },
  categoryText: { color: theme.onSurfaceVariant, fontSize: 13, fontWeight: '600' },
  categoryTextSelected: { color: theme.onPrimary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  bottomNav: { position: 'absolute', left: 12, right: 12, bottom: 12, height: 76, borderRadius: 30, backgroundColor: theme.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 6 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navIndicator: { minWidth: 64, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  navIndicatorSelected: { backgroundColor: theme.primary },
  navLabel: { color: theme.onSurfaceVariant, fontSize: 11, marginTop: 3, fontWeight: '600' },
  navLabelSelected: { color: theme.onSurface, fontWeight: '700' },
  screenTitle: { color: theme.onSurface, fontSize: 34, fontWeight: '700', letterSpacing: -1, marginBottom: 5 },
  screenSubtitle: { color: theme.onSurfaceVariant, fontSize: 15, lineHeight: 21, marginBottom: 24 },
  featurePreview: { height: 430, borderRadius: 30, overflow: 'hidden', marginBottom: 16 },
  previewImage: { flex: 1, justifyContent: 'flex-end' },
  previewRadius: { borderRadius: 30 },
  previewDepthLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,40,70,0.12)' },
  previewTextBlock: { padding: 22, backgroundColor: 'rgba(0,0,0,0.22)' },
  previewKicker: { color: '#fff', opacity: 0.75, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  previewBig: { color: '#fff', fontSize: 27, fontWeight: '700', marginTop: 5 },
  previewSmall: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4 },
  primaryButton: { minHeight: 54, borderRadius: 18, backgroundColor: theme.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 28 },
  primaryButtonText: { color: theme.onPrimary, fontSize: 15, fontWeight: '800' },
  emptyState: { backgroundColor: theme.surfaceContainer, borderRadius: 30, padding: 30, alignItems: 'center', marginTop: 25 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { color: theme.onSurface, fontSize: 20, fontWeight: '700' },
  emptyBody: { color: theme.onSurfaceVariant, textAlign: 'center', lineHeight: 21, marginTop: 8, marginBottom: 20 },
  secondaryButton: { backgroundColor: theme.surface, borderRadius: 16, paddingHorizontal: 22, paddingVertical: 12 },
  secondaryButtonText: { color: theme.primary, fontWeight: '800' },
  settingsGroup: { backgroundColor: theme.surfaceContainer, borderRadius: 28, paddingVertical: 8, marginBottom: 16 },
  groupLabel: { color: theme.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.3, paddingHorizontal: 20, paddingTop: 13, paddingBottom: 3 },
  settingRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  settingIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  settingCopy: { flex: 1 },
  settingTitle: { color: theme.onSurface, fontSize: 15, fontWeight: '650' },
  settingSubtitle: { color: theme.onSurfaceVariant, fontSize: 12, marginTop: 3 },
  dynamicDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: theme.primary },
  trailingText: { color: theme.primary, fontSize: 13, fontWeight: '700', marginRight: 4 },
  aboutBlock: { alignItems: 'center', paddingVertical: 36 },
  aboutBrand: { color: theme.onSurface, fontSize: 24, fontWeight: '700' },
  aboutText: { color: theme.onSurfaceVariant, marginTop: 5 },
  version: { color: theme.outline, fontSize: 11, marginTop: 12 },
  detailBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  detailSheet: { backgroundColor: theme.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden', paddingBottom: 28 },
  detailImage: { width: '100%', height: 340 },
  detailBody: { padding: 20 },
  detailTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailTitle: { color: theme.onSurface, fontSize: 24, fontWeight: '700' },
  detailMeta: { color: theme.onSurfaceVariant, fontSize: 13, marginTop: 5 },
  favoriteButton: { width: 50, height: 50, borderRadius: 18, backgroundColor: theme.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  detailActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  primaryButtonSmall: { flex: 1, height: 50, borderRadius: 17, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonSmall: { flex: 1, height: 50, borderRadius: 17, backgroundColor: theme.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  editorRoot: { flex: 1, backgroundColor: theme.bg },
  editorTopBar: { height: 70, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: theme.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  editorTitle: { color: theme.onSurface, fontSize: 18, fontWeight: '700' },
  saveTextButton: { paddingHorizontal: 10, paddingVertical: 10 },
  saveText: { color: theme.primary, fontSize: 15, fontWeight: '800' },
  editorCanvas: { height: 470, marginHorizontal: 22, borderRadius: 32, overflow: 'hidden', backgroundColor: theme.surfaceContainer },
  editorImage: { width: '100%', height: '100%' },
  pickPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderTitle: { color: theme.onSurface, fontSize: 19, fontWeight: '700' },
  placeholderBody: { color: theme.onSurfaceVariant, marginTop: 5 },
  mockClock: { position: 'absolute', top: 32, alignSelf: 'center', color: '#fff', fontSize: 54, fontWeight: '200', letterSpacing: -2 },
  depthCutout: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.12)', alignSelf: 'center', top: '40%' },
  previewGlass: { position: 'absolute', left: 16, right: 16, bottom: 16, borderRadius: 22, padding: 14, backgroundColor: 'rgba(20,20,25,0.48)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  previewGlassTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  previewGlassSub: { color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 3 },
  editorControls: { flex: 1 },
  editorControlsContent: { padding: 22, paddingBottom: 35 },
  controlRow: { minHeight: 70, borderRadius: 22, backgroundColor: theme.surfaceContainer, flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 12 },
  controlIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  controlCopy: { flex: 1 },
  controlTitle: { color: theme.onSurface, fontSize: 15, fontWeight: '700' },
  controlSub: { color: theme.onSurfaceVariant, fontSize: 12, marginTop: 3 },
  controlLabel: { color: theme.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.3, marginTop: 15, marginBottom: 10 },
  segmented: { flexDirection: 'row', backgroundColor: theme.surfaceContainer, padding: 4, borderRadius: 18 },
  segment: { flex: 1, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  segmentSelected: { backgroundColor: theme.primary },
  segmentText: { color: theme.onSurfaceVariant, fontSize: 14, fontWeight: '700' },
  segmentTextSelected: { color: theme.onPrimary },
  sliderTrack: { height: 6, borderRadius: 4, backgroundColor: theme.surfaceContainer, position: 'relative', marginTop: 7 },
  sliderFill: { height: 6, borderRadius: 4, backgroundColor: theme.primary },
  sliderStop: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: theme.primary, top: -4, marginLeft: -7 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 },
  sliderLabel: { color: theme.onSurfaceVariant, fontSize: 11 },
  sliderValue: { color: theme.primary, fontSize: 11, fontWeight: '800' },
  editorHint: { color: theme.outline, fontSize: 11, lineHeight: 17, marginTop: 18, textAlign: 'center' },
});

