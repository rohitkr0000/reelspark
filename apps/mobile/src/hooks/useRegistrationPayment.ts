import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthProvider';
import type { RegistrationPayment } from '../types/database';

// The current user's most recent registration payment attempt. While it's still
// 'submitted' we poll so an admin approval shows up without a manual reload.
export function useRegistrationPayment() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['registrationPayment', userId],
    enabled: !!userId,
    refetchInterval: (query) =>
      (query.state.data as RegistrationPayment | null)?.status === 'submitted' ? 15000 : false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registration_payments')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as RegistrationPayment | null) ?? null;
    },
  });
}

// Upload a payment screenshot to the private payment-proofs bucket; returns the
// storage path to hand to submit_registration_payment. Mirrors useUploadAvatar.
export function useUploadPaymentProof() {
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (localUri: string) => {
      if (!session?.user) throw new Error('Not logged in.');
      const response = await fetch(localUri);
      const arrayBuffer = await response.arrayBuffer();
      const path = `${session.user.id}/proof-${Date.now()}.jpg`;

      const { error } = await supabase.storage
        .from('payment-proofs')
        .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;

      return path;
    },
  });
}

export function useSubmitRegistrationPayment() {
  const queryClient = useQueryClient();
  const { session, refreshProfile } = useAuth();

  return useMutation({
    mutationFn: async ({ upiReference, screenshotPath }: { upiReference: string; screenshotPath: string | null }) => {
      const { data, error } = await supabase.rpc('submit_registration_payment', {
        p_upi_reference: upiReference,
        p_screenshot_path: screenshotPath,
      });
      if (error) throw error;
      return data as RegistrationPayment;
    },
    onSuccess: async () => {
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['registrationPayment', session?.user.id] });
    },
  });
}
