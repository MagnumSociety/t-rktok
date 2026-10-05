import type { Topic, YouTubeFeedItem, YouTubeFeedPage } from './types';

const API = 'https://www.googleapis.com/youtube/v3';

export const TOPICS: Topic[] = [
  { id: 'erdogan', label: 'Erdogan Düzenlemeleri', query: 'Erdogan Düzenlemeleri' },
  { id: 'ataturk', label: 'Atatürk düzenlemeleri', query: 'Atatürk düzenlemeleri' },
  { id: 'halay', label: 'Halay mix', query: 'Halay mix' },
];

function parseIsoDuration(value: string): number {
  const match = value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const [, days, hours, minutes, seconds] = match;
  return (
    (Number(days || 0) * 24 * 60 * 60) +
    (Number(hours || 0) * 60 * 60) +
    (Number(minutes || 0) * 60) +
    Number(seconds || 0)
  );
}

async function youtubeJson<T>(url: URL): Promise<T> {
  const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.error?.message || `YouTube API Fehler (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}

type SearchResponse = {
  nextPageToken?: string;
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      description?: string;
      channelTitle?: string;
      publishedAt?: string;
      liveBroadcastContent?: string;
      thumbnails?: Record<string, { url?: string }>;
    };
  }>;
};

type VideosResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      channelTitle?: string;
      publishedAt?: string;
      liveBroadcastContent?: string;
      thumbnails?: Record<string, { url?: string }>;
    };
    contentDetails?: { duration?: string };
    status?: { embeddable?: boolean; privacyStatus?: string };
    statistics?: { viewCount?: string; likeCount?: string };
  }>;
};

/**
 * Loads one page of short, embeddable YouTube videos for a fixed topic.
 * The official Data API does not expose a reliable "is Short" flag, so the
 * final list is filtered to <= 180 seconds after search.list returns short videos.
 */
export async function fetchTopicPage(
  apiKey: string,
  topic: Topic,
  pageToken?: string,
): Promise<YouTubeFeedPage> {
  const key = apiKey.trim();
  if (!key) throw new Error('Bitte zuerst einen YouTube-API-Key hinterlegen.');

  const searchUrl = new URL(`${API}/search`);
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('q', topic.query);
  searchUrl.searchParams.set('maxResults', '25');
  searchUrl.searchParams.set('order', 'relevance');
  searchUrl.searchParams.set('videoEmbeddable', 'true');
  searchUrl.searchParams.set('videoDuration', 'short');
  searchUrl.searchParams.set('safeSearch', 'moderate');
  searchUrl.searchParams.set('relevanceLanguage', 'tr');
  searchUrl.searchParams.set('regionCode', 'TR');
  searchUrl.searchParams.set('key', key);
  if (pageToken) searchUrl.searchParams.set('pageToken', pageToken);

  const search = await youtubeJson<SearchResponse>(searchUrl);
  const ids = (search.items || [])
    .map((item) => item.id?.videoId)
    .filter((id): id is string => Boolean(id));

  if (!ids.length) return { items: [], nextPageToken: search.nextPageToken };

  const videosUrl = new URL(`${API}/videos`);
  videosUrl.searchParams.set('part', 'snippet,contentDetails,status,statistics');
  videosUrl.searchParams.set('id', ids.join(','));
  videosUrl.searchParams.set('key', key);

  const videos = await youtubeJson<VideosResponse>(videosUrl);
  const byId = new Map((videos.items || []).map((v) => [v.id, v]));

  const items: YouTubeFeedItem[] = [];
  for (const id of ids) {
    const video = byId.get(id);
    if (!video) continue;

    const durationSeconds = parseIsoDuration(video.contentDetails?.duration || '');
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 180) continue;
    if (video.status?.embeddable === false || video.status?.privacyStatus === 'private') continue;
    if (video.snippet?.liveBroadcastContent && video.snippet.liveBroadcastContent !== 'none') continue;

    const thumbnails = video.snippet?.thumbnails || {};
    const thumbnailUrl =
      thumbnails.maxres?.url ||
      thumbnails.standard?.url ||
      thumbnails.high?.url ||
      thumbnails.medium?.url ||
      thumbnails.default?.url ||
      `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;

    items.push({
      id,
      title: video.snippet?.title || 'YouTube Video',
      description: video.snippet?.description || '',
      channelTitle: video.snippet?.channelTitle || 'YouTube',
      publishedAt: video.snippet?.publishedAt || new Date(0).toISOString(),
      thumbnailUrl,
      durationSeconds,
      viewCount: Number.isFinite(Number(video.statistics?.viewCount)) ? Number(video.statistics?.viewCount) : undefined,
      likeCount: Number.isFinite(Number(video.statistics?.likeCount)) ? Number(video.statistics?.likeCount) : undefined,
    });
  }

  return { items, nextPageToken: search.nextPageToken };
}
