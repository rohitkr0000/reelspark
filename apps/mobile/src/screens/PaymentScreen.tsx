import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { useAuth } from '../lib/AuthProvider';
import { useAppSettings } from '../hooks/useAppSettings';
import {
  useCreateRazorpayOrder,
  useRegistrationPayment,
  useVerifyRazorpayPayment,
} from '../hooks/useRegistrationPayment';
import { openRazorpayCheckout } from '../lib/razorpay';
import { colors, fonts, radius, spacing, type } from '../theme/tokens';
import type { MainStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'Payment'>;

export function PaymentScreen({ navigation }: Props) {
  const { profile, refreshProfile } = useAuth();
  const { settings } = useAppSettings();
  const { data: payment, isLoading } = useRegistrationPayment();
  const createOrder = useCreateRazorpayOrder();
  const verifyPayment = useVerifyRazorpayPayment();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fee = settings.registration_fee_inr;
  const status = profile?.payment_status ?? 'unpaid';

  // Bridge the polled payment row to the profile gate.
  useEffect(() => {
    if (payment?.status === 'approved' && status !== 'approved') refreshProfile();
  }, [payment?.status, status, refreshProfile]);

  async function handlePay() {
    setError(null);
    setBusy(true);
    try {
      const order = await createOrder.mutateAsync();
      const result = await openRazorpayCheckout({
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        prefill: order.prefill,
      });
      await verifyPayment.mutateAsync(result);
    } catch (e) {
      setError((e as Error)?.message ?? 'Payment could not be completed.');
    } finally {
      setBusy(false);
    }
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

  // ---- submitted / pending (manual admin review only) ----------------
  if (!isLoading && payment?.status === 'submitted') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerCard}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(219,50,147,0.18)' }]}>
            <ActivityIndicator color={colors.magenta} />
          </View>
          <Text style={styles.cardTitle}>Waiting for approval</Text>
          <Text style={styles.cardBody}>
            We're confirming your ₹{payment.amount_inr} payment. This page updates automatically once it's done.
          </Text>
          <Button label="Back" variant="secondary" onPress={() => navigation.goBack()} style={{ marginTop: spacing.lg }} />
        </View>
      </SafeAreaView>
    );
  }

  // ---- unpaid / rejected — show the pay screen -----------------------
  const rejected = payment?.status === 'rejected';
  const referred = !!profile?.referred_by;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Complete registration</Text>
          <Text style={styles.subtitle}>
            A one-time ₹{fee} fee unlocks video posting. Pay securely with Razorpay — UPI, cards, net banking and
            wallets are all supported. Posting unlocks the moment your payment is confirmed.
          </Text>
        </View>

        {referred ? (
          <View style={styles.referralBox}>
            <Text style={styles.referralBoxTitle}>
              🎉 Congrats! You’ve got ₹{settings.referral_bonus_inr} on your referral
            </Text>
            <Text style={styles.referralBoxNote}>
              You joined with a friend’s code. Complete your ₹{fee} registration below to lock it in.
            </Text>
          </View>
        ) : null}

        {rejected && payment ? (
          <View style={styles.rejectedBox}>
            <Text style={styles.rejectedTitle}>Previous payment was rejected</Text>
            {payment.admin_note ? <Text style={styles.rejectedNote}>“{payment.admin_note}”</Text> : null}
            <Text style={styles.rejectedNote}>You can retry the payment below.</Text>
          </View>
        ) : null}

        <View style={styles.payCard}>
          <Text style={styles.payLabel}>Registration fee</Text>
          <Text style={styles.amount}>₹{fee}</Text>
          <View style={styles.methodRow}>
            <Feather name="lock" size={13} color={colors.textMuted} />
            <Text style={styles.methodHint}>Secured by Razorpay</Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label={busy ? 'Processing…' : `Pay ₹${fee} with Razorpay`}
          onPress={handlePay}
          disabled={busy}
          loading={busy}
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

  payCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  payLabel: {
    ...type.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  amount: { fontFamily: fonts.monoSemibold, fontSize: 32, color: colors.text, marginVertical: spacing.xs },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  methodHint: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },

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

  referralBox: {
    backgroundColor: 'rgba(125,39,227,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(125,39,227,0.4)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: 4,
  },
  referralBoxTitle: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.text },
  referralBoxNote: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
});
