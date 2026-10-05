import { Image, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export function YouTubeVideo({
  videoId,
  active,
  thumbnailUrl,
}: {
  videoId: string;
  active: boolean;
  thumbnailUrl: string;
}) {
  if (!active) {
    return (
      <View style={styles.placeholder}>
        <Image source={{ uri: thumbnailUrl }} style={StyleSheet.absoluteFill} resizeMode="contain" />
      </View>
    );
  }

  const src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&playsinline=1&controls=1&rel=0&loop=1&playlist=${encodeURIComponent(videoId)}`;

  const html = `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>
html,body{margin:0;width:100%;height:100%;background:#000;overflow:hidden}iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
</style></head><body><iframe src="${src}" title="YouTube video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></body></html>`;

  return (
    <WebView
      style={styles.webview}
      source={{ html, baseUrl: 'https://www.youtube.com' }}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
      setSupportMultipleWindows={false}
      allowsFullscreenVideo
      originWhitelist={['https://*']}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: { ...StyleSheet.absoluteFill, backgroundColor: '#000', justifyContent: 'center' },
  webview: { ...StyleSheet.absoluteFill, backgroundColor: '#000' },
});
