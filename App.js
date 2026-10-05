import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');
const previewHeight = Math.min(height * 0.66, width * 1.48);

export default function App() {
  const [imageUri, setImageUri] = useState(null);
  const [depthEnabled, setDepthEnabled] = useState(true);

  const previewSource = useMemo(
    () => (imageUri ? { uri: imageUri } : require('./assets/placeholder.jpg')),
    [imageUri]
  );

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
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#171719', '#0D0D0F', '#080809']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Zharph</Text>
            <Text style={styles.subtitle}>Depth wallpapers</Text>
          </View>

          <Pressable style={styles.headerButton} onPress={pickWallpaper}>
            <Text style={styles.headerButtonText}>＋</Text>
          </Pressable>
        </View>

        <View style={styles.previewWrap}>
          <View style={styles.preview}>
            <Image source={previewSource} style={styles.wallpaper} resizeMode="cover" />

            <LinearGradient
              pointerEvents="none"
              colors={['rgba(0,0,0,0.25)', 'transparent', 'rgba(0,0,0,0.42)']}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.clockLayer}>
              <Text style={styles.clock}>10:42</Text>
              <Text style={styles.date}>Monday, October 5</Text>
            </View>

            {depthEnabled && (
              <View style={styles.depthHint}>
                <BlurView intensity={30} tint="dark" style={styles.hintBlur}>
                  <Text style={styles.hintText}>Depth preview</Text>
                </BlurView>
              </View>
            )}
          </View>
        </View>

        <BlurView intensity={38} tint="dark" style={styles.controlPanel}>
          <View style={styles.panelTop}>
            <View>
              <Text style={styles.panelTitle}>Depth Effect</Text>
              <Text style={styles.panelCaption}>
                Put the clock behind your subject
              </Text>
            </View>

            <Pressable
              onPress={() => setDepthEnabled((value) => !value)}
              style={[styles.switch, depthEnabled && styles.switchActive]}
            >
              <View style={[styles.knob, depthEnabled && styles.knobActive]} />
            </Pressable>
          </View>

          <Pressable style={styles.chooseButton} onPress={pickWallpaper}>
            <Text style={styles.chooseText}>
              {imageUri ? 'Change wallpaper' : 'Choose wallpaper'}
            </Text>
          </Pressable>

          <Pressable style={styles.setButton}>
            <LinearGradient
              colors={['#FFFFFF', '#DCDCDC']}
              style={styles.setGradient}
            >
              <Text style={styles.setText}>Set Wallpaper</Text>
            </LinearGradient>
          </Pressable>
        </BlurView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080809' },
  safe: { flex: 1, paddingHorizontal: 18 },
  header: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 12,
    marginTop: 1,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  headerButtonText: { color: '#FFF', fontSize: 27, fontWeight: '300', marginTop: -2 },
  previewWrap: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  preview: {
    width: width - 42,
    height: previewHeight,
    maxHeight: height * 0.60,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#1A1A1C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  wallpaper: { ...StyleSheet.absoluteFillObject, backgroundColor: '#222' },
  clockLayer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  clock: {
    color: '#FFF',
    fontSize: 66,
    lineHeight: 70,
    fontWeight: '300',
    letterSpacing: -3,
  },
  date: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 3,
  },
  depthHint: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    borderRadius: 18,
    overflow: 'hidden',
  },
  hintBlur: {
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  hintText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },
  controlPanel: {
    borderRadius: 28,
    overflow: 'hidden',
    padding: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  panelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelTitle: { color: '#FFF', fontSize: 16, fontWeight: '650' },
  panelCaption: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 11,
    marginTop: 4,
  },
  switch: {
    width: 48,
    height: 29,
    borderRadius: 16,
    padding: 3,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  switchActive: { backgroundColor: 'rgba(255,255,255,0.28)' },
  knob: {
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.70)',
  },
  knobActive: { alignSelf: 'flex-end', backgroundColor: '#FFF' },
  chooseButton: {
    height: 48,
    borderRadius: 17,
    marginTop: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  chooseText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  setButton: {
    height: 50,
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 9,
  },
  setGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  setText: { color: '#101012', fontSize: 14, fontWeight: '750' },
});
