import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { PlatformChip } from '../components/PlatformChip';
import { detectPlatform } from '../lib/urlParsers';
import { colors, fonts, spacing, type } from '../theme/tokens';

const EXAMPLE_URL = 'https://youtube.com/shorts/9kLmR2vTqXo';

export function SubmitScreen() {
  const [url, setUrl] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const detection = useMemo(() => detectPlatform(url), [url]);
  const isValid = detection.platform !== null;

  function handleSubmit() {
    // TODO: once wired to Supabase, call the `fetch-video-metadata` Edge Function
    // then insert into `videos` (see PROJECT_PLAN.md §5) instead of local state.
    setSubmitted(true);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Submit a video</Text>
        <Text style={styles.subtitle}>Paste a link to your own YouTube Shorts or Instagram Reel.</Text>
      </View>

      <Text style={styles.fieldLabel}>Video URL</Text>
      <TextField
        value={url}
        onChangeText={(v) => {
          setUrl(v);
          setSubmitted(false);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="https://youtube.com/shorts/…"
        valid={isValid}
      />

      {isValid ? (
        <View style={styles.validateRow}>
          <Feather name="check-circle" size={14} color={colors.purple} />
          <Text style={styles.validateText}>
            {detection.platform === 'youtube' ? 'YouTube Shorts detected' : 'Instagram Reel detected'}
          </Text>
        </View>
      ) : (
        <Pressable onPress={() => setUrl(EXAMPLE_URL)}>
          <Text style={styles.tryLink}>Try an example link →</Text>
        </Pressable>
      )}

      {isValid && (
        <View style={styles.metaPreview}>
          <View style={styles.metaThumb} />
          <View style={styles.metaInfo}>
            <Text style={styles.metaTitle} numberOfLines={1}>
              {detection.videoId ? `Video ${detection.videoId}` : 'Untitled submission'}
            </Text>
            <Text style={styles.metaAuthor}>Metadata loads once submitted</Text>
            <PlatformChip platform={detection.platform!} />
          </View>
        </View>
      )}

      <View style={styles.footer}>
        {submitted ? (
          <Text style={styles.successText}>Submitted! We'll review it shortly.</Text>
        ) : (
          <Button label="Submit video" disabled={!isValid} onPress={handleSubmit} />
        )}
        <Text style={styles.helperNote}>Your video stays on YouTube — we never re-host your content.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  header: { marginTop: spacing.md, marginBottom: spacing.lg, gap: spacing.xs },
  title: { ...type.h2, color: colors.text },
  subtitle: { ...type.bodySmall, color: colors.textMuted },
  fieldLabel: {
    ...type.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  validateRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: spacing.sm },
  validateText: { color: colors.purple, fontFamily: fonts.bodySemibold, fontSize: 12 },
  tryLink: { color: colors.pink, fontFamily: fonts.bodySemibold, fontSize: 12, marginTop: spacing.md },
  metaPreview: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaThumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: colors.deepPurple },
  metaInfo: { flex: 1, gap: 4, justifyContent: 'center' },
  metaTitle: { color: colors.text, fontFamily: fonts.bodySemibold, fontSize: 13 },
  metaAuthor: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 11.5 },
  footer: { marginTop: 'auto', gap: spacing.sm, paddingBottom: spacing.md },
  successText: { color: colors.purple, fontFamily: fonts.bodySemibold, fontSize: 14, textAlign: 'center' },
  helperNote: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 11, textAlign: 'center' },
});
