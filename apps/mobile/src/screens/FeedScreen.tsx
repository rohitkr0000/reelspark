import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Avatar } from '../components/Avatar';
import { PlatformChip } from '../components/PlatformChip';
import { VideoPlayer } from '../components/VideoPlayer';
import { colors, fonts, spacing } from '../theme/tokens';
import { bestYtThumbnail, ytThumbnailFallback } from '../lib/ytThumb';
import { useFeed, incrementViewCount } from '../hooks/useFeed';
import type { Video } from '../types/database';

// Deterministic-looking placeholder gradient per video, shown behind the player
// and whenever a submission has no real thumbnail art (e.g. Instagram, until the
// oEmbed Edge Function exists — YouTube ones use the real thumbnail_url).
const PLACEHOLDER_GRADIENTS: [string, string][] = [
  [colors.orange, colors.pink],
  [colors.magenta, colors.deepPurple],
  [colors.coral, colors.purple],
];

function gradientFor(id: string) {
  const index = id.charCodeAt(0) % PLACEHOLDER_GRADIENTS.length;
  return PLACEHOLDER_GRADIENTS[index];
}

interface FeedItemProps {
  video: Video;
  // Whether this item is the one currently snapped into view. Off-screen items
  // must stop playing so we never have two videos with audio at once.
  isActive: boolean;
  itemHeight: number;
}

function FeedItem({ video, isActive, itemHeight }: FeedItemProps) {
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [views, setViews] = useState(video.view_count_in_app);
  const [gradientFrom, gradientTo] = gradientFor(video.id);
  const countedView = useRef(false);

  // Stop playback as soon as the item scrolls out of view.
  useEffect(() => {
    if (!isActive && playing) {
      setPlaying(false);
    }
  }, [isActive, playing]);

  const startPlayback = useCallback(() => {
    setEnded(false);
    setPlaying(true);
    if (!countedView.current) {
      countedView.current = true;
      setViews((v) => v + 1);
      incrementViewCount(video.id);
    }
  }, [video.id]);

  const togglePlay = useCallback(() => {
    if (playing) {
      setPlaying(false);
    } else {
      startPlayback();
    }
  }, [playing, startPlayback]);

  const handleEnded = useCallback(() => {
    setPlaying(false);
    setEnded(true);
  }, []);

  const initials = (video.author_name ?? '??').slice(0, 2).toUpperCase();

  return (
    <View style={[styles.item, { height: itemHeight }]}>
      <LinearGradient
        colors={[gradientFrom, colors.background, gradientTo]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Poster art while stopped. Raw <img> (react-native-web's <Image> doesn't
          reliably honor resizeMode here, and this is a web-only build). It's
          blurred + scaled as a soft backdrop behind the play button — a given
          video's poster frame can be anything (e.g. a white screen-share), so we
          don't show it sharp. */}
      {!playing && video.thumbnail_url ? (
        <img
          src={bestYtThumbnail(video.thumbnail_url) ?? video.thumbnail_url}
          alt=""
          draggable={false}
          onError={(e) => {
            const el = e.currentTarget;
            const next = ytThumbnailFallback(video.thumbnail_url, el.src);
            if (next) el.src = next;
          }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            backgroundColor: '#000',
            filter: 'blur(40px) brightness(0.55) saturate(1.2)',
            transform: 'scale(1.4)',
          }}
        />
      ) : null}

      {/* The actual player, mounted only while this item is active + playing. */}
      <VideoPlayer
        platform={video.platform}
        videoId={video.platform_video_id}
        playing={isActive && playing}
        onEnded={handleEnded}
        style={styles.playerFill}
      />

      {!playing ? (
        <>
          <View style={styles.posterScrim} pointerEvents="none" />
          <LinearGradient colors={['rgba(0,0,0,0.45)', 'transparent']} style={styles.topGradient} pointerEvents="none" />
          <LinearGradient colors={['transparent', 'rgba(9,9,11,0.95)']} style={styles.bottomGradient} pointerEvents="none" />
          <Text style={styles.forYou}>For You</Text>
        </>
      ) : null}

      {/* Big play affordance while stopped. While playing there is no app chrome —
          tap the video to pause (handled inside the player), swipe up for next. */}
      {!playing ? (
        <View style={styles.playWrap} pointerEvents="box-none">
          <Pressable onPress={togglePlay} style={styles.playBtn} accessibilityLabel="Play video">
            <Ionicons
              name={ended ? 'refresh' : 'play'}
              size={26}
              color="#fff"
              style={ended ? undefined : { marginLeft: 3 }}
            />
          </Pressable>
        </View>
      ) : null}

      {!playing ? (
        <View style={styles.rail}>
          <Pressable style={styles.railBtn} accessibilityLabel="Report video">
            <Feather name="flag" size={18} color="#fff" />
          </Pressable>
          <Pressable style={styles.railBtn} accessibilityLabel="Share video">
            <Feather name="share-2" size={18} color="#fff" />
          </Pressable>
          <View style={styles.railCount}>
            <Text style={styles.railCountNumber}>{views}</Text>
            <Text style={styles.railCountLabel}>views</Text>
          </View>
        </View>
      ) : null}

      {!playing ? (
        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.creatorRow}>
            <Avatar initials={initials} size={26} />
            <Text style={styles.creatorName}>{video.author_name ?? 'Unknown creator'}</Text>
            <PlatformChip platform={video.platform} />
          </View>
          <Text style={styles.caption} numberOfLines={2}>
            {video.title ?? 'Untitled submission'}
          </Text>
          <Text style={styles.swipeHint}>↑ Swipe up for next</Text>
        </View>
      ) : null}
    </View>
  );
}

export function FeedScreen() {
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeed();

  // Each feed item is exactly as tall as the visible feed area (the scene minus
  // the bottom tab bar, or the full height beside the left rail). Seeded from the
  // window height so the list always renders, then corrected by onLayout — the
  // list is keyed on this value so it remounts cleanly when it changes, keeping
  // item height === snapToInterval === getItemLayout length on every device.
  const [areaHeight, setAreaHeight] = useState(() => Math.round(Dimensions.get('window').height));
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    setAreaHeight((prev) => (Math.abs(prev - h) <= 1 ? prev : h));
  }, []);

  const videos = data?.pages.flat() ?? [];

  const [activeId, setActiveId] = useState<string | null>(null);

  // Keep the active id in a ref-stable callback (FlatList warns if this changes).
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((token) => token.isViewable);
    if (first?.item) setActiveId((first.item as Video).id);
  });
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 });

  const renderItem = useCallback(
    ({ item }: { item: Video }) => (
      <FeedItem video={item} isActive={item.id === activeId} itemHeight={areaHeight} />
    ),
    [activeId, areaHeight],
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.pink} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Couldn't load the feed. Pull to try again.</Text>
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No videos yet</Text>
        <Text style={styles.emptyText}>Be the first to submit a Short or Reel — approved submissions show up here.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen} onLayout={onLayout}>
      <FlatList
        // Remount cleanly when the feed area resizes so scroll offsets can't
        // drift out of sync with the new item height.
        key={`feed-${areaHeight}`}
        style={styles.list}
        data={videos}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={areaHeight}
        getItemLayout={(_, index) => ({ length: areaHeight, offset: areaHeight * index, index })}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        onEndReachedThreshold={1.5}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
  list: { flex: 1 },
  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyTitle: { color: colors.text, fontFamily: fonts.displaySemibold, fontSize: 18 },
  emptyText: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, textAlign: 'center' },
  item: { width: '100%', overflow: 'hidden' },
  posterScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(9,9,11,0.18)' },
  playerFill: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 130 },
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 280 },
  forYou: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  playWrap: { position: 'absolute', top: '50%', left: '50%', marginTop: -37, marginLeft: -37 },
  playBtn: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(9,9,11,0.45)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rail: { position: 'absolute', right: 14, bottom: 100, alignItems: 'center', gap: 18 },
  railBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  railCount: { alignItems: 'center' },
  railCountNumber: { color: colors.text, fontFamily: fonts.monoSemibold, fontSize: 12 },
  railCountLabel: { color: colors.textMuted, fontFamily: fonts.mono, fontSize: 10 },
  overlay: { position: 'absolute', left: 18, right: 74, bottom: 40, gap: 8 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  creatorName: { color: colors.text, fontFamily: fonts.bodySemibold, fontSize: 14 },
  caption: { color: '#EDEDF2', fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  swipeHint: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 11 },
});
