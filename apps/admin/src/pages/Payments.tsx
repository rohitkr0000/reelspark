import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Badge, DetailEmpty, Field, ListRow, ListState, WorkPage } from '../components/ui';
import type { RegistrationPayment } from '../types/database';

export function Payments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('id'));

  // Inspect-only: a row appears here the moment Razorpay's signature is verified
  // and `confirm_razorpay_payment` flips it to `approved`. Started-but-unpaid,
  // failed and rejected attempts never surface — there's nothing to act on.
  const { data: payments, isLoading } = useQuery({
    queryKey: ['adminPayments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registration_payments')
        .select('*, user:profiles!registration_payments_user_id_fkey (id, display_name, email, referred_by)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as RegistrationPayment[];
    },
  });

  const selected = payments?.find((p) => p.id === selectedId) ?? null;

  function select(id: string | null) {
    setSelectedId(id);
    setSearchParams(id ? { id } : {}, { replace: true });
  }

  const list = (
    <>
      {isLoading ? (
        <ListState>Loading…</ListState>
      ) : !payments || payments.length === 0 ? (
        <ListState>No payments received yet.</ListState>
      ) : (
        payments.map((p) => (
          <ListRow
            key={p.id}
            selected={p.id === selectedId}
            onClick={() => select(p.id)}
            title={<span className="font-mono">₹{p.amount_inr}</span>}
            subtitle={p.user?.display_name ?? p.user?.email ?? p.user_id}
            right={<Badge value={p.status} />}
          />
        ))
      )}
    </>
  );

  const detail = !selected ? (
    <DetailEmpty label="Select a payment to inspect." />
  ) : (
    <div className="p-4 sm:p-6 max-w-2xl">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display font-semibold text-base">
            {selected.user?.display_name ?? selected.user?.email ?? selected.user_id}
          </h2>
          <p className="text-text-muted text-xs mt-0.5 truncate">{selected.user?.email}</p>
        </div>
        <Badge value={selected.status} />
      </div>

      <div className="mt-5">
        <Field label="Amount" mono>
          ₹{selected.amount_inr}
        </Field>
        <Field label="Razorpay payment ID" mono>
          {selected.razorpay_payment_id ?? '—'}
        </Field>
        <Field label="Razorpay order ID" mono>
          {selected.razorpay_order_id ?? '—'}
        </Field>
        <Field label="Started" mono>
          {new Date(selected.created_at).toLocaleString()}
        </Field>
        {selected.reviewed_at && (
          <Field label="Confirmed" mono>
            {new Date(selected.reviewed_at).toLocaleString()}
          </Field>
        )}
        <Field label="Referred">
          {selected.user?.referred_by ? 'Yes — referrer earned the bonus.' : 'No.'}
        </Field>
        {selected.admin_note && <Field label="Note">{selected.admin_note}</Field>}
      </div>
    </div>
  );

  return (
    <WorkPage
      title="Payments"
      description="Registration payments received through Razorpay. Each appears automatically once its payment is verified."
      list={list}
      detail={detail}
      selected={!!selected}
      onBack={() => select(null)}
    />
  );
}
