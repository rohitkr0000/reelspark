import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Calls a Supabase Edge Function with a plain fetch (not supabase.functions.invoke)
// so that HTTP errors surface their status + body instead of a generic
// "Failed to send a request to the Edge Function".
export async function callEdgeFunction<T>(name: string, body: unknown): Promise<T> {
  if (!SUPABASE_URL) {
    throw new Error('VITE_SUPABASE_URL is not set — check apps/mobile/.env and restart the dev server.');
  }

  const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/${name}`;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('You need to be signed in to pay.');

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: ANON_KEY ?? '',
      },
      body: JSON.stringify(body ?? {}),
    });
  } catch (e) {
    throw new Error(
      `Cannot reach ${url}. Deploy it with "supabase functions deploy ${name} --no-verify-jwt", ` +
        `check VITE_SUPABASE_URL, and disable ad blockers for this site. (${(e as Error).message})`,
    );
  }

  const raw = await res.text();
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = { raw };
  }
  const payload = parsed as { error?: string; message?: string; code?: string; raw?: string } | null;

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Edge function "${name}" is not deployed (HTTP 404). Run: supabase functions deploy ${name} --no-verify-jwt`);
    }
    throw new Error(
      payload?.error ??
        payload?.message ??
        `Edge function "${name}" failed (HTTP ${res.status}). ${payload?.raw ?? ''}`.trim(),
    );
  }

  return payload as T;
}
