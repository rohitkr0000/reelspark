// Instagram Reel player helpers.
//
// Instagram's only public embed is `/reel/<id>/embed/`, a fixed webpage with an
// account header, a like/comment/"more on Instagram" footer, and padding around
// the video — none of which can be turned off, and none of which we can reach
// into (it's a cross-origin iframe). Instagram's own centre play button lives
// inside that iframe on instagram.com's origin, so no CSS or script of ours can
// remove it; it disappears on its own once the reel starts.
//
// We load that page **directly** as an `<iframe src>` parented by this page (NOT
// wrapped in a srcDoc — nesting it inside an `about:srcdoc` frame gives the inner
// frame an opaque origin and IG's embed then refuses to start playback on tap).
//
// A wrapping element clips it. We size + offset the iframe with plain layout
// (NOT a CSS `transform: scale()` — mobile browsers mis-route touch taps on a
// transformed cross-origin iframe, which stops the reel from starting):
//
//  - The iframe is rendered INSTAGRAM_SCALE times wider than the clip. IG lays
//    its whole page out to that width, so the reel's media area grows with it —
//    at scale 1.0 the media is far shorter than our 9:16 frame and IG's footer
//    shows underneath it; enlarging the media until it fills the frame's height
//    pushes IG's header off the top and its footer off the bottom. The extra
//    width spills past the clip evenly on both sides (`left` offset) and is
//    cropped — a reel is centre-weighted, so this only trims the edges.
//  - The iframe is pulled up by the (now scaled) header height so IG's header
//    clears the top, and made taller than it needs to be so IG lays the footer
//    out normally before the clip hides it.
//
// A pixel-perfect, crop-free result is only possible by playing the raw .mp4.
//
// Caveats that are Instagram's, not ours: the reel needs one tap to start (IG
// embeds don't autoplay) and there's no "ended" event, so IG items don't
// auto-advance the way YouTube ones do.

// How much wider than the clip to render IG's page. 1.0 = no enlargement (IG's
// footer then sits visible below the reel); ~1.9 makes the reel fill a 9:16
// frame's height so IG's header/footer fall outside it. Lower it if faces get
// cropped at the sides; raise it if a strip of IG's footer still shows.
export const INSTAGRAM_SCALE = 1.9;

// Header height (CSS px) BEFORE scaling — multiplied by INSTAGRAM_SCALE at use.
// Raise if a strip of IG's header shows; lower if the reel's top is cut.
export const INSTAGRAM_HEADER_PX = 52;

// Slack (CSS px) added to the iframe height so IG lays its footer out normally
// before the clip hides it. Only needs to comfortably exceed IG's footer height.
export const INSTAGRAM_EXTRA_HEIGHT_PX = 400;

export function instagramReelEmbedSrc(reelId: string): string {
  const safeId = String(reelId).replace(/[^a-zA-Z0-9_-]/g, '');
  return `https://www.instagram.com/reel/${safeId}/embed/`;
}
