// Full-bleed, chromeless YouTube player as a self-contained HTML document,
// driven by the YouTube IFrame API. Used by the native WebView (VideoPlayer.tsx)
// and the web iframe (VideoPlayer.web.tsx).
//
//  - controls: 0 / disablekb / iv_load_policy / cc_load_policy: 0
//        -> no progress bar, no keyboard, no annotations, no captions
//  - #player is scaled up by ZOOM and clipped by #crop, so YouTube's Shorts
//    overlays that have no embed param to disable (the share button, the
//    "Shorts" wordmark, the channel/subscribe chrome, the caption box) are
//    pushed outside the visible frame
//  - #tap transparent layer -> swallows taps so YT chrome never re-appears, and
//    toggles play/pause instead
//  - posts "ended" to its host when the clip finishes
//
// `origin` MUST equal the document's real origin (native: the WebView
// `source.baseUrl`; web: window.location.origin) and must NOT be youtube.com,
// or the IFrame API fails with "Error 152".
export const YT_EMBED_ORIGIN = 'https://reelspark.app';

// Extra enlargement on top of the cover fit, so YouTube's corner overlays (the
// share button, the "Shorts" wordmark, captions) fall outside the frame.
const ZOOM = 1.16;

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
  /* Size #player as a 9:16 box scaled to *cover* the frame (never letterbox):
     one axis is exactly 100% of the frame, the other overflows. Then ZOOM a
     touch more so YouTube's corner overlays land outside #crop. */
  #player {
    position: absolute;
    top: 50%;
    left: 50%;
    width: max(100vw, calc(100vh * 9 / 16));
    height: max(100vh, calc(100vw * 16 / 9));
    transform: translate(-50%, -50%) scale(${ZOOM});
    transform-origin: center center;
  }
  #player iframe { position: absolute; inset: 0; width: 100% !important; height: 100% !important; border: 0; display: block; pointer-events: none; }
  #tap { position: absolute; inset: 0; z-index: 10; background: transparent; -webkit-tap-highlight-color: transparent; }
  #hint { position: absolute; inset: 0; z-index: 11; display: none; align-items: center; justify-content: center; pointer-events: none; }
  #hint.show { display: flex; }
  #hint div {
    width: 74px; height: 74px; border-radius: 37px;
    background: rgba(9,9,11,0.45); border: 1.5px solid rgba(255,255,255,0.35);
    display: flex; align-items: center; justify-content: center;
  }
  #hint svg { width: 26px; height: 26px; margin-left: 3px; }
</style>
</head>
<body>
<div id="crop"><div id="player"></div></div>
<div id="tap"></div>
<div id="hint"><div><svg viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg></div></div>
<script>
  var hint = document.getElementById('hint');
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
        onReady: function (e) { try { e.target.playVideo(); } catch (err) {} },
        onStateChange: function (e) {
          if (e.data === YT.PlayerState.PLAYING) { isPlaying = true; hint.classList.remove('show'); }
          else if (e.data === YT.PlayerState.PAUSED) { isPlaying = false; hint.classList.add('show'); }
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
