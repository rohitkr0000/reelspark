import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { colors, fonts, spacing, type } from '../theme/tokens';
import { mockMyVideos } from '../data/mockVideos';

const SETTINGS_ITEMS = ['Account settings', 'Notifications', 'Help & support'];

export function ProfileScreen() {
  const totalViews = mockMyVideos.reduce((sum, v) => sum + (v.views ?? 0), 0);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <View style={styles.avatarRing}>
            <Avatar initials="MR" size={78} />
            <View style={styles.avatarEdit}>
              <Feather name="edit-2" size={12} color="#fff" />
            </View>
          </View>
          <Text style={styles.name}>Marcus Reyes</Text>
          <Text style={styles.bio}>Editor &amp; motion designer. Posting shorts daily.</Text>

          <View style={styles.handleRow}>
            <View style={styles.handleChip}>
              <View style={[styles.platformMark, { backgroundColor: colors.orange }]}>
                <Text style={styles.platformMarkText}>YT</Text>
              </View>
              <Text style={styles.handleText}>@marcusfilms</Text>
            </View>
            <View style={styles.handleChip}>
              <View style={[styles.platformMark, { backgroundColor: colors.magenta }]}>
                <Text style={styles.platformMarkText}>IG</Text>
              </View>
              <Text style={styles.handleText}>@marcus.edits</Text>
            </View>
          </View>
        </View>

        <View style={styles.statTiles}>
          <View style={styles.statTile}>
            <Text style={styles.statNum}>{mockMyVideos.length}</Text>
            <Text style={styles.statLbl}>Videos submitted</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statNum}>{totalViews}</Text>
            <Text style={styles.statLbl}>In-app views</Text>
            <Text style={styles.statSub}>not your real platform count</Text>
          </View>
        </View>

        <Button label="Edit profile" variant="secondary" />

        <View style={styles.settingsList}>
          {SETTINGS_ITEMS.map((item) => (
            <Pressable key={item} style={styles.settingsItem}>
              <Text style={styles.settingsLabel}>{item}</Text>
              <Feather name="chevron-right" size={18} color="#4A4A52" />
            </Pressable>
          ))}
          <Pressable style={styles.settingsItem} onPress={() => supabase.auth.signOut()}>
            <Text style={[styles.settingsLabel, styles.danger]}>Log out</Text>
            <Feather name="chevron-right" size={18} color={colors.coral} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg },
  head: { alignItems: 'center', gap: 4 },
  avatarRing: { position: 'relative' },
  avatarEdit: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...type.h3, color: colors.text, marginTop: spacing.sm },
  bio: { ...type.bodySmall, color: colors.textMuted, textAlign: 'center' },
  handleRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  handleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    paddingLeft: 6,
  },
  platformMark: { width: 18, height: 18, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  platformMarkText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 9 },
  handleText: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 12 },
  statTiles: { flexDirection: 'row', gap: spacing.sm },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  statNum: { fontFamily: fonts.monoSemibold, fontSize: 20, color: colors.text },
  statLbl: { fontFamily: fonts.body, fontSize: 10.5, color: colors.textMuted, marginTop: 2 },
  statSub: { fontFamily: fonts.body, fontSize: 9, color: '#68686F', marginTop: 3 },
  settingsList: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsLabel: { color: colors.text, fontFamily: fonts.body, fontSize: 13.5 },
  danger: { color: colors.coral },
});
