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
// transformed cross-origin iframe, which stops the reel from starting): the
// iframe is the clip's width so IG renders the reel edge-to-edge, pulled up by
// HEADER_PX so IG's header clears the top, and made EXTRA_HEIGHT_PX taller than
// the clip so IG's footer sits below the visible area. There's no left/right
// crop this way. A pixel-perfect result is only possible by playing the raw .mp4.
//
// Caveats that are Instagram's, not ours: the reel needs one tap to start (IG
// embeds don't autoplay) and there's no "ended" event, so IG items don't
// auto-advance the way YouTube ones do.

// How far (CSS px) to pull the iframe up so IG's header clears the top edge.
// Raise if a strip of the header shows; lower if the reel's top is cut.
export const INSTAGRAM_HEADER_PX = 52;
// Extra iframe height beyond the clip (CSS px) so IG's footer + "more on
// Instagram" bar land below the visible area. Raise if the footer peeks in.
export const INSTAGRAM_EXTRA_HEIGHT_PX = 260;

export function instagramReelEmbedSrc(reelId: string): string {
  const safeId = String(reelId).replace(/[^a-zA-Z0-9_-]/g, '');
  return `https://www.instagram.com/reel/${safeId}/embed/`;
}
