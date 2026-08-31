import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { youtubeEmbedHtml } from './youtubeEmbedHtml';

export interface VideoPlayerProps {
  platform: 'youtube' | 'instagram';
  videoId: string;
  playing: boolean;
  onEnded?: () => void;
  style?: StyleProp<ViewStyle>;
}

// The player is a DOM <iframe>. YouTube reuses the shared IFrame-API HTML via
// srcDoc (origin = this page's origin); Instagram uses its /embed/ page.
export function VideoPlayer({ platform, videoId, playing, onEnded, style }: VideoPlayerProps) {
  const isYouTube = platform === 'youtube';

  useEffect(() => {
    if (!playing || !isYouTube || !onEnded) return;
    function onMessage(e: MessageEvent) {
      if (e.data === 'ended') onEnded?.();
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [playing, isYouTube, onEnded]);

  if (!playing) return null;

  const iframeStyle = {
    width: '100%',
    height: '100%',
    border: '0',
    display: 'block',
    backgroundColor: '#000',
  } as const;

  return (
    <View style={[styles.fill, style]}>
      {isYouTube ? (
        <iframe
          title="YouTube video player"
          srcDoc={youtubeEmbedHtml(videoId, window.location.origin)}
          style={iframeStyle}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        // Instagram's /embed/ always frames the reel with a header + footer and
        // its own padding; scale it up so it fills the frame and the chrome is
        // clipped. Not pixel-perfect — IG gives embeds no chromeless mode.
        <iframe
          title="Instagram video player"
          src={`https://www.instagram.com/reel/${videoId}/embed/`}
          style={{ ...iframeStyle, transform: 'scale(1.4)', transformOrigin: 'center center' }}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', overflow: 'hidden' },
});
