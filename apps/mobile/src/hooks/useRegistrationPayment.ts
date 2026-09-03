import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { callEdgeFunction } from '../lib/edge';
import { useAuth } from '../lib/AuthProvider';
import type { RazorpaySuccess } from '../lib/razorpay';
import type { RegistrationPayment } from '../types/database';

// The current user's most recent registration payment attempt. While it's still
// pending we poll so an approval shows up without a manual reload.
export function useRegistrationPayment() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['registrationPayment', userId],
    enabled: !!userId,
    refetchInterval: (query) => {
      const status = (query.state.data as RegistrationPayment | null)?.status;
      return status === 'submitted' || status === 'created' ? 15000 : false;
    },
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

interface CreateOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  prefill?: { name?: string; email?: string };
}

// Ask the edge function to create a Razorpay order for the registration fee.
export function useCreateRazorpayOrder() {
  return useMutation({
    mutationFn: () => callEdgeFunction<CreateOrderResult>('razorpay-create-order', {}),
  });
}

// Hand the signed Razorpay response back to the edge function for verification.
// On success the caller's profile is flipped to `approved`.
export function useVerifyRazorpayPayment() {
  const queryClient = useQueryClient();
  const { session, refreshProfile } = useAuth();

  return useMutation({
    mutationFn: (payload: RazorpaySuccess) =>
      callEdgeFunction<{ status: string }>('razorpay-verify-payment', payload),
    onSuccess: async () => {
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['registrationPayment', session?.user.id] });
    },
  });
}
