// Razorpay Checkout is loaded via a <script> tag in index.html, which puts a
// `Razorpay` constructor on window. This module wraps it in a typed promise.

import { REELSPARK_ICON_DATA_URI } from './reelsparkIcon';

export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string; backdrop_color?: string };
  handler: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (e: unknown) => void) => void;
}

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

export interface CheckoutParams {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  prefill?: { name?: string; email?: string };
}

// Opens the Razorpay widget. Resolves with the signed success payload, or rejects
// if the user closes the widget or checkout fails to load.
export function openRazorpayCheckout(params: CheckoutParams): Promise<RazorpaySuccess> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.Razorpay) {
      reject(new Error('Razorpay checkout failed to load. Check your connection and try again.'));
      return;
    }

    let settled = false;

    const rzp = new window.Razorpay({
      key: params.keyId,
      order_id: params.orderId,
      amount: params.amount,
      currency: params.currency,
      name: 'ReelSpark',
      description: 'One-time registration fee',
      // Embedded PNG data URI — Razorpay Checkout ignores SVG, and a hosted
      // http:// logo would be blocked as mixed content inside their https iframe.
      // Razorpay frames this on a white plate, so it's a square icon-only mark
      // (dark tile + gradient play glyph) that fills the plate as an app icon
      // rather than the wide wordmark, which letterboxed.
      image: REELSPARK_ICON_DATA_URI,
      prefill: params.prefill,
      // "Midnight" checkout: near-black header + backdrop so Razorpay's summary
      // band matches the ReelSpark logo tile instead of tinting it purple.
      theme: { color: '#0A0A0D', backdrop_color: '#09090B' },
      handler: (response) => {
        settled = true;
        resolve(response);
      },
      modal: {
        ondismiss: () => {
          if (!settled) reject(new Error('Payment cancelled.'));
        },
      },
    });

    rzp.on('payment.failed', (e: unknown) => {
      if (settled) return;
      settled = true;
      const description =
        (e as { error?: { description?: string } })?.error?.description ?? 'Payment failed.';
      reject(new Error(description));
    });

    rzp.open();
  });
}
