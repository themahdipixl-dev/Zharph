import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import EditorScreen from './src/screens/EditorScreen';
import BottomNav from './src/components/BottomNav';
import { useAppTheme } from './src/theme';

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
      <EditorScreen
        imageUri={imageUri}
        onBack={() => setScreen('home')}
        theme={theme}
      />
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <HomeScreen onOpenEditor={openEditor} theme={theme} />
      <BottomNav active={nav} onChange={setNav} theme={theme} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
