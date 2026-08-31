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
- **Feed:** always full-bleed — the video fills the whole feed area on every
  device. `FeedScreen` seeds item height from the window and corrects it via
  `onLayout` (list is `key`ed on that height so it remounts, keeping item height
  === snapToInterval === getItemLayout length). The YouTube embed
  (`youtubeEmbedHtml.ts`) sizes its player as a 9:16 box scaled to *cover* the
  frame (`max(100vw, calc(100vh*9/16))` CSS) so it never letterboxes; Instagram's
  iframe is scaled up to clip its fixed chrome. The paused poster is a raw `<img>`
  (RNW `<Image>` ignores `resizeMode` here) using YouTube's 9:16 `oardefault.jpg`
  (`lib/ytThumb.ts`), heavily blurred + darkened as a backdrop behind the play
  button — a poster frame can be anything (e.g. a white screen-share).
- **My Videos:** `FlatList` `numColumns` = `useResponsive().gridColumns` (1 → 4).
- **Form / content screens** (auth, Submit, Edit/Profile): the root `screen` style
  gets `maxWidth` + `alignSelf: 'center'` so content stays a readable column.

## Paid registration + referrals

DB: `supabase/migrations/0006_registration_payments_referrals.sql` (run it in the
SQL Editor). `profiles.payment_status` (`unpaid|submitted|approved|rejected`) gates
`videos` inserts via the `check_can_post` trigger; `MainStackNavigator` wraps the
tabs so `PaymentScreen` can be pushed over browse-only tabs. `SubmitScreen` shows
`<PaymentGate>` until `payment_status === 'approved'`. Flow: pay the UPI QR (drawn
by `react-qr-code` from `upi://pay?…`), submit UTR + screenshot
(`submit_registration_payment` RPC, proof in the private `payment-proofs` bucket),
admin approves in the admin app's **Payments** page (`approve_registration_payment`
RPC — also credits the referrer `app_settings.referral_bonus_inr`). No email yet —
`useRegistrationPayment` polls while `submitted`. Referral code entered at sign-up
(`options.data.referral_code`); balance shown on `ProfileScreen`. The Profile card
shares an invite link `<origin>/?ref=CODE`; `src/lib/referral.ts` lifts `?ref=` on
app start (`App.tsx`) into `sessionStorage`, `AuthNavigator` then opens on `SignUp`
with the code pre-filled.
