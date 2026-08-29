import { useCallback, useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View, ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Avatar } from '../components/Avatar';
import { PlatformChip } from '../components/PlatformChip';
import { colors, fonts, spacing } from '../theme/tokens';
import { mockFeed, type FeedVideo } from '../data/mockVideos';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FeedItemProps {
  video: FeedVideo;
  isActive: boolean;
}

function FeedItem({ video, isActive }: FeedItemProps) {
  const [playing, setPlaying] = useState(false);
  const [views, setViews] = useState(video.inAppViews);

  function togglePlay() {
    const next = !playing;
    setPlaying(next);
    // NOTE: swap this placeholder for react-native-youtube-iframe / a WebView embed
    // of `video.platform_video_id`, gated on `isActive` so only the focused item
    // ever mounts a live player. On the YouTube player's onChangeState('ended'),
    // advance the FlatList to the next index (see PROJECT_PLAN.md §4).
    if (next) setViews((v) => v + 1);
  }

  return (
    <View style={[styles.item, { height: SCREEN_HEIGHT }]}>
      <LinearGradient
        colors={[video.gradientFrom, colors.background, video.gradientTo]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient colors={['rgba(0,0,0,0.45)', 'transparent']} style={styles.topGradient} pointerEvents="none" />
      <LinearGradient colors={['transparent', 'rgba(9,9,11,0.95)']} style={styles.bottomGradient} pointerEvents="none" />

      <Text style={styles.forYou}>For You</Text>

      <View style={styles.playWrap}>
        <Pressable onPress={togglePlay} style={styles.playBtn}>
          <Ionicons name={playing ? 'pause' : 'play'} size={26} color="#fff" style={playing ? undefined : { marginLeft: 3 }} />
        </Pressable>
      </View>

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

      <View style={styles.overlay}>
        <View style={styles.creatorRow}>
          <Avatar initials={video.initials} size={26} />
          <Text style={styles.creatorName}>{video.creatorHandle}</Text>
          <PlatformChip platform={video.platform} />
        </View>
        <Text style={styles.caption}>{video.caption}</Text>
        <Text style={styles.swipeHint}>↑ Swipe up for next</Text>
      </View>
    </View>
  );
}

export function FeedScreen() {
  const [activeIndex, setActiveIndex] = useState(0);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 90 }).current;

  const renderItem = useCallback(
    ({ item, index }: { item: FeedVideo; index: number }) => <FeedItem video={item} isActive={index === activeIndex} />,
    [activeIndex]
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={mockFeed}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={SCREEN_HEIGHT}
        getItemLayout={(_, index) => ({ length: SCREEN_HEIGHT, offset: SCREEN_HEIGHT * index, index })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  item: { width: '100%', overflow: 'hidden' },
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
