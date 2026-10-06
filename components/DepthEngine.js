import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { ENGINE_HTML } from '../services/depth/engineHtml';

const INACTIVITY_MS = 90000;

export default function DepthEngine({ job, onProgress, onResult, onError }) {
  const webRef = useRef(null);
  const timer = useRef(null);
  const cb = useRef({});
  cb.current = { onProgress, onResult, onError };

  const arm = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => cb.current.onError && cb.current.onError('Layer analysis timed out'),
      INACTIVITY_MS,
    );
  };

  useEffect(() => {
    arm();
    return () => clearTimeout(timer.current);
  }, []);

  const handleMessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch (error) {
      return;
    }
    arm();
    if (msg.type === 'ready') {
      webRef.current && webRef.current.injectJavaScript('window.__analyze(' + JSON.stringify(job) + ');true;');
    } else if (msg.type === 'progress') {
      cb.current.onProgress && cb.current.onProgress(msg);
    } else if (msg.type === 'warn') {
      console.warn('[DepthEngine]', msg.message);
    } else if (msg.type === 'result') {
      clearTimeout(timer.current);
      cb.current.onResult && cb.current.onResult(msg);
    } else if (msg.type === 'error') {
      clearTimeout(timer.current);
      cb.current.onError && cb.current.onError(msg.message || 'Layer analysis failed');
    }
  };

  return (
    <View pointerEvents="none" style={styles.hidden}>
      <WebView
        ref={webRef}
        source={{ html: ENGINE_HTML, baseUrl: 'https://zharph.app/' }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled
        onMessage={handleMessage}
        onError={() => cb.current.onError && cb.current.onError('The analysis engine could not start')}
        onRenderProcessGone={() => cb.current.onError && cb.current.onError('The analysis engine ran out of memory')}
        style={styles.web}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { position: 'absolute', left: 0, bottom: 0, width: 2, height: 2, opacity: 0, overflow: 'hidden' },
  web: { width: 2, height: 2 },
});