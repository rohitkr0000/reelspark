// Creates a Razorpay order for the caller's one-time registration fee and records
// a pending `registration_payments` row. The client opens Razorpay Checkout with
// the returned order id, then calls `razorpay-verify-payment` to finish.
//
// Deploy with browser access:
//   supabase functions deploy razorpay-create-order --no-verify-jwt
// (the JWT is still checked below via auth.getUser(); --no-verify-jwt only lets
//  the CORS preflight through.)
//
// Required function secrets:  RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
// Provided by the platform:   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing authorization header' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      return jsonResponse({ error: 'Razorpay keys are not configured on the server.' }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) return jsonResponse({ error: 'Not authenticated' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await admin
      .from('profiles')
      .select('payment_status, display_name, email')
      .eq('id', user.id)
      .single();
    if (profile?.payment_status === 'approved') {
      return jsonResponse({ error: 'Your registration is already approved.' }, 400);
    }

    const { data: settings } = await admin
      .from('app_settings')
      .select('registration_fee_inr, razorpay_key_id')
      .eq('id', true)
      .single();
    const feeInr = settings?.registration_fee_inr ?? 300;
    const publishableKeyId = settings?.razorpay_key_id || keyId;

    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa(`${keyId}:${keySecret}`),
      },
      body: JSON.stringify({
        amount: feeInr * 100, // paise
        currency: 'INR',
        receipt: `reg_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: { user_id: user.id, purpose: 'ReelSpark registration' },
      }),
    });
    const order = await orderRes.json();
    if (!orderRes.ok) {
      return jsonResponse(
        { error: order?.error?.description ?? 'Could not create the Razorpay order.' },
        502,
      );
    }

    const { error: rpcErr } = await admin.rpc('start_razorpay_payment', {
      p_user_id: user.id,
      p_amount_inr: feeInr,
      p_order_id: order.id,
    });
    if (rpcErr) return jsonResponse({ error: rpcErr.message }, 500);

    return jsonResponse({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: publishableKeyId,
      prefill: {
        name: profile?.display_name ?? '',
        email: profile?.email ?? user.email ?? '',
      },
    });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message ?? String(e) }, 500);
  }
});
