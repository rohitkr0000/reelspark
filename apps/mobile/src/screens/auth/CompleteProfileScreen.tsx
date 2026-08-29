import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthProvider';
import { colors, spacing, type } from '../../theme/tokens';

export function CompleteProfileScreen() {
  const { refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [youtubeHandle, setYoutubeHandle] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!displayName.trim()) {
      setError('Add a display name to continue.');
      return;
    }
    setError(null);
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          youtube_handle: youtubeHandle.trim() || null,
          instagram_handle: instagramHandle.trim() || null,
        })
        .eq('id', data.user.id);
    }
    setLoading(false);
    // RootNavigator switches to MainTabs automatically once profile.display_name is set.
    await refreshProfile();
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Complete your profile</Text>
        <Text style={styles.subtitle}>Just a couple details before you submit your first video.</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Display name</Text>
        <TextField value={displayName} onChangeText={setDisplayName} placeholder="Marcus Reyes" />

        <Text style={styles.label}>YouTube handle (optional)</Text>
        <TextField value={youtubeHandle} onChangeText={setYoutubeHandle} autoCapitalize="none" placeholder="@marcusfilms" />

        <Text style={styles.label}>Instagram handle (optional)</Text>
        <TextField value={instagramHandle} onChangeText={setInstagramHandle} autoCapitalize="none" placeholder="@marcus.edits" />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Continue" onPress={handleContinue} loading={loading} style={{ marginTop: spacing.lg }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  header: { marginTop: spacing.xl, gap: spacing.xs, marginBottom: spacing.xl },
  title: { ...type.h1, color: colors.text },
  subtitle: { ...type.bodySmall, color: colors.textMuted },
  form: { gap: spacing.sm },
  label: { ...type.label, color: colors.textMuted, textTransform: 'uppercase', marginTop: spacing.md, marginBottom: spacing.xs },
  error: { ...type.bodySmall, color: colors.coral, marginTop: spacing.sm },
});
