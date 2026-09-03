# Mobile app — Vite + react-native-web

This app was migrated off Expo. It now runs in the browser only:

- **Bundler/dev server:** Vite (`npm run dev`, port 5174). No Metro, no Expo CLI.
- **Runtime:** `react-native` is aliased to `react-native-web` in `vite.config.ts`.
- **Removed Expo modules** are replaced by small local shims in `src/shims/`:
  - `expo-linear-gradient` → CSS `linear-gradient` on a View
  - `expo-image-picker` → hidden `<input type="file">`
  - `@expo/vector-icons` (`Feather`, `Ionicons`) → inline SVG, only the glyphs in use
- **Fonts:** `src/fonts.css` defines `@font-face`s (named to match `src/theme/tokens.ts`) from the `@fontsource/*` packages.
- **Env:** Vite vars — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (see `.env.example`).
- **Entry:** `index.html` → `src/main.tsx` → `App.tsx`.

There are no native (iOS/Android) targets anymore. Platform-specific files can
still use the `.web.tsx` suffix, but everything here is the web build.

## Responsive layout

`src/theme/responsive.ts` exports `useResponsive()` (built on `useWindowDimensions`,
so it re-renders on resize). Breakpoints: phone `<768`, `sidebar` (left nav) `≥1000`,
desktop `≥1024`, wide `≥1440`.

- **Nav:** `MainTabNavigator` uses a bottom tab bar below 1000px and a left nav
  rail (`material`, `tabBarPosition: 'left'`) at `≥1000` (`sidebarNav`).
- **Feed:** full-bleed on phone/tablet (`<1000px`); on desktop (`feedDesktop`,
  `≥1000px`) it's a centered 9:16 phone-frame card (`width` capped at 460, height
  locked to `width*16/9`) on the dark canvas with an up/down chevron column
  beside it — the reel is never cropped on wide monitors. `FeedScreen` seeds item
  height from the window and corrects it via `onLayout` (list is `key`ed on the
  card height so it remounts, keeping item height === snapToInterval ===
  getItemLayout length). Because the playing `<iframe>` swallows wheel + key
  events, desktop advances the feed by index (`listRef.scrollToIndex`): a stage
  `wheel` listener (one reel per gesture, `preventDefault`s native scroll),
  `keydown` on `window` while the screen `useIsFocused()` (↑/↓, PageUp/PageDown,
  Space, j/k), and the chevron buttons — all via `goBy(±1)`. The YouTube embed
  (`youtubeEmbedHtml.ts`) sizes its player as a **16:9** box scaled to *cover*
  the frame (`max(100vw, calc(100vh*16/9))` CSS) so landscape clips fill it with
  a centre-crop and true Shorts still fill it (their pillarbox bars fall outside
  `#crop`) — it never letterboxes. There is **no app play button**: for YouTube,
  a full-bleed `Pressable` over the paused poster starts the reel (tap again while
  playing pauses it, via the embed's `#tap` layer); the paused poster is a raw
  `<img>` (RNW `<Image>` ignores `resizeMode` here) using YouTube's 9:16
  `oardefault.jpg` (`lib/ytThumb.ts`), heavily blurred + darkened as a backdrop.
  The creator/caption row, the action rail (flag/share/views) and the bottom
  scrim **stay visible while the reel plays** (`box-none` so only the buttons
  take taps); the full dim, top scrim and "For You" tag show only while stopped.
- **Instagram:** `VideoPlayer` loads `/reel/<id>/embed/` **directly** as an
  `<iframe src>` inside a clipping `<div>` (nesting it in a srcDoc frame gave the
  inner frame an opaque origin and stopped IG playing on tap; a CSS
  `transform: scale()` broke touch taps on mobile the same way). It hides IG's
  chrome with **plain layout**: iframe at the clip's width (so IG renders the reel
  edge-to-edge, no left/right crop), pulled up `INSTAGRAM_HEADER_PX` and made
  `INSTAGRAM_EXTRA_HEIGHT_PX` taller than the clip so IG's header/footer sit
  outside it (constants in `instagramEmbedHtml.ts`).
  IG can't autoplay and its centre play button lives on instagram.com's origin,
  so it can't be scripted or hidden — instead `FeedItem` mounts the IG iframe as
  soon as the item is active (no app poster / play button on top), so a single
  tap lands on IG's own control and its button clears itself once the reel plays.
  The view is counted when an IG item scrolls in (the tap can't be observed
  inside the iframe); IG items have no "ended" event so they don't auto-advance.
- **My Videos:** `FlatList` `numColumns` = `useResponsive().gridColumns` (1 → 4).
- **Form / content screens** (auth, Submit, Edit/Profile): the root `screen` style
  gets `maxWidth` + `alignSelf: 'center'` so content stays a readable column.

## Paid registration + referrals

DB: `supabase/migrations/0006_registration_payments_referrals.sql` +
`0007_razorpay_payments.sql` (run both in the SQL Editor). `profiles.payment_status`
(`unpaid|submitted|approved|rejected`) gates `videos` inserts via the
`check_can_post` trigger; `MainStackNavigator` wraps the tabs so `PaymentScreen`
can be pushed over browse-only tabs. `SubmitScreen` shows `<PaymentGate>` until
`payment_status === 'approved'`.

Payment is **Razorpay Checkout**. `checkout.js` is loaded in `index.html`;
`src/lib/razorpay.ts` wraps `window.Razorpay` in a promise. Flow: `PaymentScreen`
→ `razorpay-create-order` edge function (creates the Razorpay order + a `created`
`registration_payments` row via `start_razorpay_payment`) → widget → on success
`razorpay-verify-payment` edge function recomputes the HMAC-SHA256 signature and,
if valid, calls `confirm_razorpay_payment` (service role) which flips the row +
profile to `approved` and credits the referrer `app_settings.referral_bonus_inr`.
Edge function secrets: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
(`supabase/functions/.env.example`); the publishable key id is also mirrored in
`app_settings.razorpay_key_id`, editable from the admin **Settings** page. Admin
**Payments** is now inspect-only (manual approve/reject stays for disputes).
`useRegistrationPayment` polls while `created`/`submitted`. Referral code entered at sign-up
(`options.data.referral_code`); balance shown on `ProfileScreen`. The Profile card
shares an invite link `<origin>/?ref=CODE`; `src/lib/referral.ts` lifts `?ref=` on
app start (`App.tsx`) into `sessionStorage`, `AuthNavigator` then opens on `SignUp`
with the code pre-filled.

## Referral wallet + withdrawals

DB: `supabase/migrations/0008_referral_withdrawals.sql`. `app_settings` gains
`min_referral_withdrawal_inr` (default ₹150, editable from admin **Settings**).
`ReferralWalletScreen` (ProfileStack, linked from the Profile referral card)
shows the balance, a withdraw form (amount + UPI ID), and a merged transaction
list of `referral_earnings` (credits) and `referral_withdrawals` (debits) —
`useReferralWallet` hook. Withdrawing calls the `request_referral_withdrawal`
RPC, which is **auto-approved**: it locks the profile row, checks the amount is
≥ the minimum and ≤ the balance, debits `referral_balance_inr`, and writes a
`paid` `referral_withdrawals` row in one transaction. Admins see every
withdrawal (global + per user, with per-user earned/paid/balance rollups) on the
admin **Referrals** page and can `set_referral_withdrawal_status` to
`failed`/`reversed` (refunds the balance) or back to `paid` (re-debits).
