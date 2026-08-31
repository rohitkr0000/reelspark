import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { AppSettings } from '../types/database';

const FALLBACK: AppSettings = {
  id: true,
  registration_fee_inr: 250,
  referral_bonus_inr: 5,
  upi_id: 'matrigyan-1@okaxis',
  upi_payee_name: 'matrigyan',
  updated_at: '',
};

// The single public.app_settings row (registration fee, referral bonus, UPI id).
export function useAppSettings() {
  const query = useQuery({
    queryKey: ['appSettings'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('*').eq('id', true).single();
      if (error) throw error;
      return data as AppSettings;
    },
  });

  return { ...query, settings: query.data ?? FALLBACK };
}
