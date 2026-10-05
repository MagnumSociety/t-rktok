export type TopicId = 'erdogan' | 'ataturk' | 'halay';

export type Topic = {
  id: TopicId;
  label: string;
  query: string;
};

export type YouTubeFeedItem = {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  durationSeconds: number;
  viewCount?: number;
  likeCount?: number;
};

export type YouTubeFeedPage = {
  items: YouTubeFeedItem[];
  nextPageToken?: string;
};
