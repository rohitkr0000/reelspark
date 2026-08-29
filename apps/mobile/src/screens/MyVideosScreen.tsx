import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { StatusBadge } from '../components/Badge';
import { colors, fonts, gradient, spacing, type } from '../theme/tokens';
import { mockMyVideos, type MyVideo } from '../data/mockVideos';
import type { MainTabParamList } from '../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'MyVideos'>;

function VideoRow({ video }: { video: MyVideo }) {
  return (
    <Pressable style={styles.row}>
      <LinearGradient colors={[video.gradientFrom, video.gradientTo]} style={styles.thumb} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {video.title}
        </Text>
        <View style={styles.rowMeta}>
          <StatusBadge status={video.status} />
          {video.views != null && <Text style={styles.rowViews}>{video.views} views</Text>}
        </View>
        {video.rejectionReason && <Text style={styles.rowReason}>Reason: {video.rejectionReason}</Text>}
      </View>
    </Pressable>
  );
}

export function MyVideosScreen({ navigation }: Props) {
  const totalViews = mockMyVideos.reduce((sum, v) => sum + (v.views ?? 0), 0);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>My videos</Text>
        <Text style={styles.statLine}>
          <Text style={styles.statNumber}>{mockMyVideos.length}</Text> submissions ·{' '}
          <Text style={styles.statNumber}>{totalViews}</Text> in-app views total
        </Text>
      </View>

      <FlatList
        data={mockMyVideos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <VideoRow video={item} />}
        contentContainerStyle={styles.list}
      />

      <Pressable style={styles.fab} onPress={() => navigation.navigate('Submit')} accessibilityLabel="Submit new video">
        <LinearGradient
          colors={gradient.brand}
          locations={gradient.brandLocations}
          style={styles.fabInner}
        >
          <Feather name="plus" size={22} color="#fff" />
        </LinearGradient>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: 4 },
  title: { ...type.h2, color: colors.text },
  statLine: { fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted },
  statNumber: { color: colors.text },
  list: { padding: spacing.xl, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    marginBottom: spacing.sm,
  },
  thumb: { width: 56, height: 56, borderRadius: 8 },
  rowInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  rowTitle: { color: colors.text, fontFamily: fonts.bodySemibold, fontSize: 13 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowViews: { color: colors.textMuted, fontFamily: fonts.mono, fontSize: 11 },
  rowReason: { color: colors.coral, fontFamily: fonts.body, fontSize: 10.5, marginTop: 2 },
  fab: { position: 'absolute', right: spacing.xl, bottom: spacing.xl },
  fabInner: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
