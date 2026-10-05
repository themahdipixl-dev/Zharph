import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './screens/HomeScreen';
import EditorScreen from './screens/EditorScreen';
import BottomNav from './components/BottomNav';
import { useAppTheme } from './theme';

export default function App() {
  const theme = useAppTheme();
  const [screen, setScreen] = useState('home');
  const [imageUri, setImageUri] = useState(null);
  const [nav, setNav] = useState('Home');

  const openEditor = (uri) => {
    setImageUri(uri);
    setScreen('editor');
  };

  if (screen === 'editor' && imageUri) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <StatusBar style="light" backgroundColor={theme.background} />
        <EditorScreen
        imageUri={imageUri}
        onBack={() => setScreen('home')}
        theme={theme}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar style="light" backgroundColor={theme.background} />
      <HomeScreen onOpenEditor={openEditor} theme={theme} />
      <BottomNav active={nav} onChange={setNav} theme={theme} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
