import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Badge, Btn, DetailEmpty, Field, ListRow, ListState, WorkPage } from '../components/ui';
import type { RegistrationPayment, RegistrationPaymentStatus } from '../types/database';

const FILTERS: { label: string; value: RegistrationPaymentStatus | 'all' }[] = [
  { label: 'Submitted', value: 'submitted' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'All', value: 'all' },
];

async function openScreenshot(path: string | null) {
  if (!path) return;
  const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(path, 120);
  if (error || !data) return window.alert('Could not open the screenshot.');
  window.open(data.signedUrl, '_blank', 'noreferrer');
}

export function Payments() {
  const [filter, setFilter] = useState<RegistrationPaymentStatus | 'all'>('submitted');
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('id'));
  const queryClient = useQueryClient();

  const { data: payments, isLoading } = useQuery({
    queryKey: ['adminPayments', filter],
    queryFn: async () => {
      let query = supabase
        .from('registration_payments')
        .select('*, user:profiles!registration_payments_user_id_fkey (id, display_name, email, referred_by)')
        .order('created_at', { ascending: false });
      if (filter !== 'all') query = query.eq('status', filter);
      const { data, error } = await query;
      if (error) throw error;
      return data as RegistrationPayment[];
    },
  });

  useEffect(() => {
    const id = searchParams.get('id');
    if (id && payments && !payments.some((p) => p.id === id)) setFilter('all');
  }, [searchParams, payments]);

  const selected = payments?.find((p) => p.id === selectedId) ?? null;

  function select(id: string | null) {
    setSelectedId(id);
    setSearchParams(id ? { id } : {}, { replace: true });
  }

  const review = useMutation({
    mutationFn: async ({ id, action, note }: { id: string; action: 'approve' | 'reject'; note?: string }) => {
      const fn = action === 'approve' ? 'approve_registration_payment' : 'reject_registration_payment';
      const { error } = await supabase.rpc(fn, { p_payment_id: id, p_note: note ?? null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPayments'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['vitals'] });
      queryClient.invalidateQueries({ queryKey: ['attentionQueue'] });
    },
  });

  const list = (
    <>
      <div className="sticky top-0 bg-bg border-b border-border px-3 py-2 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
              filter === f.value ? 'bg-surface text-text' : 'text-text-muted hover:text-text'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {isLoading ? (
        <ListState>Loading…</ListState>
      ) : !payments || payments.length === 0 ? (
        <ListState>Nothing here.</ListState>
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
    <DetailEmpty label="Select a payment to verify." />
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
        <Field label="UPI reference / UTR" mono>
          {selected.upi_reference ?? '— none given —'}
        </Field>
        <Field label="Submitted" mono>
          {new Date(selected.created_at).toLocaleString()}
        </Field>
        <Field label="Referred">
          {selected.user?.referred_by ? 'Yes — referrer earns the bonus on approval.' : 'No.'}
        </Field>
        {selected.admin_note && <Field label="Note">{selected.admin_note}</Field>}
      </div>

      {review.isError && <p className="text-coral text-sm mt-4">{(review.error as Error)?.message}</p>}

      <div className="flex flex-wrap gap-2 mt-5">
        <Btn onClick={() => openScreenshot(selected.screenshot_path)} disabled={!selected.screenshot_path}>
          {selected.screenshot_path ? 'View screenshot ↗' : 'No screenshot'}
        </Btn>
        {selected.status !== 'approved' && (
          <Btn variant="approve" onClick={() => review.mutate({ id: selected.id, action: 'approve' })}>
            Approve
          </Btn>
        )}
        {selected.status !== 'rejected' && (
          <Btn
            variant="reject"
            onClick={() => {
              const note = window.prompt('Reason (shown to the user):');
              if (note !== null) review.mutate({ id: selected.id, action: 'reject', note });
            }}
          >
            Reject
          </Btn>
        )}
      </div>
    </div>
  );

  return (
    <WorkPage
      title="Payments"
      description="Verify ₹ registration transfers, then approve or reject."
      list={list}
      detail={detail}
      selected={!!selected}
      onBack={() => select(null)}
    />
  );
}
