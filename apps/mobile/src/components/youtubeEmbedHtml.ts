// Full-bleed, chromeless YouTube player as a self-contained HTML document,
// driven by the YouTube IFrame API. Used by the native WebView (VideoPlayer.tsx)
// and the web iframe (VideoPlayer.web.tsx).
//
//  - controls: 0 / disablekb / iv_load_policy / cc_load_policy: 0
//        -> no progress bar, no keyboard, no annotations, no captions
//  - #player fills the 9:16 frame itself and is clipped by #crop. YouTube's
//    embed player cover-fits the clip to that box: a genuine 9:16 Short fills
//    the frame edge-to-edge with no crop; a landscape clip centre-crops to
//    fill it. (An earlier version sized #player as a 16:9 box far wider than
//    the frame on the assumption YouTube would pillarbox a Short inside it so
//    the bars fell outside #crop — instead YouTube cover-fit the Short to that
//    over-wide box and zoomed ~3x, cropping the Short's top and bottom away.)
//  - #mask-top / #mask-bottom are scrims that hide YouTube's title bar and its
//    Shorts title/description block, which ZOOM = 1 no longer crops away
//  - #tap transparent layer -> swallows taps so YT chrome never re-appears, and
//    toggles play/pause instead
//  - posts "ended" to its host when the clip finishes
//
// `origin` MUST equal the document's real origin (native: the WebView
// `source.baseUrl`; web: window.location.origin) and must NOT be youtube.com,
// or the IFrame API fails with "Error 152".
export const YT_EMBED_ORIGIN = 'https://reelspark.app';

// Extra enlargement on top of YouTube's cover fit. 1 = no extra zoom, so a true
// 9:16 Short is shown in full. Raise above 1 to push YouTube's corner overlays
// out of view at the cost of cropping that much off a genuine Short's top and
// bottom.
const ZOOM = 1;

// With ZOOM at 1 nothing crops YouTube's own text chrome — the video title bar
// it paints along the top edge, and the Shorts-style title/description block at
// the bottom-left. These strips sit inside #crop and cover those two bands:
// opaque black for the first OPAQUE px (the height of YouTube's actual text),
// then fading to transparent over the rest so it reads as a scrim, not a hard
// bar. Set a height to 0 to disable a strip. NOTE: text burned into the video
// itself (an editor's caption) is pixels in the frame and can't be removed here
// — only YouTube's own overlay chrome is.
const MASK_TOP_HEIGHT_PX = 110;
const MASK_TOP_OPAQUE_PX = 58;
const MASK_BOTTOM_HEIGHT_PX = 140;
const MASK_BOTTOM_OPAQUE_PX = 78;

export function youtubeEmbedHtml(videoId: string, origin: string = YT_EMBED_ORIGIN) {
  const safeId = String(videoId).replace(/[^a-zA-Z0-9_-]/g, '');
  const safeOrigin = /^https?:\/\/[^"'\s]+$/.test(origin) ? origin : YT_EMBED_ORIGIN;
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: #000; overflow: hidden; }
  /* clip everything YouTube draws outside the framed video */
  #crop { position: absolute; inset: 0; overflow: hidden; }
  /* #player fills the 9:16 frame itself. YouTube's embed player cover-fits the
     clip to this box, so a genuine 9:16 Short fills it with no crop and a
     landscape clip centre-crops to fill it. ZOOM (default 1) adds no extra
     enlargement. */
  #player {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100vw;
    height: 100vh;
    transform: translate(-50%, -50%) scale(${ZOOM});
    transform-origin: center center;
  }
  #player iframe { position: absolute; inset: 0; width: 100% !important; height: 100% !important; border: 0; display: block; pointer-events: none; }
  /* Scrims over YouTube's title bar (top) and Shorts title/description (bottom):
     opaque for the text's height, then fading out. */
  .mask { position: absolute; left: 0; right: 0; z-index: 5; pointer-events: none; }
  #mask-top {
    top: 0; height: ${Math.max(0, MASK_TOP_HEIGHT_PX)}px;
    background: linear-gradient(to bottom, #000 0, #000 ${Math.max(0, MASK_TOP_OPAQUE_PX)}px, rgba(0,0,0,0) 100%);
  }
  #mask-bottom {
    bottom: 0; height: ${Math.max(0, MASK_BOTTOM_HEIGHT_PX)}px;
    background: linear-gradient(to top, #000 0, #000 ${Math.max(0, MASK_BOTTOM_OPAQUE_PX)}px, rgba(0,0,0,0) 100%);
  }
  #tap { position: absolute; inset: 0; z-index: 10; background: transparent; -webkit-tap-highlight-color: transparent; }
</style>
</head>
<body>
<div id="crop">
  <div id="player"></div>
  <div id="mask-top" class="mask"></div>
  <div id="mask-bottom" class="mask"></div>
</div>
<div id="tap"></div>
<script>
  var tap = document.getElementById('tap');
  var player;
  var isPlaying = false;

  function post(msg) {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(msg);
    } else if (window.parent) {
      window.parent.postMessage(msg, '*');
    }
  }

  tap.addEventListener('click', function () {
    if (!player) return;
    if (isPlaying) player.pauseVideo();
    else player.playVideo();
  });

  // Force subtitles/CC off. cc_load_policy alone is not enough — if the viewer's
  // YouTube account has captions switched on globally, or the video carries a
  // forced track, they still burn in. Unloading the caption modules (once they
  // exist, which is only after the API/playback starts) removes them and the CC
  // toggle for good.
  function killCaptions(p) {
    if (!p) return;
    try { p.unloadModule('captions'); } catch (err) {}
    try { p.unloadModule('cc'); } catch (err) {}
    try { p.setOption('captions', 'track', {}); } catch (err) {}
  }

  var tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.body.appendChild(tag);

  function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
      width: '100%',
      height: '100%',
      videoId: '${safeId}',
      playerVars: {
        autoplay: 1, playsinline: 1, controls: 0, rel: 0, modestbranding: 1,
        fs: 0, disablekb: 1, iv_load_policy: 3, cc_load_policy: 0, origin: '${safeOrigin}'
      },
      events: {
        onReady: function (e) {
          killCaptions(e.target);
          try { e.target.playVideo(); } catch (err) {}
        },
        onApiChange: function (e) { killCaptions(e.target); },
        onStateChange: function (e) {
          if (e.data === YT.PlayerState.PLAYING) { isPlaying = true; killCaptions(player); }
          else if (e.data === YT.PlayerState.PAUSED) { isPlaying = false; }
          else if (e.data === YT.PlayerState.ENDED) { isPlaying = false; post('ended'); }
        },
        onError: function (e) { post('error:' + e.data); }
      }
    });
  }
</script>
</body>
</html>`;
}
