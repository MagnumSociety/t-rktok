import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  ViewToken,
} from 'react-native';
import { YouTubeVideo } from './src/components/YouTubeVideo';
import type { TopicId, YouTubeFeedItem } from './src/types';
import { fetchTopicPage, TOPICS } from './src/youtube';

const KEY_STORAGE = 'turktok.youtubeApiKey';

const compact = (value?: number) => {
  if (value == null) return '—';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

const duration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export default function App() {
  const { height } = useWindowDimensions();
  const [topicId, setTopicId] = useState<TopicId>('erdogan');
  const [apiKey, setApiKey] = useState('');
  const [draftKey, setDraftKey] = useState('');
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(false);
  const [items, setItems] = useState<YouTubeFeedItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topic = useMemo(
    () => TOPICS.find((entry) => entry.id === topicId) ?? TOPICS[0],
    [topicId],
  );

  useEffect(() => {
    void (async () => {
      const envKey = (process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || '').trim();
      const stored = await SecureStore.getItemAsync(KEY_STORAGE).catch(() => null);
      const key = stored?.trim() || envKey;
      setApiKey(key);
      setDraftKey(key);
      setReady(true);
      if (!key) setSettings(true);
    })();
  }, []);

  const loadFirst = useCallback(async (isRefresh = false) => {
    if (!apiKey.trim()) {
      setSettings(true);
      return;
    }
    setError(null);
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const page = await fetchTopicPage(apiKey, topic);
      setItems(page.items);
      setNextPageToken(page.nextPageToken);
      setActiveId(page.items[0]?.id ?? null);
    } catch (e) {
      setItems([]);
      setNextPageToken(undefined);
      setActiveId(null);
      setError(e instanceof Error ? e.message : 'Feed konnte nicht geladen werden.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiKey, topic]);

  useEffect(() => {
    if (ready && apiKey) void loadFirst(false);
  }, [ready, apiKey, topicId, loadFirst]);

  const loadMore = useCallback(async () => {
    if (!apiKey || !nextPageToken || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const page = await fetchTopicPage(apiKey, topic, nextPageToken);
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...page.items.filter((item) => !seen.has(item.id))];
      });
      setNextPageToken(page.nextPageToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Weitere Videos konnten nicht geladen werden.');
    } finally {
      setLoadingMore(false);
    }
  }, [apiKey, nextPageToken, loadingMore, loading, topic]);

  const saveKey = useCallback(async () => {
    const key = draftKey.trim();
    if (!key) {
      setError('Bitte einen YouTube Data API Key eingeben.');
      return;
    }
    await SecureStore.setItemAsync(KEY_STORAGE, key);
    setApiKey(key);
    setSettings(false);
    setError(null);
  }, [draftKey]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 65 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken<YouTubeFeedItem>> }) => {
      const visible = viewableItems.find((entry) => entry.isViewable)?.item;
      if (visible) setActiveId(visible.id);
    },
  ).current;

  if (!ready) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Türktok startet …</Text>
      </View>
    );
  }

  return (
    <View style={styles.app}>
      <StatusBar style="light" />

      <SafeAreaView style={styles.header}>
        <View style={styles.tabs}>
          {TOPICS.map((entry) => (
            <Pressable
              key={entry.id}
              onPress={() => setTopicId(entry.id)}
              style={[styles.tab, topicId === entry.id && styles.tabActive]}
            >
              <Text
                numberOfLines={2}
                style={[styles.tabText, topicId === entry.id && styles.tabTextActive]}
              >
                {entry.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={styles.settingsButton}
          onPress={() => {
            setDraftKey(apiKey);
            setSettings(true);
          }}
        >
          <Text style={styles.settingsText}>⚙</Text>
        </Pressable>
      </SafeAreaView>

      {loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.muted}>{topic.label} lädt …</Text>
        </View>
      ) : items.length > 0 ? (
        <FlatList
          data={items}
          key={`${topicId}:${height}`}
          keyExtractor={(item) => item.id}
          pagingEnabled
          snapToInterval={height}
          decelerationRate="fast"
          disableIntervalMomentum
          showsVerticalScrollIndicator={false}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.8}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadFirst(true)}
              tintColor="#fff"
            />
          }
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}><ActivityIndicator /></View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { height }]}>
              <View style={styles.player}>
                <YouTubeVideo
                  videoId={item.id}
                  active={activeId === item.id}
                  thumbnailUrl={item.thumbnailUrl}
                />
              </View>

              <View style={styles.brandRow}>
                <Image source={require('./assets/icon.png')} style={styles.icon} />
                <View>
                  <Text style={styles.brand}>Türktok</Text>
                  <Text style={styles.brandSub}>{topic.label}</Text>
                </View>
              </View>

              <View style={styles.meta}>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.channel} numberOfLines={1}>{item.channelTitle}</Text>
                <Text style={styles.stats}>
                  ▶ {compact(item.viewCount)}   ♥ {compact(item.likeCount)}   ⏱ {duration(item.durationSeconds)}
                </Text>
              </View>

              <Pressable
                style={styles.openButton}
                onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${encodeURIComponent(item.id)}`)}
              >
                <Text style={styles.openButtonText}>↗</Text>
              </Pressable>
            </View>
          )}
        />
      ) : (
        <View style={styles.center}>
          <Image source={require('./assets/icon.png')} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>Kein Feed verfügbar</Text>
          <Text style={styles.muted}>
            {error || 'Für dieses Thema wurden keine passenden kurzen Videos gefunden.'}
          </Text>
          <Pressable style={styles.primary} onPress={() => void loadFirst(true)}>
            <Text style={styles.primaryText}>Neu laden</Text>
          </Pressable>
        </View>
      )}

      {error && items.length > 0 ? (
        <Pressable style={styles.toast} onPress={() => setError(null)}>
          <Text style={styles.toastText}>{error}</Text>
        </Pressable>
      ) : null}

      <Modal
        visible={settings}
        transparent
        animationType="fade"
        onRequestClose={() => apiKey && setSettings(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <Image source={require('./assets/icon.png')} style={styles.modalIcon} />
            <Text style={styles.modalTitle}>YouTube API-Key</Text>
            <Text style={styles.modalText}>
              Für die Suche nach öffentlichen YouTube-Videos benötigt Türktok einen
              YouTube Data API v3 Key. Er wird lokal im Secure Store gespeichert.
            </Text>
            <TextInput
              value={draftKey}
              onChangeText={setDraftKey}
              placeholder="AIza…"
              placeholderTextColor="#777"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <Pressable style={styles.primary} onPress={() => void saveKey()}>
              <Text style={styles.primaryText}>Speichern & Feed laden</Text>
            </Pressable>
            {apiKey ? (
              <Pressable style={styles.cancel} onPress={() => setSettings(false)}>
                <Text style={styles.cancelText}>Abbrechen</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#050505' },
  center: {
    flex: 1,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  muted: { color: '#bbb', textAlign: 'center', fontSize: 14, lineHeight: 21 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    paddingTop: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  tabs: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,.72)',
    borderRadius: 18,
    padding: 4,
    gap: 3,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: '#ddd', fontSize: 10, fontWeight: '800', textAlign: 'center' },
  tabTextActive: { color: '#111' },
  settingsButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(0,0,0,.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsText: { color: '#fff', fontSize: 21 },
  card: { width: '100%', backgroundColor: '#050505', overflow: 'hidden' },
  player: {
    position: 'absolute',
    top: 112,
    left: 0,
    right: 0,
    bottom: 190,
    backgroundColor: '#000',
  },
  brandRow: {
    position: 'absolute',
    top: 70,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  icon: { width: 34, height: 34, borderRadius: 8 },
  brand: { color: '#fff', fontSize: 18, fontWeight: '900' },
  brandSub: { color: '#aaa', fontSize: 10, fontWeight: '700' },
  meta: { position: 'absolute', left: 16, right: 76, bottom: 28 },
  title: { color: '#fff', fontSize: 16, lineHeight: 21, fontWeight: '900' },
  channel: { color: '#bbb', marginTop: 6, fontSize: 13, fontWeight: '700' },
  stats: { color: '#ddd', marginTop: 8, fontSize: 12, fontWeight: '700' },
  openButton: {
    position: 'absolute',
    right: 16,
    bottom: 38,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openButtonText: { color: '#111', fontSize: 22, fontWeight: '900' },
  footer: { height: 80, justifyContent: 'center' },
  emptyIcon: { width: 108, height: 108, borderRadius: 24 },
  emptyTitle: { color: '#fff', fontSize: 23, fontWeight: '900' },
  primary: {
    minHeight: 46,
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#A62F2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '900' },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    zIndex: 80,
    backgroundColor: 'rgba(130,20,20,.96)',
    borderRadius: 14,
    padding: 12,
  },
  toastText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  modal: {
    width: '100%',
    maxWidth: 470,
    borderRadius: 24,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#333',
    padding: 22,
  },
  modalIcon: { width: 76, height: 76, borderRadius: 18, alignSelf: 'center' },
  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 12,
  },
  modalText: { color: '#bbb', textAlign: 'center', lineHeight: 19, marginTop: 8 },
  input: {
    minHeight: 50,
    marginTop: 18,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#444',
    backgroundColor: '#090909',
    color: '#fff',
    paddingHorizontal: 14,
  },
  cancel: { padding: 12, marginTop: 4, alignItems: 'center' },
  cancelText: { color: '#ddd', fontWeight: '800' },
});
