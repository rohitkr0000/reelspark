import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { supabase } from '../../lib/supabase';
import { colors, spacing, type } from '../../theme/tokens';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export function SignUpScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    navigation.navigate('CompleteProfile');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Join creators trading real attention for real views.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextField value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />

          <Text style={styles.label}>Password</Text>
          <TextField value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 8 characters" />

          <Text style={styles.label}>Confirm password</Text>
          <TextField value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="••••••••" />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label="Create account" onPress={handleSignUp} loading={loading} style={{ marginTop: spacing.md }} />
        </View>

        <Button label="Already have an account? Log in" variant="ghost" onPress={() => navigation.navigate('Login')} />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, justifyContent: 'space-between' },
  header: { marginTop: spacing.xl, gap: spacing.xs },
  title: { ...type.h1, color: colors.text },
  subtitle: { ...type.bodySmall, color: colors.textMuted },
  form: { gap: spacing.sm },
  label: { ...type.label, color: colors.textMuted, textTransform: 'uppercase', marginTop: spacing.md, marginBottom: spacing.xs },
  error: { ...type.bodySmall, color: colors.coral, marginTop: spacing.sm },
});
