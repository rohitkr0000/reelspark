// Verifies a completed Razorpay Checkout payment. Recomputes the HMAC-SHA256
// signature over `${order_id}|${payment_id}` with the Razorpay key secret and,
// if it matches, approves the registration and credits any referral bonus.
//
// Deploy with:  supabase functions deploy razorpay-verify-payment --no-verify-jwt
// Required function secrets:  RAZORPAY_KEY_SECRET
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
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keySecret) return jsonResponse({ error: 'Razorpay keys are not configured on the server.' }, 500);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) return jsonResponse({ error: 'Not authenticated' }, 401);

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return jsonResponse({ error: 'Missing payment fields.' }, 400);
    }

    const expected = await hmacSha256Hex(keySecret, `${razorpay_order_id}|${razorpay_payment_id}`);
    if (!timingSafeEqual(expected, String(razorpay_signature))) {
      return jsonResponse({ error: 'Payment signature verification failed.' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: row } = await admin
      .from('registration_payments')
      .select('user_id, status')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle();
    if (!row || row.user_id !== user.id) {
      return jsonResponse({ error: 'Payment attempt not found.' }, 404);
    }

    const { error: rpcErr } = await admin.rpc('confirm_razorpay_payment', {
      p_order_id: razorpay_order_id,
      p_payment_id: razorpay_payment_id,
      p_signature: razorpay_signature,
    });
    if (rpcErr) return jsonResponse({ error: rpcErr.message }, 500);

    return jsonResponse({ status: 'approved' });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message ?? String(e) }, 500);
  }
});

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
