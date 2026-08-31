import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-qr-code';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useAuth } from '../lib/AuthProvider';
import { useAppSettings } from '../hooks/useAppSettings';
import {
  useRegistrationPayment,
  useSubmitRegistrationPayment,
  useUploadPaymentProof,
} from '../hooks/useRegistrationPayment';
import { colors, fonts, radius, spacing, type } from '../theme/tokens';
import type { MainStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'Payment'>;

function upiUri(pa: string, pn: string, amount: number) {
  const params = new URLSearchParams({
    pa,
    pn,
    am: String(amount),
    cu: 'INR',
    tn: 'ReelSpark registration',
  });
  return `upi://pay?${params.toString()}`;
}

export function PaymentScreen({ navigation }: Props) {
  const { profile, refreshProfile } = useAuth();
  const { settings } = useAppSettings();
  const { data: payment, isLoading } = useRegistrationPayment();
  const uploadProof = useUploadPaymentProof();
  const submitPayment = useSubmitRegistrationPayment();

  const [reference, setReference] = useState('');
  const [screenshotPath, setScreenshotPath] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fee = settings.registration_fee_inr;
  const status = profile?.payment_status ?? 'unpaid';

  // Bridge the polled payment row to the profile gate.
  useEffect(() => {
    if (payment?.status === 'approved' && status !== 'approved') refreshProfile();
  }, [payment?.status, status, refreshProfile]);

  async function copyUpiId() {
    try {
      await navigator.clipboard.writeText(settings.upi_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function pickScreenshot() {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (result.canceled) return;
    try {
      const path = await uploadProof.mutateAsync(result.assets[0].uri);
      setScreenshotPath(path);
    } catch (e) {
      setError((e as Error)?.message ?? 'Could not upload the screenshot.');
    }
  }

  function handleSubmit() {
    setError(null);
    submitPayment.mutate(
      { upiReference: reference.trim(), screenshotPath },
      { onError: (e) => setError((e as Error)?.message ?? 'Could not submit. Try again.') },
    );
  }

  // ---- approved -------------------------------------------------------
  if (status === 'approved') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerCard}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(125,39,227,0.18)' }]}>
            <Feather name="check-circle" size={26} color={colors.purple} />
          </View>
          <Text style={styles.cardTitle}>Registration approved</Text>
          <Text style={styles.cardBody}>You're all set — you can now submit your Shorts and Reels.</Text>
          <Button label="Go to Submit" onPress={() => navigation.navigate('Tabs', { screen: 'Submit' })} style={{ marginTop: spacing.lg }} />
        </View>
      </SafeAreaView>
    );
  }

  // ---- submitted / pending -----------------------------------------
  if (!isLoading && payment?.status === 'submitted') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerCard}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(219,50,147,0.18)' }]}>
            <ActivityIndicator color={colors.magenta} />
          </View>
          <Text style={styles.cardTitle}>Waiting for approval</Text>
          <Text style={styles.cardBody}>
            We got your payment details. An admin will verify the ₹{payment.amount_inr} transfer and unlock posting —
            this page updates automatically.
          </Text>
          {payment.upi_reference ? (
            <Text style={styles.metaLine}>Reference: {payment.upi_reference}</Text>
          ) : null}
          <Button label="Back" variant="secondary" onPress={() => navigation.goBack()} style={{ marginTop: spacing.lg }} />
        </View>
      </SafeAreaView>
    );
  }

  // ---- unpaid / rejected — show the pay form -----------------------
  const rejected = payment?.status === 'rejected';
  const canSubmit = reference.trim().length >= 6 && !!screenshotPath && !submitPayment.isPending;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Complete registration</Text>
          <Text style={styles.subtitle}>
            A one-time ₹{fee} fee unlocks video posting. Pay to the UPI ID below, then submit your transaction
            reference for approval.
          </Text>
        </View>

        {rejected && payment ? (
          <View style={styles.rejectedBox}>
            <Text style={styles.rejectedTitle}>Previous submission was rejected</Text>
            {payment.admin_note ? <Text style={styles.rejectedNote}>“{payment.admin_note}”</Text> : null}
            <Text style={styles.rejectedNote}>Double-check the reference number and screenshot, then resubmit.</Text>
          </View>
        ) : null}

        <View style={styles.qrCard}>
          <View style={styles.qrWrap}>
            <QRCode value={upiUri(settings.upi_id, settings.upi_payee_name, fee)} size={188} />
          </View>
          <Text style={styles.amount}>₹{fee}</Text>
          <Pressable style={styles.upiRow} onPress={copyUpiId}>
            <Text style={styles.upiId}>{settings.upi_id}</Text>
            <Feather name={copied ? 'check-circle' : 'grid'} size={14} color={copied ? colors.purple : colors.textMuted} />
            <Text style={styles.copyHint}>{copied ? 'Copied' : 'Tap to copy'}</Text>
          </Pressable>
          <Text style={styles.scanHint}>Scan with any UPI app, or pay the ID directly.</Text>
        </View>

        <Text style={styles.fieldLabel}>UPI transaction / UTR reference</Text>
        <TextField
          value={reference}
          onChangeText={setReference}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="e.g. 4198 7654 3210"
        />

        <Text style={styles.fieldLabel}>Payment screenshot</Text>
        <Pressable style={styles.uploadBox} onPress={pickScreenshot}>
          {uploadProof.isPending ? (
            <ActivityIndicator color={colors.pink} />
          ) : screenshotPath ? (
            <>
              <Feather name="check-circle" size={16} color={colors.purple} />
              <Text style={styles.uploadText}>Screenshot attached — tap to replace</Text>
            </>
          ) : (
            <>
              <Feather name="camera" size={16} color={colors.textMuted} />
              <Text style={styles.uploadText}>Upload a screenshot of the payment</Text>
            </>
          )}
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label={submitPayment.isPending ? 'Submitting…' : 'Submit for approval'}
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={submitPayment.isPending}
          style={{ marginTop: spacing.lg }}
        />
        <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing['2xl'] },
  header: { gap: spacing.xs, marginBottom: spacing.lg, marginTop: spacing.sm },
  title: { ...type.h1, color: colors.text },
  subtitle: { ...type.bodySmall, color: colors.textMuted },

  centerCard: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  cardTitle: { ...type.h3, color: colors.text, textAlign: 'center' },
  cardBody: { ...type.bodySmall, color: colors.textMuted, textAlign: 'center', maxWidth: 320 },
  metaLine: { fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted, marginTop: spacing.xs },

  qrCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  qrWrap: { backgroundColor: '#fff', padding: 12, borderRadius: radius.md },
  amount: { fontFamily: fonts.monoSemibold, fontSize: 22, color: colors.text, marginTop: spacing.sm },
  upiRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  upiId: { fontFamily: fonts.mono, fontSize: 13, color: colors.text },
  copyHint: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  scanHint: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, textAlign: 'center' },

  fieldLabel: {
    ...type.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  uploadText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textMuted },
  error: { ...type.bodySmall, color: colors.coral, marginTop: spacing.sm },

  rejectedBox: {
    backgroundColor: 'rgba(254,73,64,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(254,73,64,0.4)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: 4,
  },
  rejectedTitle: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.coral },
  rejectedNote: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
});
